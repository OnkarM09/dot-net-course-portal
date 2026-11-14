import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as pdfjs from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';

const NOTES_ROOT = 'D:/Dot net core/Asp.Net_Core_-Udemy-/Notes-20250125T050818Z-001';
const CSHARP_PORTAL_ROOT = 'D:/AI/csharp-course-portal';

function computeSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cleanMetadata(info) {
  const cleaned = {};
  for (const [key, val] of Object.entries(info || {})) {
    if (key.toLowerCase() === 'author') {
      continue; // strictly omit/redact author
    }
    cleaned[key] = val;
  }
  return cleaned;
}

function parseSectionNumber(filename) {
  const match = filename.match(/Section\s*(\d+)/i);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function extractTitle(filename, firstPageText, isCheatsheet) {
  // Typical text:
  // "Asp.Net Core – True Ultimate Guide Section 1 – Introduction – Cheat Sheet"
  // "ASP.NET Core - True Ultimate Guide Section 2 : Getting Started - Notes"
  // "ASP.NET Core - True Ultimate Guide Section 1 9 : Unit Testing [Advanced, Moq & Repository Pattern] - Notes"
  
  // Try regex from text
  const textMatch = firstPageText.match(/Section\s*\d+\s*(?:[:–\-])\s*([^-–\n\r]+?)(?:\s*[-–]\s*(?:Notes|Cheat\s*Sheet)|\s*\[|\s*$)/i);
  if (textMatch && textMatch[1] && textMatch[1].trim().length > 2) {
    return textMatch[1].trim();
  }

  // Fallback to filename
  const fnMatch = filename.match(/Section\s*\d+\s*-\s*([^.]+?)(?:\.pdf|$)/i);
  if (fnMatch && fnMatch[1]) {
    const raw = fnMatch[1].trim();
    if (raw.toLowerCase() !== 'asp.net core') {
      return raw;
    }
  }

  if (isCheatsheet && filename.includes('Section 1 - Asp.Net Core')) {
    return 'Introduction';
  }

  return 'Section';
}

async function runInventory() {
  console.log('--- Phase A: Preflight, Inventory & Source Mapping ---');

  if (!fs.existsSync(NOTES_ROOT)) {
    throw new Error(`Notes directory does not exist: ${NOTES_ROOT}`);
  }

  // Check C# portal assets
  const requiredCsharpAssets = [
    'assets/css/docs.css',
    'assets/js/main.js',
    'assets/js/search-engine.js',
    'assets/images/favicon.svg'
  ];

  for (const relPath of requiredCsharpAssets) {
    const full = path.join(CSHARP_PORTAL_ROOT, relPath);
    if (!fs.existsSync(full)) {
      throw new Error(`Required reference asset missing: ${full}`);
    }
  }
  console.log('✓ All 4 required C# portal assets verified.');

  const notesDir = path.join(NOTES_ROOT, 'Notes');
  const cheatsheetDir = path.join(NOTES_ROOT, 'Cheat Sheets');

  const notesFiles = fs.readdirSync(notesDir).filter(f => f.toLowerCase().endsWith('.pdf')).map(f => path.join(notesDir, f));
  const cheatFiles = fs.readdirSync(cheatsheetDir).filter(f => f.toLowerCase().endsWith('.pdf')).map(f => path.join(cheatsheetDir, f));

  const allPdfPaths = [...notesFiles, ...cheatFiles];
  console.log(`Found ${allPdfPaths.length} total PDF files (${notesFiles.length} notes, ${cheatFiles.length} cheatsheets).`);

  const inventory = [];

  for (const fullPath of allPdfPaths) {
    const filename = path.basename(fullPath);
    const isCheatsheet = fullPath.includes('Cheat Sheets');
    const secNum = parseSectionNumber(filename);
    const sha256 = computeSha256(fullPath);

    const data = new Uint8Array(fs.readFileSync(fullPath));
    const doc = await pdfjs.getDocument({ data }).promise;
    const pageCount = doc.numPages;
    const meta = await doc.getMetadata().catch(() => ({ info: {} }));
    const cleanedMeta = cleanMetadata(meta.info);

    const p1 = await doc.getPage(1);
    const tc = await p1.getTextContent();
    const p1Text = tc.items.map(it => it.str).join(' ');

    const title = extractTitle(filename, p1Text, isCheatsheet);

    inventory.push({
      absolute_path: fullPath.replace(/\\/g, '/'),
      filename,
      section_number: secNum,
      normalized_section: secNum ? String(secNum).padStart(2, '0') : null,
      page_count: pageCount,
      metadata: cleanedMeta,
      sha256,
      proposed_title: title,
      is_cheatsheet: isCheatsheet
    });
  }

  // Sort inventory
  inventory.sort((a, b) => {
    if (a.section_number !== b.section_number) {
      return (a.section_number || 0) - (b.section_number || 0);
    }
    return (a.is_cheatsheet ? 1 : 0) - (b.is_cheatsheet ? 1 : 0);
  });

  // Verify exactly 30 unique numbered section mappings
  const sourceMap = {};
  for (let i = 1; i <= 30; i++) {
    const secStr = String(i).padStart(2, '0');
    // For section 1, note file is the cheatsheet if no note pdf exists
    let notePdf = inventory.find(item => item.section_number === i && !item.is_cheatsheet);
    const cheatPdf = inventory.find(item => item.section_number === i && item.is_cheatsheet);

    if (i === 1 && !notePdf) {
      // Section 1 source is cheatsheet
      notePdf = cheatPdf;
    }

    if (!notePdf) {
      throw new Error(`Preflight failed: Missing primary note PDF for section ${secStr}`);
    }

    sourceMap[secStr] = {
      section_number: i,
      normalized_section: secStr,
      primary_source: {
        filename: notePdf.filename,
        absolute_path: notePdf.absolute_path,
        page_count: notePdf.page_count,
        proposed_title: notePdf.proposed_title,
        sha256: notePdf.sha256
      },
      cheatsheet: cheatPdf ? {
        filename: cheatPdf.filename,
        absolute_path: cheatPdf.absolute_path,
        page_count: cheatPdf.page_count,
        proposed_title: cheatPdf.proposed_title,
        sha256: cheatPdf.sha256
      } : null
    };
  }

  const mappedKeys = Object.keys(sourceMap);
  if (mappedKeys.length !== 30) {
    throw new Error(`Preflight failed: Expected exactly 30 sections, found ${mappedKeys.length}`);
  }

  // Write outputs to data/
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/pdf-inventory.json', JSON.stringify(inventory, null, 2), 'utf8');
  fs.writeFileSync('data/source-map.json', JSON.stringify(sourceMap, null, 2), 'utf8');

  console.log(`✓ Generated data/pdf-inventory.json (${inventory.length} entries).`);
  console.log(`✓ Generated data/source-map.json (30 sections mapped 01 to 30).`);
  console.log('✓ Preflight and inventory gate PASSED.');
}

runInventory().catch(err => {
  console.error('Fatal Preflight Error:', err);
  process.exit(1);
});
