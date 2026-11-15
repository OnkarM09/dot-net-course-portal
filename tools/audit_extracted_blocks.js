import fs from 'fs';
import path from 'path';

let rawCodeInProse = [];

for (let i = 1; i <= 30; i++) {
  const secStr = String(i).padStart(2, '0');
  const files = [
    `data/extracted/section-${secStr}.json`,
    `data/extracted/cheatsheet-${secStr}.json`
  ];

  files.forEach(f => {
    if (!fs.existsSync(f)) return;
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    data.pages.forEach((p, pi) => {
      p.blocks.forEach((b, bi) => {
        if (b.type === 'prose') {
          const text = b.lines.join('\n');
          // Check if prose starts with code-like tokens
          if (/^\s*(endpoints\.[A-Za-z0-9_]+\(|app\.[A-Za-z0-9_]+\(|builder\.[A-Za-z0-9_]+\(|public\s+(class|interface|record|void|async)|using\s+[A-Za-z0-9_.]+;|\/\/\s+[A-Za-z0-9_]+|\[(Route|HttpGet|HttpPost))/.test(text)) {
            rawCodeInProse.push({ file: f, page: pi + 1, block: bi, sample: b.lines.slice(0, 2) });
          }
        }
      });
    });
  });
}

console.log('Raw code in prose count (sections + cheatsheets):', rawCodeInProse.length);
if (rawCodeInProse.length > 0) {
  console.log('Samples:', rawCodeInProse.slice(0, 5));
}
