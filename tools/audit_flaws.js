import fs from 'fs';
import path from 'path';

const SECTIONS_DIR = 'sections';
const issues = {
  instructor_names: [],
  duplicate_breadcrumbs: [],
  unescaped_generics: [],
  double_escaped_tags: [],
  literal_bullets_in_li: [],
  paragraphs_starting_with_bullet: [],
  raw_code_in_p: [],
  split_code_blocks: [],
  unbalanced_code_blocks: [],
  split_headings: [],
  missing_entities: []
};

const genericPats = [
  /ActionResult<[A-Za-z0-9_,\s]+>/g,
  /DbSet<[A-Za-z0-9_,\s]+>/g,
  /IOptions<[A-Za-z0-9_,\s]+>/g,
  /ILogger<[A-Za-z0-9_,\s]+>/g,
  /IEnumerable<[A-Za-z0-9_,\s]+>/g,
  /List<[A-Za-z0-9_,\s]+>/g,
  /Task<[A-Za-z0-9_,\s]+>/g
];

for (let i = 1; i <= 30; i++) {
  const secStr = String(i).padStart(2, '0');
  const file = path.join(SECTIONS_DIR, `section-${secStr}.html`);
  if (!fs.existsSync(file)) continue;

  const html = fs.readFileSync(file, 'utf8');

  // 1. Instructor Name
  if (/harsha|vardhan/i.test(html)) {
    issues.instructor_names.push({ file, match: html.match(/harsha|vardhan/gi) });
  }

  // 2. Duplicate Breadcrumbs
  const breadcrumbMatches = html.match(/class="breadcrumbs"/g);
  if (breadcrumbMatches && breadcrumbMatches.length > 1) {
    issues.duplicate_breadcrumbs.push({ file, count: breadcrumbMatches.length });
  }

  // 3. Unescaped generics
  for (const pat of genericPats) {
    const m = html.match(pat);
    if (m) {
      issues.unescaped_generics.push({ file, match: m });
    }
  }

  // 4. Double escaped tags in prose (outside <pre> and <code>)
  const proseOnly = html
    .replace(/<pre>[\s\S]*?<\/pre>/gi, '')
    .replace(/<code>[\s\S]*?<\/code>/gi, '');
  if (/&lt;(code|p|span|div|table|td|th|\/code|\/p|\/span|\/div|\/table|\/td|\/th)&gt;/gi.test(proseOnly)) {
    issues.double_escaped_tags.push({ file, match: proseOnly.match(/&lt;(code|p|span|div|table|td|th|\/code|\/p|\/span|\/div|\/table|\/td|\/th)&gt;/gi) });
  }

  // 5. Literal bullets in li
  const liBullets = html.match(/<li>\s*[•o\*\-]\s+/g);
  if (liBullets) {
    issues.literal_bullets_in_li.push({ file, count: liBullets.length, sample: liBullets.slice(0, 3) });
  }

  // 6. Paragraphs starting with bullet
  const pBullets = html.match(/<p>\s*[•o\*\-]\s+/g);
  if (pBullets) {
    issues.paragraphs_starting_with_bullet.push({ file, count: pBullets.length, sample: pBullets.slice(0, 3) });
  }

  // 7. Raw code in <p> (e.g. endpoints.Map, app.Use, class ..., // comment ..., etc.)
  const pCode = html.match(/<p>\s*(endpoints\.[A-Za-z0-9_]+\(|app\.[A-Za-z0-9_]+\(|builder\.[A-Za-z0-9_]+\(|public\s+(class|interface|record|void|async)|using\s+[A-Za-z0-9_.]+;|\/\/\s+[A-Za-z0-9_]+)[\s\S]*?<\/p>/g);
  if (pCode) {
    issues.raw_code_in_p.push({ file, count: pCode.length, sample: pCode.slice(0, 2) });
  }

  // 8. Unbalanced code blocks
  const codeBlocks = html.match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g) || [];
  codeBlocks.forEach((cb, idx) => {
    const raw = cb.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    const openC = (raw.match(/\{/g) || []).length;
    const closeC = (raw.match(/\}/g) || []).length;
    if (openC !== closeC) {
      issues.unbalanced_code_blocks.push({ file, blockIndex: idx, openC, closeC });
    }
  });
}

console.log('--- Flaws Audit Summary ---');
console.log('Instructor names in HTML:', issues.instructor_names.length);
console.log('Duplicate breadcrumbs in HTML:', issues.duplicate_breadcrumbs.length);
console.log('Unescaped generics in HTML:', issues.unescaped_generics.length);
console.log('Double escaped tags in HTML:', issues.double_escaped_tags.length);
console.log('Literal bullets in <li>:', issues.literal_bullets_in_li.length);
console.log('Paragraphs starting with bullet:', issues.paragraphs_starting_with_bullet.length);
console.log('Raw C# code in <p> tags:', issues.raw_code_in_p.length);
console.log('Unbalanced code blocks:', issues.unbalanced_code_blocks.length);

fs.writeFileSync('reports/flaws-pre-repair.json', JSON.stringify(issues, null, 2), 'utf8');
