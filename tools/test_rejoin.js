import fs from 'fs';
import path from 'path';

// Let's test detection of code-like prose lines
function isCodeProse(text) {
  const t = text.trim();
  if (!t) return false;
  // If it's a known non-code transition or heading
  if (/^(Detailed Explanation|Key Points to Remember|Explanation|In this code|In this example|How It Works|Note:|Warning:|Tip:|Deep Dive:)/i.test(t)) {
    return false;
  }
  // Definite code continuation or snippet
  if (/EndpointFilterInvocationDelegate\s+next\)/.test(t)) return true;
  if (/^(if|else|else\s+if|switch|case|default:|try|catch|finally|using|return|throw|await)\b/.test(t)) return true;
  if (/^(endpoints|app|builder|services|options|context)\.[A-Za-z0-9_]+/.test(t)) return true;
  if (/^\"[A-Za-z0-9_]+\":\s*/.test(t)) return true;
  if (/^(new\s+[A-Za-z0-9_<>]+|public|private|protected|internal|static|async|void)\b/.test(t)) return true;
  if (/^[A-Za-z0-9_.]+\s*=\s*.+;?$/.test(t)) return true;
  if (/^[A-Za-z0-9_.]+\(.*\);?$/.test(t)) return true;
  if (t.endsWith(';') || t.endsWith('{') || t.endsWith('}') || t.endsWith('=>') || t.endsWith(',')) return true;
  return false;
}

console.log('Test isCodeProse:');
console.log('EndpointFilterInvocationDelegate next):', isCodeProse('EndpointFilterInvocationDelegate next)'));
console.log('if (1 == 1):', isCodeProse('if (1 == 1)'));
console.log('else:', isCodeProse('else'));
console.log('endpoints.MapGet("map1", async (context) =>:', isCodeProse('endpoints.MapGet("map1", async (context) =>'));
console.log('"commandName": "IISExpress",:', isCodeProse('"commandName": "IISExpress",'));
console.log('Explanation:</p> <ul>...:', isCodeProse('Explanation:</p> <ul>...'));
