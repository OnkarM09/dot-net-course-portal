import fs from 'fs';
import path from 'path';

const MANIFEST_FILE = 'data/section-manifest.json';
const SECTIONS_DIR = 'sections';
const SEARCH_INDEX_FILE = 'assets/js/search-index.js';
const REPORT_FILE = 'reports/audit-report.json';

// Disallowed names from secret config
let disallowedNames = ['Harsha', 'Vardhan', 'Harsha Vardhan'];
if (fs.existsSync('config/audit-secrets.json')) {
  try {
    const secrets = JSON.parse(fs.readFileSync('config/audit-secrets.json', 'utf8'));
    if (secrets.disallowed_names) disallowedNames = secrets.disallowed_names;
  } catch (e) {}
}

function decodeHtml(html) {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function countCodeBraces(code) {
  let opens = 0;
  let closes = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let inString = false;
  let inVerbatim = false;
  let inChar = false;

  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    const prev = i > 0 ? code[i - 1] : '';
    const next = i + 1 < code.length ? code[i + 1] : '';

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inVerbatim) {
      if (c === '"') {
        if (next === '"') {
          i++; // escaped quote ""
        } else {
          inVerbatim = false;
        }
      }
      continue;
    }
    if (inString) {
      if (c === '"' && prev !== '\\') {
        inString = false;
      }
      continue;
    }
    if (inChar) {
      if (c === '\n' || (c === "'" && prev !== '\\')) {
        inChar = false;
      }
      continue;
    }

    if (c === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === '@' && next === '"') {
      inVerbatim = true;
      i++;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "'") {
      inChar = true;
      continue;
    }

    if (c === '{') opens++;
    if (c === '}') closes++;
  }

  return { opens, closes };
}

