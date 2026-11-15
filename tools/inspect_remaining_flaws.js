import fs from 'fs';

const report = JSON.parse(fs.readFileSync('reports/flaws-pre-repair.json', 'utf8'));
// Run fresh check
const issues = {
  double_escaped_tags: [],
  unbalanced_code_blocks: []
};

for (let i = 1; i <= 30; i++) {
  const file = `sections/section-${String(i).padStart(2, '0')}.html`;
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');

  // Double escaped tags
  const dem = html.match(/&lt;(code|p|span|\/code|\/p|\/span)&gt;/gi);
  if (dem) {
    issues.double_escaped_tags.push({ file, matches: dem });
  }

  // Unbalanced code blocks
  const codeBlocks = html.match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g) || [];
  codeBlocks.forEach((cb, idx) => {
    const raw = cb.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    const openC = (raw.match(/\{/g) || []).length;
    const closeC = (raw.match(/\}/g) || []).length;
    if (openC !== closeC) {
      issues.unbalanced_code_blocks.push({ file, blockIndex: idx, openC, closeC, snippet: raw.slice(0, 150) });
    }
  });
}

console.log('Double escaped tags:', JSON.stringify(issues.double_escaped_tags, null, 2));
console.log('Unbalanced code blocks:', JSON.stringify(issues.unbalanced_code_blocks, null, 2));
