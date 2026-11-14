import fs from 'fs';
import path from 'path';

function hexToRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function parseRgba(str) {
  const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (m) {
    return {
      r: parseInt(m[1], 10),
      g: parseInt(m[2], 10),
      b: parseInt(m[3], 10),
      a: m[4] !== undefined ? parseFloat(m[4]) : 1
    };
  }
  return null;
}

function blend(fgRgba, bgRgb) {
  const a = fgRgba.a;
  return {
    r: Math.round(fgRgba.r * a + bgRgb.r * (1 - a)),
    g: Math.round(fgRgba.g * a + bgRgb.g * (1 - a)),
    b: Math.round(fgRgba.b * a + bgRgb.b * (1 - a))
  };
}

function resolveColor(colorStr, bgRgb) {
  if (colorStr.startsWith('#')) {
    return hexToRgb(colorStr);
  }
  const rgba = parseRgba(colorStr);
  if (rgba) {
    if (rgba.a < 1 && bgRgb) {
      return blend(rgba, bgRgb);
    }
    return { r: rgba.r, g: rgba.g, b: rgba.b };
  }
  return hexToRgb('#000000');
}

function getLuminance(rgb) {
  const a = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(fgHexOrRgb, bgHexOrRgb) {
  const bg = typeof bgHexOrRgb === 'string' ? hexToRgb(bgHexOrRgb) : bgHexOrRgb;
  const fg = typeof fgHexOrRgb === 'string' ? resolveColor(fgHexOrRgb, bg) : fgHexOrRgb;
  const lum1 = getLuminance(fg);
  const lum2 = getLuminance(bg);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Parse tokens from docs.css
const cssContent = fs.readFileSync('assets/css/docs.css', 'utf8');

function extractVar(block, varName) {
  const reg = new RegExp(`${varName}:\\s*([^;]+);`);
  const m = block.match(reg);
  return m ? m[1].trim() : null;
}

function extractClassColor(css, selector) {
  const escaped = selector.replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\./g, '\\.');
  const reg = new RegExp(`${escaped}\\s*\\{[^}]*color:\\s*([^;]+);`);
  const m = css.match(reg);
  return m ? m[1].trim() : null;
}

const rootBlock = cssContent.match(/:root\s*\{([\s\S]*?)\}/)?.[1] || '';
const lightBlock = cssContent.match(/\[data-theme="light"\]\s*\{([\s\S]*?)\}/)?.[1] || '';

const darkTokens = {
  bg_app: extractVar(rootBlock, '--bg-app') || '#0f172a',
  bg_surface: extractVar(rootBlock, '--bg-surface') || '#1e293b',
  text_main: extractVar(rootBlock, '--text-main') || '#f8fafc',
  text_muted: extractVar(rootBlock, '--text-muted') || '#94a3b8',
  accent_primary: extractVar(rootBlock, '--accent-primary') || '#38bdf8',
  code_bg: extractVar(rootBlock, '--code-bg') || '#0b0f19',
  code_text: extractVar(rootBlock, '--code-text') || '#e2e8f0',
  token_keyword: extractClassColor(cssContent, '.token-keyword') || '#f472b6',
  token_type: extractClassColor(cssContent, '.token-type') || '#38bdf8',
  token_string: extractClassColor(cssContent, '.token-string') || '#4ade80',
  token_comment: extractClassColor(cssContent, '.token-comment') || '#94a3b8',
  token_number: extractClassColor(cssContent, '.token-number') || '#fb923c',
  token_method: extractClassColor(cssContent, '.token-method') || '#fbbf24',
  token_property: extractClassColor(cssContent, '.token-property') || '#c084fc',
  callout_tip_badge: extractVar(rootBlock, '--callout-tip-badge') || '#34d399',
  callout_warning_badge: extractVar(rootBlock, '--callout-warning-badge') || '#fbbf24',
  callout_original_badge: extractVar(rootBlock, '--callout-original-badge') || '#60a5fa',
  callout_deepdive_badge: extractVar(rootBlock, '--callout-deepdive-badge') || '#c084fc'
};

const lightTokens = {
  bg_app: extractVar(lightBlock, '--bg-app') || '#f8fafc',
  bg_surface: extractVar(lightBlock, '--bg-surface') || '#ffffff',
  text_main: extractVar(lightBlock, '--text-main') || '#0f172a',
  text_muted: extractVar(lightBlock, '--text-muted') || '#475569',
  accent_primary: extractVar(lightBlock, '--accent-primary') || '#0369a1',
  code_bg: extractVar(lightBlock, '--code-bg') || '#f1f5f9',
  code_text: extractVar(lightBlock, '--code-text') || '#0f172a',
  token_keyword: extractClassColor(cssContent, '[data-theme="light"] .token-keyword') || '#be185d',
  token_type: extractClassColor(cssContent, '[data-theme="light"] .token-type') || '#0369a1',
  token_string: extractClassColor(cssContent, '[data-theme="light"] .token-string') || '#15803d',
  token_comment: extractClassColor(cssContent, '[data-theme="light"] .token-comment') || '#475569',
  token_number: extractClassColor(cssContent, '[data-theme="light"] .token-number') || '#c2410c',
  token_method: extractClassColor(cssContent, '[data-theme="light"] .token-method') || '#b45309',
  token_property: extractClassColor(cssContent, '[data-theme="light"] .token-property') || '#7e22ce',
  callout_tip_badge: extractVar(lightBlock, '--callout-tip-badge') || '#047857',
  callout_warning_badge: extractVar(lightBlock, '--callout-warning-badge') || '#b45309',
  callout_original_badge: extractVar(lightBlock, '--callout-original-badge') || '#1d4ed8',
  callout_deepdive_badge: extractVar(lightBlock, '--callout-deepdive-badge') || '#7e22ce'
};

function runAudit() {
  const results = {
    dark_theme: [],
    light_theme: [],
    violations: []
  };

  const darkPairs = [
    { name: 'Text Main on App Bg', fg: darkTokens.text_main, bg: darkTokens.bg_app, req: 4.5 },
    { name: 'Text Main on Surface Bg', fg: darkTokens.text_main, bg: darkTokens.bg_surface, req: 4.5 },
    { name: 'Text Muted on App Bg', fg: darkTokens.text_muted, bg: darkTokens.bg_app, req: 4.5 },
    { name: 'Text Muted on Surface Bg', fg: darkTokens.text_muted, bg: darkTokens.bg_surface, req: 4.5 },
    { name: 'Accent Primary on App Bg', fg: darkTokens.accent_primary, bg: darkTokens.bg_app, req: 4.5 },
    { name: 'Accent Primary on Surface Bg', fg: darkTokens.accent_primary, bg: darkTokens.bg_surface, req: 4.5 },
    { name: 'Code Text on Code Bg', fg: darkTokens.code_text, bg: darkTokens.code_bg, req: 4.5 },
    { name: 'Code Keyword on Code Bg', fg: darkTokens.token_keyword, bg: darkTokens.code_bg, req: 4.5 },
    { name: 'Code Type on Code Bg', fg: darkTokens.token_type, bg: darkTokens.code_bg, req: 4.5 },
    { name: 'Code String on Code Bg', fg: darkTokens.token_string, bg: darkTokens.code_bg, req: 4.5 },
    { name: 'Code Comment on Code Bg', fg: darkTokens.token_comment, bg: darkTokens.code_bg, req: 4.5 },
    { name: 'Code Number on Code Bg', fg: darkTokens.token_number, bg: darkTokens.code_bg, req: 4.5 },
    { name: 'Code Method on Code Bg', fg: darkTokens.token_method, bg: darkTokens.code_bg, req: 4.5 },
    { name: 'Code Property on Code Bg', fg: darkTokens.token_property, bg: darkTokens.code_bg, req: 4.5 },
    { name: 'Callout Tip Badge on Surface', fg: darkTokens.callout_tip_badge, bg: darkTokens.bg_surface, req: 3.0 },
    { name: 'Callout Warning Badge on Surface', fg: darkTokens.callout_warning_badge, bg: darkTokens.bg_surface, req: 3.0 },
    { name: 'Callout Original Badge on Surface', fg: darkTokens.callout_original_badge, bg: darkTokens.bg_surface, req: 3.0 },
    { name: 'Callout Deepdive Badge on Surface', fg: darkTokens.callout_deepdive_badge, bg: darkTokens.bg_surface, req: 3.0 }
  ];

  darkPairs.forEach(p => {
    const cr = getContrast(p.fg, p.bg);
    const pass = cr >= p.req;
    const item = {
      pair: p.name,
      fg: p.fg,
      bg: p.bg,
      contrast_ratio: parseFloat(cr.toFixed(2)),
      required_ratio: p.req,
      pass
    };
    results.dark_theme.push(item);
    if (!pass) results.violations.push({ theme: 'dark', ...item });
  });

  const lightPairs = [
    { name: 'Text Main on App Bg', fg: lightTokens.text_main, bg: lightTokens.bg_app, req: 4.5 },
    { name: 'Text Main on Surface Bg', fg: lightTokens.text_main, bg: lightTokens.bg_surface, req: 4.5 },
    { name: 'Text Muted on App Bg', fg: lightTokens.text_muted, bg: lightTokens.bg_app, req: 4.5 },
    { name: 'Text Muted on Surface Bg', fg: lightTokens.text_muted, bg: lightTokens.bg_surface, req: 4.5 },
    { name: 'Accent Primary on App Bg', fg: lightTokens.accent_primary, bg: lightTokens.bg_app, req: 4.5 },
    { name: 'Accent Primary on Surface Bg', fg: lightTokens.accent_primary, bg: lightTokens.bg_surface, req: 4.5 },
    { name: 'Code Text on Code Bg', fg: lightTokens.code_text, bg: lightTokens.code_bg, req: 4.5 },
    { name: 'Code Keyword on Code Bg', fg: lightTokens.token_keyword, bg: lightTokens.code_bg, req: 4.5 },
    { name: 'Code Type on Code Bg', fg: lightTokens.token_type, bg: lightTokens.code_bg, req: 4.5 },
    { name: 'Code String on Code Bg', fg: lightTokens.token_string, bg: lightTokens.code_bg, req: 4.5 },
    { name: 'Code Comment on Code Bg', fg: lightTokens.token_comment, bg: lightTokens.code_bg, req: 4.5 },
    { name: 'Code Number on Code Bg', fg: lightTokens.token_number, bg: lightTokens.code_bg, req: 4.5 },
    { name: 'Code Method on Code Bg', fg: lightTokens.token_method, bg: lightTokens.code_bg, req: 4.5 },
    { name: 'Code Property on Code Bg', fg: lightTokens.token_property, bg: lightTokens.code_bg, req: 4.5 },
    { name: 'Callout Tip Badge on Surface', fg: lightTokens.callout_tip_badge, bg: lightTokens.bg_surface, req: 3.0 },
    { name: 'Callout Warning Badge on Surface', fg: lightTokens.callout_warning_badge, bg: lightTokens.bg_surface, req: 3.0 },
    { name: 'Callout Original Badge on Surface', fg: lightTokens.callout_original_badge, bg: lightTokens.bg_surface, req: 3.0 },
    { name: 'Callout Deepdive Badge on Surface', fg: lightTokens.callout_deepdive_badge, bg: lightTokens.bg_surface, req: 3.0 }
  ];

  lightPairs.forEach(p => {
    const cr = getContrast(p.fg, p.bg);
    const pass = cr >= p.req;
    const item = {
      pair: p.name,
      fg: p.fg,
      bg: p.bg,
      contrast_ratio: parseFloat(cr.toFixed(2)),
      required_ratio: p.req,
      pass
    };
    results.light_theme.push(item);
    if (!pass) results.violations.push({ theme: 'light', ...item });
  });

  return results;
}

const audit = runAudit();
const report = {
  timestamp: new Date().toISOString(),
  wcag_level: 'WCAG 2.2 AA',
  status: audit.violations.length === 0 ? 'PASSED' : 'FAILED',
  violations_count: audit.violations.length,
  violations: audit.violations,
  dark_theme: audit.dark_theme,
  light_theme: audit.light_theme
};

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/contrast-report.json', JSON.stringify(report, null, 2), 'utf8');

console.log(`--- Contrast Audit ---`);
console.log(`Status: ${report.status}`);
console.log(`Violations: ${report.violations_count}`);
if (audit.violations.length > 0) {
  audit.violations.forEach(v => {
    console.log(`  FAIL [${v.theme}]: ${v.pair} - ${v.contrast_ratio}:1 (expected >= ${v.required_ratio}:1)`);
  });
} else {
  console.log(`✓ All 36 dark & light token pairs pass WCAG 2.2 AA contrast requirements!`);
}
