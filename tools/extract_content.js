import fs from 'fs';
import path from 'path';
import * as pdfjs from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';

const INVENTORY_FILE = 'data/pdf-inventory.json';
const SOURCE_MAP_FILE = 'data/source-map.json';
const OUT_DIR = 'data/extracted';

// Load secrets for exclusion checking
let disallowedNames = ['Harsha', 'Vardhan', 'Harsha Vardhan'];
if (fs.existsSync('config/audit-secrets.json')) {
  try {
    const secrets = JSON.parse(fs.readFileSync('config/audit-secrets.json', 'utf8'));
    if (secrets.disallowed_names) disallowedNames = secrets.disallowed_names;
  } catch (e) {}
}

function redactForbidden(text) {
  if (!text) return '';
  let result = text;
  for (const name of disallowedNames) {
    const reg = new RegExp(`\\b${name}\\b`, 'gi');
    result = result.replace(reg, '');
  }
  return result.replace(/WEB ACADEMY BY\s*/gi, '');
}

function normalizeLigatures(str) {
  return str
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function isCodeLine(line, inCodeBlock, prevLine) {
  const trimmed = line.trim();
  if (!trimmed) return inCodeBlock;

  // Bullets and numbered list markers are never code
  if (/^[•▪➢✓●○\*\-]\s+/.test(trimmed) || /^o\s+/.test(trimmed) || /^\d+[\.\)]\s+/.test(trimmed)) {
    return false;
  }

  // Explanatory prose after code keywords is never code
  if (/:\s*(This\s+|The\s+|Here\s+|It\s+|You\s+|An\s+|A\s+|We\s+|In\s+this)/i.test(trimmed)) {
    return false;
  }

  if (trimmed === 'Code' || trimmed === 'C# Code:' || trimmed === 'Example:' || trimmed === 'Basic Example:') return false;
  if (/^(In this code|Explanation|How It Works|Detailed Explanation|Key Points to Remember|Note|Warning|Tip):/i.test(trimmed)) {
    return false;
  }

  // Definite code signatures
  const codePatterns = [
    /^(using|namespace)\s+[A-Za-z0-9_.]+(\s*;|\s*\{)?$/,
    /^(public|private|protected|internal|static|async|void|class|interface|record|struct|enum|abstract|override|virtual|readonly|const|sealed)\s+/,
    /^\[(Route|HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch|FromBody|FromQuery|FromRoute|FromHeader|FromServices|ValidateAntiForgeryToken|Authorize|AllowAnonymous|ApiController|Controller|Required|StringLength|RegularExpression|Compare|Range|Bind|ActionName|NonAction)[\(\]]/,
    /^(var|string|int|bool|double|decimal|float|char|byte|long|short|DateTime|Guid|object|IResult|IActionResult|Task|Task<[A-Za-z0-9_?,\s]+>|List<[A-Za-z0-9_?,\s]+>|IEnumerable<[A-Za-z0-9_?,\s]+>|Dictionary<[A-Za-z0-9_?,\s]+>|ClaimsIdentity)\s+[A-Za-z0-9_]+\s*=/,
    /^(builder|app|services|options|context|endpoints|group)\.[A-Za-z0-9_]+/,
    /^(Console\.WriteLine|throw\s+new|return\s+|await\s+)/,
    /^(if|else\s+if|while|for|foreach|switch)\s*\(.*?\)/,
    /^(else|try|catch|finally)\b/,
    /^(case\s+[^:]+:|default:)/,
    /^<\/?(div|span|p|h[1-6]|ul|ol|li|table|tr|th|td|form|input|button|a|img|label|select|option)\b/,
    /^@(\{|model|inject|addTagHelper|section|if|foreach|for|switch|using|Html\.|Url\.)/,
    /^(\{|\}|\{|\}\s*;|=>|;\s*|\}\);|\},|\}\s*)$/,
    /^\/\//, // single line comment
    /^\/\*|\*\/|^\s*\*/,
    /\b(AddControllers|UseRouting|MapControllers|Run|AddScoped|AddTransient|AddSingleton|AddDbContext|MapGet|MapPost|MapPut|MapDelete|MapGroup|UseEndpoints)\(/,
    /^\s*"[A-Za-z0-9_]+":\s*/, // JSON property
    /^\s*(new\s+[A-Za-z0-9_<>]+)/,
    /^\s*\.[A-Za-z0-9_]+\(/, // Chained method call
    /EndpointFilterInvocationDelegate\s+next\)/, // Method signature continuation
    /^\s*(dotnet|npm|curl|git)\s+[a-z]/, // CLI commands
    // Additional accurate code patterns:
    /^[A-Za-z0-9_.]+\.Should\(\)/, // FluentAssertions
    /^(public|private|protected|internal)?\s*[A-Za-z0-9_<>\[\]\?]+\s+[A-Za-z0-9_]+\s*\{\s*get;\s*(?:set;|init;)?\s*\}/, // auto-properties
    /^\s*using\s*\(/, // using statement
    /^\s*(typeof|nameof)\s*\(/, // typeof expression
    /^\s*(constructor|ngOnInit|ngOnDestroy)\s*\(/, // TypeScript / Angular
    /^\s*[A-Za-z0-9_]+:\s*(creds|key|options|next)/, // named arguments
    /^\s*[A-Za-z0-9_.]+\s*=\s*(new\s+|"[^"]*"|\d+|true|false)/ // property assignment
  ];

  for (const pat of codePatterns) {
    if (pat.test(trimmed)) return true;
  }

  // If previous line was code and ended in a continuation character
  if (inCodeBlock && prevLine) {
    const prevTrimmed = prevLine.trim();
    if (prevTrimmed.endsWith(',') || prevTrimmed.endsWith('(') || prevTrimmed.endsWith('[') || prevTrimmed.endsWith('=>') || prevTrimmed.endsWith('.') || prevTrimmed.endsWith('&&') || prevTrimmed.endsWith('||') || prevTrimmed.endsWith('+')) {
      return true;
    }
  }

  // If we are already inside a code block, braces, method calls, assignments, semicolons sustain it
  if (inCodeBlock) {
    if (trimmed.endsWith(';') || trimmed.endsWith('{') || trimmed.endsWith('}') || trimmed.endsWith('(') || trimmed.startsWith('}') || trimmed.endsWith('=>') || trimmed.endsWith(',') || trimmed.endsWith(':')) {
      return true;
    }
    if (/^[A-Za-z0-9_.]+\s*=/.test(trimmed)) return true;
    if (/^[A-Za-z0-9_.]+\(.*\);?$/.test(trimmed)) return true;
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return true;
    if (/^\s*[A-Za-z0-9_.]+\s*\([^\)]*$/.test(trimmed)) return true;
    if (/^\s*\}\s*,?$/.test(trimmed)) return true;
  }

  return false;
}

function detectBlocks(linesWithMeta, pageNum) {
  const blocks = [];
  let currentBlock = null;
  let codeBraceDepth = 0;

  function flushBlock() {
    if (currentBlock && currentBlock.lines.length > 0) {
      if (currentBlock.type === 'prose') {
        currentBlock.text = currentBlock.lines.join(' ').replace(/\s+/g, ' ').trim();
      } else {
        currentBlock.text = currentBlock.lines.join('\n');
      }
      blocks.push(currentBlock);
      currentBlock = null;
    }
  }

  for (let i = 0; i < linesWithMeta.length; i++) {
    const lineObj = linesWithMeta[i];
    const rawLine = lineObj.text;
    const trimmed = rawLine.trim();
    const prevObj = i > 0 ? linesWithMeta[i - 1] : null;
    const nextObj = i < linesWithMeta.length - 1 ? linesWithMeta[i + 1] : null;
    const nextTrim = nextObj ? nextObj.text.trim() : '';
    const nextStartsLower = /^[a-z]/.test(nextTrim);

    if (!trimmed) {
      if (currentBlock && currentBlock.type === 'code') {
        currentBlock.lines.push('');
      } else {
        flushBlock();
      }
      continue;
    }

    // Ignore Page 1 title banner furniture
    if (
      trimmed.includes('ASP.NET Core - True Ultimate Guide') ||
      trimmed.includes('Asp .Net C ore – True Ultimate Guide') ||
      trimmed.includes('Asp.Net Core – True Ultimate Guide') ||
      /Section\s*\d+\s*[:–-].*-\s*(Notes|Cheat\s*Sheet)/i.test(trimmed)
    ) {
      flushBlock();
      blocks.push({
        type: 'banner_header',
        page: pageNum,
        lines: [trimmed],
        text: trimmed
      });
      continue;
    }

    // Connect wrapped lowercase lines to previous block if available
    if (/^[a-z]/.test(trimmed) && !currentBlock && blocks.length > 0) {
      const lastB = blocks[blocks.length - 1];
      if (lastB.type === 'prose' || lastB.type === 'list_item') {
        lastB.lines.push(rawLine);
        lastB.text += ' ' + trimmed;
        currentBlock = lastB;
        blocks.pop();
        continue;
      }
    }

    // 1. Check for Headings FIRST
    const isNumberedHeading = /^\d+\.\s+[A-Za-z0-9]/.test(trimmed) &&
      lineObj.isBold &&
      trimmed.length < 70 &&
      !trimmed.endsWith('.') && !trimmed.endsWith(';') && !trimmed.endsWith(',') && !trimmed.endsWith(':') &&
      !/:\s+[A-Za-z]{3,}/.test(trimmed) &&
      !/\b(to|your|the|a|an|of|in|for|with|and|or|that|which)$/i.test(trimmed) &&
      !nextStartsLower;

    const isTransitionHeading = /^(Detailed Explanation of Code|Key Points to Remember|Basic Example|Example|Deep Dive & Internals|Architecture Overview|Summary|Best Practices):?$/i.test(trimmed);

    const isStandAloneBoldHeading = lineObj.isBold &&
      trimmed.length < 80 &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith(',') &&
      !trimmed.endsWith(':') &&
      !trimmed.startsWith('•') &&
      !trimmed.startsWith('-') &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('o ') &&
      !/\b(to|your|the|a|an|of|in|for|with|and|or|that|which)$/i.test(trimmed) &&
      !nextStartsLower &&
      /^[a-zA-Z0-9_][A-Za-z0-9_\s,&/()\-.:#*]+$/.test(trimmed) &&
      !isCodeLine(trimmed, false, null);

    const isHeading = (isNumberedHeading || isTransitionHeading || isStandAloneBoldHeading) &&
      (!currentBlock || currentBlock.type !== 'code');

    if (isHeading) {
      flushBlock();
      blocks.push({
        type: 'heading',
        page: pageNum,
        lines: [trimmed.replace(/:$/, '')],
        text: trimmed.replace(/:$/, '')
      });
      continue;
    }

    // 2. Check for Callouts
    if (/^(Note|Warning|Important|Tip|Deep Dive):/i.test(trimmed)) {
      flushBlock();
      blocks.push({
        type: 'callout',
        page: pageNum,
        lines: [rawLine],
        text: rawLine
      });
      continue;
    }

    // 3. Check for List Items
    const isListItemStart = /^[•▪➢✓●○\*\-]\s+/.test(trimmed) || /^o\s+/.test(trimmed) || /^\d+[\.\)]\s+/.test(trimmed);

    // List item continuation
    if (currentBlock && currentBlock.type === 'list_item') {
      const isCode = isCodeLine(rawLine, false, prevObj?.text);
      if (!isListItemStart && !isCode && !trimmed.startsWith('//')) {
        const prevTrim = currentBlock.lines[currentBlock.lines.length - 1].trim();
        const prevEndsUnfinished = !/[.?!:]$/.test(prevTrim) || /[,;\-–—]$/.test(prevTrim) || /\b(to|your|the|a|an|of|in|for|with|and|or|that|which|is|are|as|by|from|at)$/i.test(prevTrim);
        if (lineObj.startX > 85 || /^[a-z"']/.test(trimmed) || prevEndsUnfinished) {
          currentBlock.lines.push(rawLine);
          currentBlock.text += ' ' + trimmed;
          continue;
        }
      }
    }

    if (isListItemStart) {
      flushBlock();
      currentBlock = {
        type: 'list_item',
        page: pageNum,
        lines: [rawLine],
        text: rawLine
      };
      continue;
    }

    // 4. Check for Code
    const inCode = currentBlock && currentBlock.type === 'code';
    let isCode = isCodeLine(rawLine, inCode, prevObj?.text);

    if (inCode && codeBraceDepth > 0 && !isHeading && !isListItemStart && !trimmed.startsWith('Note:') && !trimmed.startsWith('Warning:') && !trimmed.startsWith('Tip:')) {
      isCode = true;
    }

    if (isCode) {
      if (!inCode) {
        flushBlock();
        currentBlock = {
          type: 'code',
          page: pageNum,
          lines: [rawLine]
        };
        codeBraceDepth = 0;
      } else {
        currentBlock.lines.push(rawLine);
      }
      const openMatches = rawLine.match(/\{/g);
      const closeMatches = rawLine.match(/\}/g);
      if (openMatches) codeBraceDepth += openMatches.length;
      if (closeMatches) codeBraceDepth = Math.max(0, codeBraceDepth - closeMatches.length);
      continue;
    }

    // 5. Otherwise Prose
    if (currentBlock && currentBlock.type === 'prose') {
      currentBlock.lines.push(rawLine);
    } else {
      flushBlock();
      currentBlock = {
        type: 'prose',
        page: pageNum,
        lines: [rawLine]
      };
    }
  }

  flushBlock();
  return blocks;
}

async function extractPdf(pdfPath, isCheatsheet, secNum) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const numPages = doc.numPages;

  const pages = [];
  let totalRawChars = 0;
  let totalRepairedChars = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const tc = await page.getTextContent({ normalizeWhitespace: false });

    // Group items into lines
    const lineGroups = [];
    let currentLine = [];
    let lastY = null;

    for (const item of tc.items) {
      if (!item.str && !item.hasEOL) continue;
      const y = item.transform[5];
      if (lastY === null || Math.abs(y - lastY) > 3.5) {
        if (currentLine.length > 0) lineGroups.push(currentLine);
        currentLine = [];
        lastY = y;
      }
      currentLine.push(item);
    }
    if (currentLine.length > 0) lineGroups.push(currentLine);

    // Font frequency analysis to determine body font vs bold/heading fonts
    const fontFreq = {};
    for (const lg of lineGroups) {
      for (const it of lg) {
        if (it.str.trim()) {
          fontFreq[it.fontName] = (fontFreq[it.fontName] || 0) + it.str.length;
        }
      }
    }
    let bodyFont = null;
    let maxLen = 0;
    for (const [f, len] of Object.entries(fontFreq)) {
      if (len > maxLen && !f.includes('f5')) {
        maxLen = len;
        bodyFont = f;
      }
    }

    // Reconstruct lines preserving indentation and metadata
    const linesWithMeta = [];
    let rawTextAcc = '';

    for (const lg of lineGroups) {
      lg.sort((a, b) => a.transform[4] - b.transform[4]);
      const startX = lg[0].transform[4];
      const y = lg[0].transform[5];
      let lineStr = '';
      let rawLineStr = '';
      let lastX = null;
      let lastW = 0;
      let isBoldLine = true;
      let hasText = false;

      for (const it of lg) {
        if (!it.str) continue;
        hasText = true;
        if (it.fontName === bodyFont) isBoldLine = false;

        if (lastX !== null) {
          const gap = it.transform[4] - (lastX + lastW);
          if (gap > 2 && !lineStr.endsWith(' ') && !it.str.startsWith(' ')) {
            lineStr += ' ';
            rawLineStr += ' ';
          }
        }

        // Font f5 / f4 with 'o' represents bullet symbol glyph in PDF
        if ((it.fontName.includes('f5') || it.fontName.includes('f4')) && it.str.trim() === 'o') {
          lineStr += '• ';
          rawLineStr += '• ';
        } else {
          lineStr += it.str;
          rawLineStr += it.str;
        }

        lastX = it.transform[4];
        lastW = it.width;
      }

      if (!hasText) continue;

      rawTextAcc += rawLineStr + '\n';

      const cleanedLine = redactForbidden(normalizeLigatures(lineStr));
      linesWithMeta.push({
        text: cleanedLine,
        rawText: rawLineStr,
        startX: Math.round(startX),
        y: Math.round(y),
        isBold: isBoldLine
      });
    }

    // Content blocks detection
    const blocks = detectBlocks(linesWithMeta, pageNum);

    let rawChars = rawTextAcc.length;
    let repChars = linesWithMeta.map(l => l.text).join('\n').length;

    if (rawChars === 0) {
      const ops = await page.getOperatorList();
      if (ops.fnArray.length > 0) {
        const diagNotice = `[Vector Diagram / Illustrated Schema (Operator count: ${ops.fnArray.length})]`;
        rawTextAcc = diagNotice;
        rawChars = diagNotice.length;
        repChars = diagNotice.length;
        blocks.push({
          type: 'diagram',
          page: pageNum,
          lines: [diagNotice],
          text: diagNotice
        });
      } else {
        throw new Error(`Completeness control failed: Page ${pageNum} of ${pdfPath} is completely empty!`);
      }
    }

    totalRawChars += rawChars;
    totalRepairedChars += repChars;

    pages.push({
      page_number: pageNum,
      raw_text: rawTextAcc,
      repaired_text: linesWithMeta.map(l => l.text).join('\n'),
      lines: linesWithMeta,
      blocks: blocks,
      char_count_raw: rawChars,
      char_count_repaired: repChars
    });
  }

  return {
    source_file: path.basename(pdfPath),
    absolute_path: pdfPath.replace(/\\/g, '/'),
    section_number: secNum,
    normalized_section: String(secNum).padStart(2, '0'),
    is_cheatsheet: isCheatsheet,
    total_pages: numPages,
    total_raw_chars: totalRawChars,
    total_repaired_chars: totalRepairedChars,
    pages
  };
}

async function runExtraction() {
  console.log('--- Phase B: Deterministic PDF Extraction with Verbatim Font-Aware Line Classification ---');

  if (!fs.existsSync(SOURCE_MAP_FILE)) {
    throw new Error(`Missing source map file: ${SOURCE_MAP_FILE}`);
  }

  const sourceMap = JSON.parse(fs.readFileSync(SOURCE_MAP_FILE, 'utf8'));
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    sections_extracted: 0,
    cheatsheets_extracted: 0,
    total_pages_extracted: 0,
    total_raw_chars: 0,
    total_repaired_chars: 0,
    items: [],
    status: 'pending'
  };

  // Extract sections 01 to 30
  for (let i = 1; i <= 30; i++) {
    const secStr = String(i).padStart(2, '0');
    const entry = sourceMap[secStr];
    if (!entry) throw new Error(`Missing source map entry for section ${secStr}`);

    console.log(`Extracting Section ${secStr} [${entry.primary_source.filename}]...`);
    const secData = await extractPdf(entry.primary_source.absolute_path, false, i);
    secData.title = entry.primary_source.proposed_title;

    // Verify page count against inventory
    const invItem = inventory.find(x => x.filename === entry.primary_source.filename);
    if (invItem && secData.total_pages !== invItem.page_count) {
      throw new Error(`Page count mismatch for ${entry.primary_source.filename}: got ${secData.total_pages}, expected ${invItem.page_count}`);
    }

    const secOutFile = path.join(OUT_DIR, `section-${secStr}.json`);
    fs.writeFileSync(secOutFile, JSON.stringify(secData, null, 2), 'utf8');

    report.sections_extracted++;
    report.total_pages_extracted += secData.total_pages;
    report.total_raw_chars += secData.total_raw_chars;
    report.total_repaired_chars += secData.total_repaired_chars;
    report.items.push({
      type: 'section',
      section_number: i,
      normalized_section: secStr,
      filename: entry.primary_source.filename,
      pages: secData.total_pages,
      raw_chars: secData.total_raw_chars,
      repaired_chars: secData.total_repaired_chars,
      status: 'complete'
    });

    // Extract cheatsheet if present
    if (entry.cheatsheet) {
      console.log(`Extracting Cheatsheet ${secStr} [${entry.cheatsheet.filename}]...`);
      const cheatData = await extractPdf(entry.cheatsheet.absolute_path, true, i);
      cheatData.title = entry.cheatsheet.proposed_title;

      const cheatInvItem = inventory.find(x => x.filename === entry.cheatsheet.filename);
      if (cheatInvItem && cheatData.total_pages !== cheatInvItem.page_count) {
        throw new Error(`Page count mismatch for cheatsheet ${entry.cheatsheet.filename}`);
      }

      const cheatOutFile = path.join(OUT_DIR, `cheatsheet-${secStr}.json`);
      fs.writeFileSync(cheatOutFile, JSON.stringify(cheatData, null, 2), 'utf8');

      report.cheatsheets_extracted++;
      report.total_pages_extracted += cheatData.total_pages;
      report.total_raw_chars += cheatData.total_raw_chars;
      report.total_repaired_chars += cheatData.total_repaired_chars;
      report.items.push({
        type: 'cheatsheet',
        section_number: i,
        normalized_section: secStr,
        filename: entry.cheatsheet.filename,
        pages: cheatData.total_pages,
        raw_chars: cheatData.total_raw_chars,
        repaired_chars: cheatData.total_repaired_chars,
        status: 'complete'
      });
    }
  }

  report.status = 'success';
  fs.writeFileSync('data/extraction-report.json', JSON.stringify(report, null, 2), 'utf8');

  console.log('---------------------------------------------------------');
  console.log(`✓ Successfully extracted ${report.sections_extracted} sections & ${report.cheatsheets_extracted} cheatsheets.`);
  console.log(`✓ Total Pages: ${report.total_pages_extracted}`);
  console.log(`✓ Total Raw Chars: ${report.total_raw_chars.toLocaleString()}`);
  console.log(`✓ Total Repaired Chars: ${report.total_repaired_chars.toLocaleString()}`);
  console.log(`✓ Wrote data/extraction-report.json`);
  console.log('✓ Phase B Gate PASSED.');
}

runExtraction().catch(err => {
  console.error('Fatal Extraction Error:', err);
  process.exit(1);
});
