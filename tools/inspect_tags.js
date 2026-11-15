import fs from 'fs';

const sec03 = fs.readFileSync('sections/section-03.html', 'utf8');
const matches03 = [...sec03.matchAll(/(.{0,50}&lt;p&gt;.{0,50})/g)];
console.log('Section 03 samples:');
matches03.forEach(m => console.log('  ', m[1]));

const sec08 = fs.readFileSync('sections/section-08.html', 'utf8');
const matches08 = [...sec08.matchAll(/(.{0,50}&lt;(?:p|span)&gt;.{0,50})/g)];
console.log('Section 08 samples:');
matches08.slice(0, 5).forEach(m => console.log('  ', m[1]));
