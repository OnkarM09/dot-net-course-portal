import fs from 'fs';

for (let i = 1; i <= 30; i++) {
  const file = `sections/section-${String(i).padStart(2, '0')}.html`;
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const matches = [...content.matchAll(/<\/div>\s*<p>([\s\S]*?)<\/p>\s*<div class="code-block">/g)];
  if (matches.length > 0) {
    console.log(`Section ${i}: ${matches.length} occurrences`);
    matches.forEach(m => {
      const text = m[1].trim().replace(/\n/g, ' ');
      if (text.length < 120) console.log(`   P: ${text}`);
      else console.log(`   P: ${text.slice(0, 100)}...`);
    });
  }
}
