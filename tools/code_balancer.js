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

  let { opens, closes } = countCodeBraces(fixedLines.join('\n'));

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
