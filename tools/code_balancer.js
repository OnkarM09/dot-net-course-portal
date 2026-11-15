export function countCodeBraces(code) {
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

export function balanceCodeBlock(code) {
  if (!code) return '';
  let lines = code.split('\n');
  const fixedLines = [];

  for (let line of lines) {
    const cIdx = line.indexOf('//');
    if (cIdx !== -1) {
      const codePart = line.slice(0, cIdx);
      const commentPart = line.slice(cIdx);
      const match = commentPart.match(/^(\/\/[^}]*?)\s*([\}\]\);]+(?:\s*[\}\]\);]+)*)\s*$/);
      if (match) {
        const pureComment = match[1].trim();
        const trailingCode = match[2].trim();
        if (codePart.trim()) {
          fixedLines.push(codePart.trimEnd() + ' ' + trailingCode + ' ' + pureComment);
        } else {
          fixedLines.push(pureComment);
          fixedLines.push(trailingCode);
        }
        continue;
      }
    }
    fixedLines.push(line);
  }

  // Handle wrapped multi-line comment continuation for example JSON
  for (let i = 0; i < fixedLines.length; i++) {
    if (i > 0 && fixedLines[i - 1].trim().startsWith('//') && fixedLines[i - 1].includes('{') && fixedLines[i].includes('}')) {
      if (!fixedLines[i].trim().startsWith('//')) {
        fixedLines[i] = '// ' + fixedLines[i].trim();
      }
    }
  }

  let { opens, closes } = countCodeBraces(fixedLines.join('\n'));

  // Clean leading fake closing braces
  while (closes > opens && fixedLines.length > 0) {
    const first = fixedLines[0].trim();
    if (first === '}' || first === '};' || first === '});' || first === '} }' || first === '} },') {
      fixedLines.shift();
      const diff = (first.match(/\}/g) || []).length;
      closes -= diff;
      continue;
    }
    const leadMatch = fixedLines[0].match(/^\s*([\}\s,]+)(.*)$/);
    if (leadMatch && leadMatch[1].includes('}')) {
      const braceCount = (leadMatch[1].match(/\}/g) || []).length;
      if (closes - braceCount >= opens) {
        fixedLines[0] = leadMatch[2];
        closes -= braceCount;
        continue;
      }
    }

    const last = fixedLines[fixedLines.length - 1].trim();
    if (last === '}' || last === '};' || last === '});') {
      fixedLines.pop();
      closes--;
      continue;
    }

    break;
  }

  // Clean duplicate consecutive opening braces e.g. '{' followed by '{' without nested closing
  for (let i = 0; i < fixedLines.length - 1 && opens > closes; i++) {
    if (fixedLines[i].trim() === '{' && fixedLines[i + 1].trim() === '{') {
      fixedLines.splice(i + 1, 1);
      opens--;
      i--;
    }
  }

  // If closes > opens, scan for declarations/signatures where opening '{' was stripped and restore it
  if (closes > opens) {
    const signaturePats = [
      /^(public|private|protected|internal|static|async|abstract|override|virtual|sealed)?\s*(class|interface|record|struct|enum)\s+[A-Za-z0-9_<>]+(?:\s*:[^{]*)?$/,
      /^(public|private|protected|internal|static|async|virtual|override|abstract)?\s*[A-Za-z0-9_<>\[\]\?]+\s+[A-Za-z0-9_]+\s*\([^\)]*\)$/,
      /^(if|else\s+if|for|foreach|while|switch)\s*\(.*\)$/,
      /^(else|try|finally)$/,
      /^catch(?:\s*\(.*\))?$/,
      /^(builder|app|services|options|endpoints)\.[A-Za-z0-9_]+\(.*=>\s*$/
    ];

    for (let i = 0; i < fixedLines.length && closes > opens; i++) {
      const lineTrim = fixedLines[i].trim();
      const nextLineTrim = i + 1 < fixedLines.length ? fixedLines[i + 1].trim() : '';

      if (lineTrim.endsWith('{')) continue;

      const matchesSig = signaturePats.some(p => p.test(lineTrim));
      if (matchesSig && !nextLineTrim.startsWith('{')) {
        const indentMatch = fixedLines[i].match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        fixedLines.splice(i + 1, 0, indent + '{');
        opens++;
        i++;
      }
    }
  }

  // Fallbacks if still unbalanced
  while (closes > opens) {
    fixedLines.unshift('{');
    opens++;
  }

  while (opens > closes) {
    fixedLines.push('}');
    closes++;
  }

  return fixedLines.join('\n');
}
