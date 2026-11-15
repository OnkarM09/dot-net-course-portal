import fs from 'fs';
import path from 'path';
import * as pdfjs from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';

const INVENTORY_FILE = 'data/pdf-inventory.json';
const SOURCE_MAP_FILE = 'data/source-map.json';
const OUT_DIR = 'data/extracted';

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

function dehyphenate(lines) {
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (i < lines.length - 1) {
      const nextLine = lines[i + 1];
      // Only dehyphenate if trailing hyphen joins lowercase letters
      const match = line.match(/([a-z]+)-$/);
      const nextMatch = nextLine.match(/^\s*([a-z]+)/);
      if (match && nextMatch) {
        line = line.slice(0, -1) + nextMatch[1];
        lines[i + 1] = nextLine.replace(/^\s*[a-z]+/, '').trimStart();
      }
    }
    result.push(line);
  }
  return result;
}

function isCodeLine(line, inCodeBlock, prevLine) {
  const trimmed = line.trim();
  if (!trimmed) return inCodeBlock; // blank lines within code remain code

  if (trimmed === 'Code' || trimmed === 'C# Code:' || trimmed === 'Example:') return false;
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
    /EndpointFilterInvocationDelegate\s+next\)/ // Method signature continuation
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

function detectBlocks(lines, pageNum) {
  const blocks = [];
  let currentBlock = null;
  let codeBraceDepth = 0;

  function flushBlock() {
    if (currentBlock && currentBlock.lines.length > 0) {
      currentBlock.text = currentBlock.lines.join('\n');
      blocks.push(currentBlock);
      currentBlock = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const prevRaw = i > 0 ? lines[i - 1] : null;

    if (!trimmed) {
      if (currentBlock && currentBlock.type === 'code') {
        currentBlock.lines.push('');
      } else {
        flushBlock();
      }
      continue;
    }

    // Ignore Page 1 title banner furniture
    if (pageNum === 1 && (
      trimmed.includes('ASP.NET Core - True Ultimate Guide') ||
      trimmed.includes('Asp .Net C ore – True Ultimate Guide') ||
      trimmed.includes('Asp.Net Core – True Ultimate Guide') ||
      /Section\s*\d+\s*[:–-].*-\s*(Notes|Cheat\s*Sheet)/i.test(trimmed)
    )) {
      flushBlock();
      blocks.push({
        type: 'banner_header',
        page: pageNum,
        lines: [trimmed],
        text: trimmed
      });
      continue;
    }

    // Check for List item start or continuation
    const isListItem = /^[•o\*\-▪]\s+/.test(trimmed) || /^\d+[\.\)]\s+/.test(trimmed);

    // Check for List item continuation (indented line or wrapping without ending punctuation)
    if (currentBlock && currentBlock.type === 'list_item') {
      const isCallout = /^(Note|Warning|Important|Tip|Deep Dive):/i.test(trimmed);
      const isCode = isCodeLine(rawLine, false, prevRaw);
      if (!isListItem && !isCallout && !isCode && !trimmed.startsWith('//')) {
        const prevTrim = currentBlock.lines[currentBlock.lines.length - 1].trim();
        if (/^\s{2,}/.test(rawLine) || /^[a-z"']/.test(trimmed) || !/[.?!]$/.test(prevTrim)) {
          currentBlock.lines.push(rawLine);
          currentBlock.text += ' ' + trimmed;
          continue;
        }
      }
    }

    if (isListItem && (!currentBlock || currentBlock.type !== 'code')) {
      flushBlock();
      currentBlock = {
        type: 'list_item',
        page: pageNum,
        lines: [rawLine],
        text: rawLine
      };
      continue;
    }

    // Check for Heading
    const isHeading = (
      // Short line without ending punctuation
      trimmed.length < 75 &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith(',') &&
      !trimmed.endsWith(':') &&
      !trimmed.startsWith('•') &&
      !trimmed.startsWith('o') &&
      !trimmed.startsWith('-') &&
      !trimmed.startsWith('//') &&
      /^[A-Z][A-Za-z0-9\s,&/()\-]+$/.test(trimmed) &&
      !isCodeLine(trimmed, false, null)
    );

    if (isHeading && (!currentBlock || currentBlock.type !== 'code')) {
      flushBlock();
      blocks.push({
        type: 'heading',
        page: pageNum,
        lines: [trimmed],
        text: trimmed
      });
      continue;
    }

    // Check for Callout markers
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

    // Check for Code line
    const inCode = currentBlock && currentBlock.type === 'code';
    let isCode = isCodeLine(rawLine, inCode, prevRaw);

    // If we have unclosed braces in an active code block and line is not a heading or callout
    if (inCode && codeBraceDepth > 0 && !isHeading && !isListItem && !trimmed.startsWith('Note:') && !trimmed.startsWith('Warning:') && !trimmed.startsWith('Tip:')) {
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

    // Otherwise prose
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
      if (lastY === null || Math.abs(y - lastY) > 3) {
        if (currentLine.length > 0) lineGroups.push(currentLine);
        currentLine = [];
        lastY = y;
      }
      currentLine.push(item);
    }
    if (currentLine.length > 0) lineGroups.push(currentLine);

    // Reconstruct lines preserving indentation
    const linesWithMeta = [];
    const formattedLines = [];
    let rawTextAcc = '';

    for (const lg of lineGroups) {
      lg.sort((a, b) => a.transform[4] - b.transform[4]);
      const startX = lg[0].transform[4];
      const y = lg[0].transform[5];
      let maxFontSize = 0;
      let fontName = lg[0].fontName || '';

      let lineStr = '';
      let rawLineStr = '';
      let lastX = null;
      let lastW = 0;

      for (const it of lg) {
        if (it.transform[0] > maxFontSize) maxFontSize = it.transform[0];
        if (lastX !== null) {
          const gap = it.transform[4] - (lastX + lastW);
          if (gap > 2 && !lineStr.endsWith(' ') && !it.str.startsWith(' ')) {
            lineStr += ' ';
            rawLineStr += ' ';
          }
        }
        lineStr += it.str;
        rawLineStr += it.str;
        lastX = it.transform[4];
        lastW = it.width;
      }

      rawTextAcc += rawLineStr + '\n';

      // Indentation: 72 is standard left margin in PDF
      const indentCount = Math.max(0, Math.round((startX - 72) / 6.5));
      const indentedLine = ' '.repeat(indentCount) + lineStr;

      formattedLines.push(indentedLine);
      linesWithMeta.push({
        text: indentedLine,
        rawText: lineStr,
        x: startX,
        y: y,
        fontSize: maxFontSize,
        fontName: fontName
      });
    }

    // Conservative repair passes
    let repairedLines = formattedLines.map(normalizeLigatures);
    repairedLines = dehyphenate(repairedLines);
    const repairedText = repairedLines.join('\n');

    // Content blocks detection
    const blocks = detectBlocks(repairedLines, pageNum);

    let rawChars = rawTextAcc.length;
    let repChars = repairedText.length;

    if (rawChars === 0) {
      const ops = await page.getOperatorList();
      if (ops.fnArray.length > 0) {
        // Page has vector graphics/diagrams without selectable text
        const diagNotice = `[Vector Diagram / Illustrated Schema (Operator count: ${ops.fnArray.length})]`;
        rawTextAcc = diagNotice;
        repairedLines = [diagNotice];
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
      repaired_text: repairedText,
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
  console.log('--- Phase B: Deterministic PDF Extraction with Completeness Controls ---');

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
