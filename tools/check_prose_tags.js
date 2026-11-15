import fs from 'fs';

for (let i = 1; i <= 30; i++) {
  const file = `sections/section-${String(i).padStart(2, '0')}.html`;
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');

  // Strip code blocks
  const withoutCode = html.replace(/<pre><code[\s\S]*?<\/code><\/pre>/gi, '');

  const matches = withoutCode.match(/&lt;(code|p|span|table|td|th|\/code|\/p|\/span|\/table|\/td|\/th)&gt;/gi);
  if (matches) {
    console.log(`File ${file} has double-escaped tags in prose:`, matches);
  }
}
console.log('Done checking prose/tables.');
