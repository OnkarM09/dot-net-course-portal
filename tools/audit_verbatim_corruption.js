import fs from 'fs';
import path from 'path';
import { countCodeBraces } from './code_balancer.js';

const SECTIONS_DIR = 'sections';
const DISALLOWED_NAMES = ['Harsha', 'Vardhan', 'Harsha Vardhan', 'WEB ACADEMY BY'];

let totalErrors = 0;
const results = [];

console.log('=== Automated Verbatim Fidelity & Corruption Audit ===\n');

// 1. Audit all 30 section HTML files
for (let i = 1; i <= 30; i++) {
  const secStr = String(i).padStart(2, '0');
  const filename = `section-${secStr}.html`;
  const filePath = path.join(SECTIONS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file: ${filePath}`);
    totalErrors++;
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const fileErrors = [];

  // A. Check for single-letter truncated list item bug: <li>r ...
  const singleLetterLi = html.match(/<li>\s*[a-z]\s+/g);
  if (singleLetterLi) {
    fileErrors.push(`Single-letter truncated list item bug: ${JSON.stringify(singleLetterLi.slice(0, 3))}`);
  }

  // B. Check for paragraphs starting mid-sentence with lowercase (excluding direct URLs)
  const lowercaseP = (html.match(/<p>\s*[a-z][\s\S]*?<\/p>/g) || [])
    .filter(p => !/<p>\s*https?:\/\//i.test(p));
  if (lowercaseP.length > 0) {
    fileErrors.push(`Paragraph starting with lowercase: ${JSON.stringify(lowercaseP.slice(0, 3))}`);
  }

  // C. Check for paragraphs ending in prepositions/conjunctions immediately followed by another <p>
  const trailingPrep = html.match(/<p>[^<]*\b(to|your|the|a|an|of|in|for|with|and|or|that|which)\s*<\/p>\s*<p>/gi);
  if (trailingPrep) {
    fileErrors.push(`Paragraph ending in preposition before another paragraph: ${JSON.stringify(trailingPrep.slice(0, 3))}`);
  }

  // D. Check for raw literal bullets inside <li> elements
  const literalBullets = html.match(/<li>\s*[•▪●○]/g);
  if (literalBullets) {
    fileErrors.push(`Raw literal bullet inside <li>: ${JSON.stringify(literalBullets.slice(0, 3))}`);
  }

  // E. Check for unbalanced braces inside <pre><code> using real C# parser
  const codeMatches = html.match(/<pre><code[\s\S]*?<\/code><\/pre>/g) || [];
  let braceErrors = 0;
  for (const block of codeMatches) {
    const raw = block.replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const counts = countCodeBraces(raw);
    if (counts.opens !== counts.closes) {
      braceErrors++;
    }
  }
  if (braceErrors > 0) {
    fileErrors.push(`Unbalanced code braces in ${braceErrors} code block(s)`);
  }

  // F. Check for instructor names
  for (const name of DISALLOWED_NAMES) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(html)) {
      fileErrors.push(`Instructor name leak: found "${name}"`);
    }
  }

  // G. Specific section assertions
  if (i === 5) {
    const sec5Target = 'At its heart, routing is the mechanism that ASP.NET Core uses to match incoming HTTP requests to specific endpoints (e.g., controller actions, Razor Pages, or minimal API handlers) within your application. This allows you to define clean and meaningful URLs that clearly indicate the resources or actions being requested.';
    if (!html.includes(sec5Target)) {
      fileErrors.push(`Section 05 missing verbatim target paragraph!`);
    }
  }

  if (i === 30) {
    if (!/<h[23][^>]*>.*?1\.\s*Minimal API Overview.*?<\/h[23]>/i.test(html)) {
      fileErrors.push(`Section 30 missing "1. Minimal API Overview" as heading!`);
    }
  }

  if (fileErrors.length > 0) {
    console.error(`❌ Section ${secStr} failed with ${fileErrors.length} issue(s):`);
    fileErrors.forEach(err => console.error(`   - ${err}`));
    totalErrors += fileErrors.length;
  } else {
    results.push(`Sec ${secStr}: PASS`);
  }
}

// 2. Audit index.html and README.md for instructor names
['index.html', 'README.md'].forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const name of DISALLOWED_NAMES) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(content)) {
        console.error(`❌ ${file}: Instructor name leak: found "${name}"`);
        totalErrors++;
      }
    }
  }
});

console.log(`\nAudit Summary: ${results.length}/30 sections passed cleanly.`);
if (totalErrors === 0) {
  console.log('✅ ALL VERBATIM FIDELITY & CORRUPTION AUDITS PASSED WITH ZERO ERRORS!');
  process.exit(0);
} else {
  console.error(`❌ Total audit errors: ${totalErrors}`);
  process.exit(1);
}
