import fs from 'fs';

const filesToClean = [
  'data/extracted/section-05.json',
  'data/extracted/section-07.json'
];

filesToClean.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/EmployeeName=harsha/g, 'EmployeeName=john');
    content = content.replace(/author=harsha/g, 'author=john');
    content = content.replace(/\"harsha\"/g, '"john"');
    content = content.replace(/profile - harsha/g, 'profile - john');
    content = content.replace(/harsha/gi, 'john');
    content = content.replace(/vardhan/gi, '');
    fs.writeFileSync(f, content, 'utf8');
    console.log(`✓ Sanitized ${f}`);
  }
});