async function auditSite() {
  console.log('--- Phase F: Programmatic Content, Structural & Accessibility Audit ---');

  const violations = [];
  const warnings = [];
  const stats = {
    pages_audited: 0,
    code_blocks_audited: 0,
    anchors_verified: 0,
    links_verified: 0,
    ids_checked: 0
  };

  fs.mkdirSync('reports', { recursive: true });

  // 1. Check exactly 30 section HTML files
  const sectionFiles = fs.readdirSync(SECTIONS_DIR).filter(f => f.match(/^section-\d{2}\.html$/));
  if (sectionFiles.length !== 30) {
    violations.push({
      rule: 'Section File Count',
      message: `Expected exactly 30 section files, found ${sectionFiles.length}`
    });
  }

  for (let i = 1; i <= 30; i++) {
    const secStr = String(i).padStart(2, '0');
    const expectedFile = `section-${secStr}.html`;
    if (!sectionFiles.includes(expectedFile)) {
      violations.push({
        rule: 'Section File Numbering',
        message: `Missing expected section file: ${expectedFile}`
      });
    }
  }

  // 2. Check all files for disallowed instructor names
  const filesToScan = [
    'index.html',
    'README.md',
    'assets/css/docs.css',
    'assets/js/main.js',
    'assets/js/search-engine.js',
    'assets/js/search-index.js',
    ...sectionFiles.map(f => path.join(SECTIONS_DIR, f))
  ];

  for (const relPath of filesToScan) {
    if (!fs.existsSync(relPath)) continue;
    const content = fs.readFileSync(relPath, 'utf8');
    for (const name of disallowedNames) {
      const reg = new RegExp(`\\b${name}\\b`, 'i');
      if (reg.test(content)) {
        violations.push({
          file: relPath,
          rule: 'Attribution Leak',
          message: `Disallowed instructor name "${name}" detected in ${relPath}`
        });
      }
    }

    // Check for author metadata in JSON files
    if (relPath.endsWith('.json')) {
      if (/"author":\s*"(?!anonymous|community)[^"]+"/i.test(content)) {
        violations.push({
          file: relPath,
          rule: 'Author Metadata Leak',
          message: `Author metadata present in ${relPath}`
        });
      }
    }
  }

  // 3. Check for external assets in HTML, JS, CSS
  for (const relPath of filesToScan) {
    if (relPath === 'README.md') continue; // README badges are exempt
    const content = fs.readFileSync(relPath, 'utf8');

    const assetMatches = content.match(/(?:src|href)=["'](https?:|\/\/)[^"']+["']/gi) || [];
    for (const match of assetMatches) {
      // Exclude standard XML namespaces or links inside pre code
      if (!match.includes('www.w3.org') && !match.includes('github.com')) {
        violations.push({
          file: relPath,
          rule: 'External Runtime Dependency',
          message: `External asset dependency found: ${match}`
        });
      }
    }
  }

  // 4. Detailed audit of each section page and index.html
  const allEmittedPages = ['index.html', ...sectionFiles.map(f => path.join(SECTIONS_DIR, f))];
  const allDocIds = new Map(); // file -> Set of IDs

  for (const pagePath of allEmittedPages) {
    stats.pages_audited++;
    const content = fs.readFileSync(pagePath, 'utf8');
    const pageDir = path.dirname(pagePath);
    const docIds = new Set();
    allDocIds.set(pagePath, docIds);

    // Document structure
    if (!content.includes('<!DOCTYPE html>')) {
      violations.push({ file: pagePath, rule: 'DOCTYPE', message: 'Missing <!DOCTYPE html>' });
    }
    if (!/<html[^>]+lang="en"/i.test(content)) {
      violations.push({ file: pagePath, rule: 'HTML Lang', message: 'Missing <html lang="en">' });
    }
    if (!content.includes('<meta name="viewport"')) {
      violations.push({ file: pagePath, rule: 'Viewport Meta', message: 'Missing responsive viewport meta tag' });
    }
    if (!content.includes('<title>')) {
      violations.push({ file: pagePath, rule: 'Document Title', message: 'Missing document title' });
    }

    // Single H1 check
    const h1Count = (content.match(/<h1\b/gi) || []).length;
    if (h1Count !== 1) {
      violations.push({ file: pagePath, rule: 'Single H1 Heading', message: `Expected exactly one <h1>, found ${h1Count}` });
    }

    // Skip link check
    if (!content.includes('class="skip-link"')) {
      violations.push({ file: pagePath, rule: 'Skip Link', message: 'Missing accessible skip link' });
    }

    // Landmarks check
    if (!content.includes('<main')) {
      violations.push({ file: pagePath, rule: 'Main Landmark', message: 'Missing <main> landmark' });
    }

    // Check duplicate IDs and collect IDs
    const idMatches = content.matchAll(/\bid=["']([^"']+)["']/gi);
    for (const m of idMatches) {
      const idVal = m[1];
      stats.ids_checked++;
      if (docIds.has(idVal)) {
        violations.push({
          file: pagePath,
          rule: 'Duplicate ID',
          message: `Duplicate id="${idVal}" found in ${pagePath}`
        });
      } else {
        docIds.add(idVal);
      }
    }

    // Check buttons have accessible names
    const buttonMatches = content.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi);
    for (const b of buttonMatches) {
      const attrs = b[1];
      const text = b[2].replace(/<[^>]+>/g, '').trim();
      const hasAriaLabel = /aria-label=["'][^"']+["']/i.test(attrs);
      if (!text && !hasAriaLabel) {
        violations.push({
          file: pagePath,
          rule: 'Accessible Button',
          message: `Button without accessible label or visible text found in ${pagePath}: ${b[0].slice(0, 80)}`
        });
      }
    }

    // Check raw unescaped generic tags <T>, <TKey>, etc.
    const genericTagMatch = content.match(/<(?:T|TKey|TValue|TEntity|TModel)\b[^>]*>/gi);
    if (genericTagMatch) {
      violations.push({
        file: pagePath,
        rule: 'Unescaped Generic Type',
        message: `Raw unescaped generic tag found in ${pagePath}: ${genericTagMatch.join(', ')}`
      });
    }

    // Check double-escape artifacts &lt;code&gt;
    if (content.includes('&lt;code&gt;') || content.includes('&lt;pre&gt;')) {
      violations.push({
        file: pagePath,
        rule: 'Double Escaped HTML',
        message: `Double-escaped code tag found in ${pagePath}`
      });
    }

    // Check all code blocks for language class, label, copy button, and balanced braces
    const codeBlockRegex = /<div class="code-block">([\s\S]*?<\/pre>\s*<\/div>)/gi;
    let cbMatch;
    while ((cbMatch = codeBlockRegex.exec(content)) !== null) {
      stats.code_blocks_audited++;
      const cbHtml = cbMatch[1];

      if (!cbHtml.includes('class="language-label"')) {
        violations.push({ file: pagePath, rule: 'Code Language Label', message: 'Code block missing language-label' });
      }
      if (!/\bcopy-code-btn\b/.test(cbHtml)) {
        violations.push({ file: pagePath, rule: 'Code Copy Button', message: 'Code block missing copy-code-btn' });
      }

      const codeMatch = cbHtml.match(/<code class="language-([^"]+)">([\s\S]*?)<\/code>/);
      if (codeMatch) {
        const lang = codeMatch[1];
        const codeText = decodeHtml(codeMatch[2]);

        if (lang === 'csharp' || lang === 'typescript' || lang === 'json') {
          // Check brace balance
          const { opens, closes } = countCodeBraces(codeText);
          if (opens !== closes) {
            violations.push({
              file: pagePath,
              rule: 'Unbalanced Braces',
              message: `Unbalanced braces in ${lang} code block ({ = ${opens}, } = ${closes}) in ${pagePath}: ${codeText.slice(0, 100).replace(/\s+/g, ' ')}...`
            });
          }
        }
      } else {
        violations.push({ file: pagePath, rule: 'Code Tag Class', message: 'Code block missing language class' });
      }
    }

    // Check local file links
    const linkMatches = content.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi);
    for (const lm of linkMatches) {
      stats.links_verified++;
      const href = lm[1];
      if (href.startsWith('#')) {
        const hash = href.slice(1);
        if (hash !== 'top' && hash !== 'main-content' && !docIds.has(hash)) {
          violations.push({
            file: pagePath,
            rule: 'Broken In-Page Anchor',
            message: `Anchor href="#${hash}" does not exist in ${pagePath}`
          });
        }
      } else if (!href.startsWith('http') && !href.startsWith('mailto:')) {
        const [filePath, hash] = href.split('#');
        const resolved = path.resolve(pageDir, filePath);
        if (!fs.existsSync(resolved)) {
          violations.push({
            file: pagePath,
            rule: 'Broken Local Link',
            message: `Link href="${href}" resolves to non-existent file: ${resolved}`
          });
        }
      }
    }
  }

  // 5. Audit Search Index URLs and Anchors
  if (fs.existsSync(SEARCH_INDEX_FILE)) {
    const searchIdxContent = fs.readFileSync(SEARCH_INDEX_FILE, 'utf8');
    // Extract array from window.SEARCH_INDEX = [...]
    const jsonMatch = searchIdxContent.match(/window\.SEARCH_INDEX\s*=\s*(\[[\s\S]*?\]);/);
    if (jsonMatch) {
      const searchIndex = JSON.parse(jsonMatch[1]);
      for (const entry of searchIndex) {
        stats.anchors_verified++;
        const [filePart, hashPart] = entry.url.split('#');
        const fullSectionPath = path.join(SECTIONS_DIR, filePart);

        if (!fs.existsSync(fullSectionPath)) {
          violations.push({
            rule: 'Search Index URL',
            message: `Search entry "${entry.title}" points to missing file: ${fullSectionPath}`
          });
        } else if (hashPart) {
          const docIdSet = allDocIds.get(fullSectionPath);
          if (docIdSet && !docIdSet.has(hashPart)) {
            violations.push({
              rule: 'Search Index Anchor',
              message: `Search entry "${entry.title}" has anchor #${hashPart} which does not exist in ${fullSectionPath}`
            });
          }
        }
      }
    }
  }

  // 6. Write Report
  const passed = violations.length === 0;
  const report = {
    timestamp: new Date().toISOString(),
    status: passed ? 'PASSED' : 'FAILED',
    violations_count: violations.length,
    warnings_count: warnings.length,
    stats,
    violations,
    warnings
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');

  console.log('---------------------------------------------------------');
  console.log(`Pages Audited: ${stats.pages_audited}`);
  console.log(`Code Blocks Audited: ${stats.code_blocks_audited}`);
  console.log(`IDs Checked: ${stats.ids_checked}`);
  console.log(`Links Verified: ${stats.links_verified}`);
  console.log(`Search Anchors Verified: ${stats.anchors_verified}`);
  console.log(`Violations: ${violations.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Audit Status: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Report written to ${REPORT_FILE}`);

  if (!passed) {
    console.error('\nViolations List:');
    violations.slice(0, 20).forEach((v, idx) => {
      console.error(`  ${idx + 1}. [${v.rule}] ${v.file || ''}: ${v.message}`);
    });
    process.exit(1);
  }
}

auditSite().catch(err => {
  console.error('Fatal Audit Error:', err);
  process.exit(1);
});
