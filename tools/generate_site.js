import fs from 'fs';
import path from 'path';
import { balanceCodeBlock, countCodeBraces } from './code_balancer.js';

const MANIFEST_FILE = 'data/section-manifest.json';
const EXTRACTED_DIR = 'data/extracted';
const SECTIONS_DIR = 'sections';
const SEARCH_INDEX_FILE = 'assets/js/search-index.js';

// Load secrets for exclusion checking
let disallowedNames = ['Harsha', 'Vardhan', 'Harsha Vardhan'];
if (fs.existsSync('config/audit-secrets.json')) {
  try {
    const secrets = JSON.parse(fs.readFileSync('config/audit-secrets.json', 'utf8'));
    if (secrets.disallowed_names) disallowedNames = secrets.disallowed_names;
  } catch (e) {}
}

function redactForbidden(text) {
  if (!text) return '';
  let result = text;
  for (const name of disallowedNames) {
    const reg = new RegExp(`\\b${name}\\b`, 'gi');
    result = result.replace(reg, '');
  }
  return result.replace(/WEB ACADEMY BY\s*/gi, '');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

function detectLanguage(code) {
  const t = (code || '').trim();
  if (t.startsWith('<') && (t.includes('</') || t.includes('/>') || t.includes('@model') || t.includes('@inject'))) {
    return { lang: 'razor', label: 'Razor / HTML' };
  }
  if (t.startsWith('{') && t.includes('":') && (t.endsWith('}') || t.endsWith('},'))) {
    return { lang: 'json', label: 'JSON' };
  }
  if (t.startsWith('dotnet ') || t.startsWith('npm ') || t.startsWith('curl ') || t.startsWith('git ')) {
    return { lang: 'bash', label: 'CLI' };
  }
  if (t.includes('import {') || t.includes('export class') || t.includes('@Component')) {
    return { lang: 'typescript', label: 'TypeScript' };
  }
  return { lang: 'csharp', label: 'C#' };
}

function formatProseText(text) {
  if (!text) return '';
  let safe = escapeHtml(redactForbidden(text));

  // Fix double escaped tags if any
  safe = safe
    .replace(/&lt;code&gt;/g, '<code>')
    .replace(/&lt;\/code&gt;/g, '</code>')
    .replace(/&lt;p&gt;/g, '<p>')
    .replace(/&lt;\/p&gt;/g, '</p>')
    .replace(/&lt;span&gt;/g, '<span>')
    .replace(/&lt;\/span&gt;/g, '</span>')
    .replace(/&lt;strong&gt;/g, '<strong>')
    .replace(/&lt;\/strong&gt;/g, '</strong>')
    .replace(/&lt;em&gt;/g, '<em>')
    .replace(/&lt;\/em&gt;/g, '</em>');

  // Wrap HTML tag mentions in <code>
  safe = safe.replace(/&lt;(table|div|span|p|a|form|input|button|header|footer|nav|ul|ol|li)&gt;/gi, '<code>&lt;$1&gt;</code>');
  safe = safe.replace(/&lt;\/(table|div|span|p|a|form|input|button|header|footer|nav|ul|ol|li)&gt;/gi, '<code>&lt;/$1&gt;</code>');

  // Wrap keywords in <code> if not already wrapped
  const inlineCodeKeywords = [
    'Program.cs', 'Startup.cs', 'appsettings.json', 'launchSettings.json',
    'MapGet', 'MapPost', 'MapPut', 'MapDelete', 'MapGroup', 'UseRouting', 'UseEndpoints',
    'IResult', 'IActionResult', 'DbContext', '[ApiController]', '[Route]', '[HttpGet]', '[HttpPost]'
  ];
  for (const kw of inlineCodeKeywords) {
    const escaped = escapeHtml(kw);
    const reg = new RegExp(`(?<!<code>)\\b${escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?!<\\/code>)`, 'g');
    safe = safe.replace(reg, `<code>${escaped}</code>`);
  }

  return safe;
}

function renderListBlock(items) {
  if (!items || items.length === 0) return '';
  const cleanedItems = items
    .map(it => {
      let clean = redactForbidden(it).trim();
      clean = clean.replace(/^([•▪➢✓●○\*\-]|o|&bull;)\s+/, '').trim();
      clean = clean.replace(/^[•▪➢✓●○]\s*/, '').trim();
      clean = clean.replace(/[\s\n•▪➢✓●○\*\-]+$/, '').trim();
      if (/^[a-z]\s+\(/.test(clean)) {
        clean = `<code>${clean.charAt(0)}</code>` + clean.slice(1);
      }
      return clean;
    })
    .filter(Boolean);
  if (cleanedItems.length === 0) return '';

  const isNumbered = cleanedItems.every(it => /^\d+[\.\)]\s+/.test(it));
  const tag = isNumbered ? 'ol' : 'ul';
  let html = `<${tag}>\n`;
  for (const it of cleanedItems) {
    const textWithoutNum = isNumbered ? it.replace(/^\d+[\.\)]\s+/, '') : it;
    html += `  <li>${formatProseText(textWithoutNum)}</li>\n`;
  }
  html += `</${tag}>\n`;
  return html;
}

function renderProseBlock(text) {
  let clean = redactForbidden(text).trim();
  if (!clean) return '';

  // Skip duplicated banner or cheatsheet title
  if (/^Section\s*\d+\s*[-–—].*Cheat\s*Sheet/i.test(clean) ||
      /ASP\.NET Core - True Ultimate Guide/i.test(clean)) {
    return '';
  }

  // Promote recurring transitions into h3 subheadings
  if (/^(Detailed Explanation of Code|Key Points to Remember|Basic Example|Example|Deep Dive & Internals|Architecture Overview|Summary|Best Practices):?$/i.test(clean)) {
    return `<h3>${escapeHtml(clean.replace(/:$/, ''))}</h3>\n`;
  }

  // Capitalize opening letter if lowercase (unless URL)
  if (/^[a-z]/.test(clean) && !clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return `<p>${formatProseText(clean)}</p>\n`;
}

function renderCodeBlock(code) {
  let balanced = balanceCodeBlock(code);
  balanced = balanced.replace(/\n\s*In this code:\s*$/i, '');
  const { lang, label } = detectLanguage(balanced);
  const cleanCode = redactForbidden(balanced).trim();

  return `
    <div class="code-block">
      <div class="code-toolbar">
        <span class="language-label">${escapeHtml(label)}</span>
        <button class="copy-code-btn" type="button" aria-label="Copy code">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span class="copy-feedback">Copy</span>
        </button>
      </div>
      <pre><code class="language-${lang}">${escapeHtml(cleanCode)}</code></pre>
    </div>
  `;
}

function renderCallout(type, title, text) {
  const cleanText = formatProseText(text);
  const cleanTitle = escapeHtml(redactForbidden(title));

  return `
    <div class="callout callout-${type}">
      <div class="callout-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <span>${cleanTitle}</span>
      </div>
      <div class="callout-content">
        <p>${cleanText}</p>
      </div>
    </div>
  `;
}

function renderDiagram(title, text) {
  const clean = escapeHtml(redactForbidden(text));
  return `
    <div class="diagram-container">
      <div class="diagram-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
        <span>${escapeHtml(title || 'Architecture & Flow Diagram')}</span>
      </div>
      <pre class="diagram-pre">${clean}</pre>
    </div>
  `;
}

// Convert blocks into structured HTML article
function generateArticleContent(secJson, cheatJson, searchEntries, secNum, secTitle, modTitle) {
  const tocItems = [];
  let html = '';
  const usedSlugs = new Set();

  function getUniqueSlug(base) {
    let slug = slugify(base);
    if (!slug) slug = 'section-topic';
    let candidate = slug;
    let count = 1;
    while (usedSlugs.has(candidate)) {
      candidate = `${slug}-${count++}`;
    }
    usedSlugs.add(candidate);
    return candidate;
  }

  // Flatten blocks from primary note pages
  const allBlocks = [];
  secJson.pages.forEach(p => {
    p.blocks.forEach(b => {
      allBlocks.push({ ...b, pageNum: p.page_number });
    });
  });

  // Merge consecutive code blocks, list items, and continuation prose
  const mergedBlocks = [];
  let curCode = null;
  let curList = null;
  let curProse = null;

  function flushAcc() {
    if (curCode) {
      curCode.text = curCode.lines.join('\n');
      mergedBlocks.push(curCode);
      curCode = null;
    }
    if (curList) {
      mergedBlocks.push(curList);
      curList = null;
    }
    if (curProse) {
      mergedBlocks.push(curProse);
      curProse = null;
    }
  }

  for (const b of allBlocks) {
    if (b.type === 'banner_header') {
      continue; // Handled by top banner
    }

    if (b.type === 'code') {
      if (curList) { mergedBlocks.push(curList); curList = null; }
      if (curProse) { mergedBlocks.push(curProse); curProse = null; }
      if (!curCode) {
        curCode = { type: 'code', lines: [...b.lines], pageNum: b.pageNum };
      } else {
        curCode.lines.push(...b.lines);
      }
      continue;
    }

    if (curCode) {
      curCode.text = curCode.lines.join('\n');
      mergedBlocks.push(curCode);
      curCode = null;
    }

    if (b.type === 'list_item') {
      if (curProse) { mergedBlocks.push(curProse); curProse = null; }
      if (!curList) {
        curList = { type: 'list', items: [b.text], pageNum: b.pageNum };
      } else {
        curList.items.push(b.text);
      }
      continue;
    }

    if (curList) {
      mergedBlocks.push(curList);
      curList = null;
    }

    if (b.type === 'prose') {
      const nextTrim = b.text.trim();
      const startsLower = /^[a-z]/.test(nextTrim);

      if (curList && startsLower) {
        curList.items[curList.items.length - 1] += ' ' + nextTrim;
        continue;
      }

      if (curList) {
        mergedBlocks.push(curList);
        curList = null;
      }

      if (!curProse) {
        curProse = { type: 'prose', text: b.text, pageNum: b.pageNum };
      } else {
        const prevTrim = curProse.text.trim();
        const endsUnfinished = !/[.?!:]$/.test(prevTrim) || /[,;\-–—]$/.test(prevTrim) || /\b(to|your|the|a|an|of|in|for|with|and|or|that|which|is|are|as|by|from|at)$/i.test(prevTrim);
        if (endsUnfinished || startsLower) {
          curProse.text += ' ' + nextTrim;
        } else {
          mergedBlocks.push(curProse);
          curProse = { type: 'prose', text: b.text, pageNum: b.pageNum };
        }
      }
      continue;
    }

    if (curProse) {
      mergedBlocks.push(curProse);
      curProse = null;
    }

    mergedBlocks.push(b);
  }

  flushAcc();

  // Render merged blocks
  for (const b of mergedBlocks) {
    if (b.type === 'heading') {
      const headingText = redactForbidden(b.text).trim();
      if (!headingText) continue;

      const slug = getUniqueSlug(headingText);
      const isSubheading = /^\d+\./.test(headingText) ||
        /^(Detailed Explanation|Key Points|Basic Example|Example|Architecture Overview|Best Practices)/i.test(headingText);
      const tag = isSubheading ? 'h3' : 'h2';
      const level = isSubheading ? 3 : 2;

      tocItems.push({ id: slug, title: headingText, level: level });

      searchEntries.push({
        id: `${secNum}-${slug}`,
        title: headingText,
        sectionNum: secNum,
        sectionTitle: `Section ${secNum}: ${secTitle}`,
        moduleTitle: modTitle,
        url: `section-${secNum}.html#${slug}`,
        keywords: [headingText, secTitle, modTitle],
        snippet: `Section ${secNum} topic: ${headingText}`
      });

      html += `\n<${tag} id="${slug}">${escapeHtml(headingText)}</${tag}>\n`;
    } else if (b.type === 'code') {
      html += renderCodeBlock(b.text);
    } else if (b.type === 'list') {
      html += renderListBlock(b.items);
    } else if (b.type === 'callout') {
      const t = b.text.trim();
      let calloutType = 'original';
      let title = 'Core Concept';
      if (/warning:/i.test(t)) {
        calloutType = 'warning';
        title = 'Important Warning';
      } else if (/tip:/i.test(t)) {
        calloutType = 'tip';
        title = 'Best Practice & Tip';
      } else if (/deep\s*dive:/i.test(t)) {
        calloutType = 'deepdive';
        title = 'Deep Dive & Internals';
      }
      html += renderCallout(calloutType, title, t);
    } else if (b.type === 'diagram') {
      html += renderDiagram('Architecture & Concept Diagram', b.text);
    } else if (b.type === 'prose') {
      html += renderProseBlock(b.text);
    }
  }

  // Integrate Cheatsheet content if available
  if (cheatJson && cheatJson.pages) {
    const cheatSlug = getUniqueSlug('cheat-sheet-quick-reference');
    tocItems.push({ id: cheatSlug, title: 'Cheat Sheet & Quick Reference', level: 2 });

    searchEntries.push({
      id: `${secNum}-${cheatSlug}`,
      title: `${secTitle} — Cheat Sheet & Quick Reference`,
      sectionNum: secNum,
      sectionTitle: `Section ${secNum}: ${secTitle}`,
      moduleTitle: modTitle,
      url: `section-${secNum}.html#${cheatSlug}`,
      keywords: ['Cheat Sheet', 'Quick Reference', secTitle, modTitle],
      snippet: `Comprehensive Cheat Sheet reference matrix and key takeaways for Section ${secNum}.`
    });

    html += `\n<hr style="margin: 3rem 0 2rem 0; border: none; border-top: 1px solid var(--border-subtle);" />\n`;
    html += `<section class="cheatsheet-section" aria-labelledby="${cheatSlug}">\n`;
    html += `  <h2 id="${cheatSlug}">Cheat Sheet &amp; Quick Reference</h2>\n`;
    html += `  <p>Essential syntax reference matrices, core definitions, and key takeaways extracted from the companion Cheat Sheet.</p>\n`;

    // Flatten and merge cheatsheet blocks
    const allCheatBlocks = [];
    cheatJson.pages.forEach(p => {
      p.blocks.forEach(cb => {
        allCheatBlocks.push({ ...cb, pageNum: p.page_number });
      });
    });

    const mergedCheatBlocks = [];
    let curCheatCode = null;
    let curCheatList = null;
    let curCheatProse = null;

    function flushCheatAcc() {
      if (curCheatCode) {
        curCheatCode.text = curCheatCode.lines.join('\n');
        mergedCheatBlocks.push(curCheatCode);
        curCheatCode = null;
      }
      if (curCheatList) {
        mergedCheatBlocks.push(curCheatList);
        curCheatList = null;
      }
      if (curCheatProse) {
        mergedCheatBlocks.push(curCheatProse);
        curCheatProse = null;
      }
    }

    for (const cb of allCheatBlocks) {
      if (cb.type === 'banner_header') continue;

      if (cb.type === 'code') {
        if (curCheatList) { mergedCheatBlocks.push(curCheatList); curCheatList = null; }
        if (curCheatProse) { mergedCheatBlocks.push(curCheatProse); curCheatProse = null; }
        if (!curCheatCode) {
          curCheatCode = { type: 'code', lines: [...cb.lines], pageNum: cb.pageNum };
        } else {
          curCheatCode.lines.push(...cb.lines);
        }
        continue;
      }

      if (curCheatCode) {
        curCheatCode.text = curCheatCode.lines.join('\n');
        mergedCheatBlocks.push(curCheatCode);
        curCheatCode = null;
      }

      if (cb.type === 'list_item') {
        if (curCheatProse) { mergedCheatBlocks.push(curCheatProse); curCheatProse = null; }
        if (!curCheatList) {
          curCheatList = { type: 'list', items: [cb.text], pageNum: cb.pageNum };
        } else {
          curCheatList.items.push(cb.text);
        }
        continue;
      }

      if (curCheatList) {
        mergedCheatBlocks.push(curCheatList);
        curCheatList = null;
      }

      if (cb.type === 'prose') {
        const nextTrim = cb.text.trim();
        const startsLower = /^[a-z]/.test(nextTrim);

        if (curCheatList && startsLower) {
          curCheatList.items[curCheatList.items.length - 1] += ' ' + nextTrim;
          continue;
        }

        if (curCheatList) {
          mergedCheatBlocks.push(curCheatList);
          curCheatList = null;
        }

        if (!curCheatProse) {
          curCheatProse = { type: 'prose', text: cb.text, pageNum: cb.pageNum };
        } else {
          const prevTrim = curCheatProse.text.trim();
          const endsUnfinished = !/[.?!:]$/.test(prevTrim) || /[,;\-–—]$/.test(prevTrim) || /\b(to|your|the|a|an|of|in|for|with|and|or|that|which|is|are|as|by|from|at)$/i.test(prevTrim);
          if (endsUnfinished || startsLower) {
            curCheatProse.text += ' ' + nextTrim;
          } else {
            mergedCheatBlocks.push(curCheatProse);
            curCheatProse = { type: 'prose', text: cb.text, pageNum: cb.pageNum };
          }
        }
        continue;
      }

      if (curCheatProse) {
        mergedCheatBlocks.push(curCheatProse);
        curCheatProse = null;
      }

      mergedCheatBlocks.push(cb);
    }

    flushCheatAcc();

    // Render merged cheatsheet blocks
    for (const cb of mergedCheatBlocks) {
      if (cb.type === 'heading') {
        const ht = redactForbidden(cb.text).trim();
        if (ht) {
          const subSlug = getUniqueSlug(ht);
          html += `  <h3 id="${subSlug}">${escapeHtml(ht)}</h3>\n`;
        }
      } else if (cb.type === 'code') {
        html += renderCodeBlock(cb.text);
      } else if (cb.type === 'list') {
        html += renderListBlock(cb.items);
      } else if (cb.type === 'prose') {
        html += renderProseBlock(cb.text);
      } else if (cb.type === 'diagram') {
        html += renderDiagram('Cheat Sheet Architecture Diagram', cb.text);
      }
    }

    html += `</section>\n`;
  }

  return { html, tocItems };
}

// Build Left Sidebar HTML for any page
function buildSidebar(manifest, activeSecStr, isRoot = false) {
  const prefix = isRoot ? 'sections/' : '';
  const homeLink = isRoot ? 'index.html' : '../index.html';

  let html = `
    <aside class="docs-sidebar" aria-label="Course Navigation">
      <div class="sidebar-top-bar">
        <span class="sidebar-top-title">Curriculum</span>
        <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Collapse Sidebar" aria-label="Collapse Navigation Sidebar" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
          <span>Collapse</span>
        </button>
      </div>

      <div class="sidebar-search-box">
        <input type="text" class="sidebar-filter-input" placeholder="Filter sections..." aria-label="Filter sidebar sections" />
      </div>

      <div style="margin-bottom: 1rem;">
        <a href="${homeLink}" class="sidebar-link" style="color: var(--accent-primary); font-weight: 600;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Return to Dashboard</span>
        </a>
      </div>
  `;

  for (const mod of manifest.modules) {
    const modSections = manifest.sections.filter(s => mod.sections.includes(s.normalized_section));
    let linksHtml = '';

    for (const sec of modSections) {
      const isActive = sec.normalized_section === activeSecStr;
      const activeAttr = isActive ? ' class="sidebar-link active" aria-current="page"' : ' class="sidebar-link"';
      linksHtml += `
        <li class="sidebar-nav-item">
          <a href="${prefix}${sec.html_filename}"${activeAttr}>
            <span class="sidebar-sec-num">${sec.normalized_section}</span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(sec.title)}</span>
          </a>
        </li>
      `;
    }

    html += `
      <div class="sidebar-group">
        <div class="sidebar-group-title">
          <span>Module ${mod.module_number}: ${escapeHtml(mod.title)}</span>
          <span style="font-size: 0.68rem; opacity: 0.7;">${modSections.length}</span>
        </div>
        <ul class="sidebar-nav-list">
          ${linksHtml}
        </ul>
      </div>
    `;
  }

  html += `</aside>`;
  return html;
}

// Build Header HTML
function buildHeader(isRoot = false) {
  const prefix = isRoot ? '' : '../';
  const homeLink = isRoot ? 'index.html' : '../index.html';
  const currAnchor = isRoot ? '#curriculum-explorer' : '../index.html#curriculum-explorer';
  const modsAnchor = isRoot ? '#modules-section' : '../index.html#modules-section';

  const brandIconSvg = `
    <svg width="24" height="24" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brandGradDotNet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#512bd4" />
          <stop offset="60%" stop-color="#6d28d9" />
          <stop offset="100%" stop-color="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill="url(#brandGradDotNet)" />
      <circle cx="28" cy="78" r="7" fill="#ffffff" />
      <circle cx="28" cy="78" r="4" fill="#a78bfa" />
      <text x="38" y="82" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="900" fill="#ffffff" letter-spacing="-1.5">NET</text>
    </svg>
  `;

  if (isRoot) {
    return `
  <!-- Top Navigation Header -->
  <header class="top-header" role="banner">
    <div class="header-left">
      <a href="index.html" class="brand-link" aria-label="ASP.NET Core Masterclass Documentation Portal">
        <span class="brand-icon">
          ${brandIconSvg}
        </span>
        <span class="brand-text">ASP.NET Core Masterclass</span>
      </a>
      <span class="version-pill">.NET 8 / LTS</span>

      <nav class="header-nav-links" aria-label="Header Navigation">
        <a href="#curriculum-explorer" class="header-nav-link">Curriculum</a>
        <a href="#modules-section" class="header-nav-link">Modules</a>
        <a href="https://github.com/OnkarM09/dot-net-course-portal" class="header-nav-link" target="_blank" rel="noopener noreferrer" title="View Source on GitHub">
          <span>GitHub</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </nav>
    </div>

    <div class="header-right">
      <button class="search-trigger-btn" aria-label="Search curriculum" type="button">
        <span class="search-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </span>
        <span class="search-text">Search topics, syntax, concepts...</span>
        <kbd class="kbd-shortcut">Ctrl+K</kbd>
      </button>

      <button class="theme-toggle-btn" aria-label="Toggle dark/light theme" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle></svg>
      </button>
    </div>
  </header>
    `;
  }

  return `
  <!-- Top Navigation Header -->
  <header class="top-header" role="banner">
    <div class="header-left">
      <button class="nav-toggle-btn" aria-label="Toggle Navigation Sidebar" aria-expanded="false" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
      <a href="${homeLink}" class="brand-link" aria-label="ASP.NET Core Masterclass Documentation Portal">
        <span class="brand-icon">
          ${brandIconSvg}
        </span>
        <span class="brand-text">ASP.NET Core Masterclass</span>
      </a>
      <span class="version-pill">.NET 8 / LTS</span>

      <nav class="header-nav-links" aria-label="Header Navigation">
        <a href="${currAnchor}" class="header-nav-link">Curriculum</a>
        <a href="${modsAnchor}" class="header-nav-link">Modules</a>
        <a href="https://github.com/OnkarM09/dot-net-course-portal" class="header-nav-link" target="_blank" rel="noopener noreferrer" title="View Source on GitHub">
          <span>GitHub</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </nav>
    </div>

    <div class="header-right">
      <button class="search-trigger-btn" aria-label="Search curriculum" type="button">
        <span class="search-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </span>
        <span class="search-text">Search topics, syntax, concepts...</span>
        <kbd class="kbd-shortcut">Ctrl+K</kbd>
      </button>

      <button class="theme-toggle-btn" aria-label="Toggle dark/light theme" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle></svg>
      </button>
    </div>
  </header>
  `;
}

async function generateAll() {
  console.log('--- Phase D & E: Static Site & Search Index Generation ---');

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  const searchEntries = [];

  fs.mkdirSync(SECTIONS_DIR, { recursive: true });

  // 1. Generate sections 01 to 30
  for (let i = 0; i < manifest.sections.length; i++) {
    const secMeta = manifest.sections[i];
    const secNum = secMeta.normalized_section;

    const prevSec = i > 0 ? manifest.sections[i - 1] : null;
    const nextSec = i < manifest.sections.length - 1 ? manifest.sections[i + 1] : null;

    const secJsonFile = path.join(EXTRACTED_DIR, `section-${secNum}.json`);
    const cheatJsonFile = path.join(EXTRACTED_DIR, `cheatsheet-${secNum}.json`);

    const secJson = JSON.parse(fs.readFileSync(secJsonFile, 'utf8'));
    const cheatJson = fs.existsSync(cheatJsonFile) ? JSON.parse(fs.readFileSync(cheatJsonFile, 'utf8')) : null;

    // Register primary section in search index
    searchEntries.push({
      id: `sec-${secNum}`,
      title: secMeta.title,
      sectionNum: secNum,
      sectionTitle: `Section ${secNum}: ${secMeta.title}`,
      moduleTitle: `Module ${secMeta.module_number}: ${secMeta.module_title}`,
      url: `section-${secNum}.html`,
      keywords: [secMeta.title, secMeta.module_title, `Section ${secNum}`],
      snippet: `Section ${secNum} covers ${secMeta.title} (${secMeta.page_count} pages) within Module ${secMeta.module_number}.`
    });

    const { html: articleHtml, tocItems } = generateArticleContent(
      secJson,
      cheatJson,
      searchEntries,
      secNum,
      secMeta.title,
      `Module ${secMeta.module_number}: ${secMeta.module_title}`
    );

    // Build TOC HTML
    let tocHtml = '';
    for (const item of tocItems) {
      const cls = item.level === 3 ? 'toc-link toc-sub' : 'toc-link';
      tocHtml += `
        <li class="toc-item">
          <a href="#${item.id}" class="${cls}">${escapeHtml(item.title)}</a>
        </li>
      `;
    }

    // Build Prev/Next nav
    // Build balanced Prev/Next nav
    let prevHtml = prevSec ? `
      <a href="${prevSec.html_filename}" class="nav-card prev" aria-label="Previous Section: Sec ${prevSec.normalized_section} - ${escapeHtml(prevSec.title)}">
        <span class="nav-direction">&larr; Previous Section</span>
        <span class="nav-title">Sec ${prevSec.normalized_section}: ${escapeHtml(prevSec.title)}</span>
      </a>
    ` : `
      <a href="../index.html#curriculum-explorer" class="nav-card prev" aria-label="Curriculum Directory">
        <span class="nav-direction">&larr; Overview</span>
        <span class="nav-title">Curriculum Directory</span>
      </a>
    `;

    let nextHtml = nextSec ? `
      <a href="${nextSec.html_filename}" class="nav-card next" aria-label="Next Section: Sec ${nextSec.normalized_section} - ${escapeHtml(nextSec.title)}">
        <span class="nav-direction">Next Section &rarr;</span>
        <span class="nav-title">Sec ${nextSec.normalized_section}: ${escapeHtml(nextSec.title)}</span>
      </a>
    ` : `
      <a href="../index.html" class="nav-card next" aria-label="Course Completed - Return to Home">
        <span class="nav-direction">Completed &rarr;</span>
        <span class="nav-title">Return to Portal Home</span>
      </a>
    `;

    const fullPageHtml = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Section ${secNum}: ${escapeHtml(secMeta.title)} &mdash; ASP.NET Core Masterclass</title>
  <link rel="icon" type="image/svg+xml" href="../assets/images/favicon.svg">
  <link rel="alternate icon" href="../favicon.ico">
  <link rel="stylesheet" href="../assets/css/docs.css">
</head>
<body id="top">
  <!-- Accessible Skip Link -->
  <a href="#main-content" class="skip-link">Skip to main content</a>

  ${buildHeader(false)}

  <div class="sidebar-backdrop" aria-hidden="true"></div>

  <!-- Documentation Layout -->
  <div class="docs-wrapper">
    ${buildSidebar(manifest, secNum, false)}

    <!-- Main Content Container -->
    <main class="docs-main-container" id="main-content" tabindex="-1">
      <!-- Floating Expand Button when Sidebar is Collapsed -->
      <button class="expand-sidebar-pill" id="expandSidebarPill" title="Expand Sidebar" aria-label="Expand Sidebar" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
        <span>» Expand Sidebar</span>
      </button>

      <!-- Section Banner Header -->
      <header class="section-banner">
        <nav class="breadcrumbs" aria-label="Breadcrumb Navigation">
          <a href="../index.html">Curriculum</a>
          <span class="breadcrumb-sep" aria-hidden="true">/</span>
          <span>Module ${secMeta.module_number}: ${escapeHtml(secMeta.module_title)}</span>
          <span class="breadcrumb-sep" aria-hidden="true">/</span>
          <span class="breadcrumb-current" aria-current="page">Section ${secNum}</span>
        </nav>
        <div class="section-meta-row">
          <span class="module-badge">Module ${secMeta.module_number}</span>
          <span class="read-time-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${secMeta.page_count} PDF Pages
          </span>
          <span class="tag-pill">ASP.NET Core</span>
          <span class="tag-pill">.NET 8</span>
          ${secMeta.has_cheatsheet ? '<span class="tag-pill" style="border-color: var(--accent-primary); color: var(--accent-primary);">Includes Cheat Sheet</span>' : ''}
        </div>
        <h1>Section ${secNum}: ${escapeHtml(secMeta.title)}</h1>
        <p class="section-description">
          Authentic study and reference notes extracted directly from original masterclass course materials.
        </p>
      </header>

      <!-- Body Content -->
      <article class="docs-content">
        ${articleHtml}
      </article>

      <!-- Completion Toggle Control -->
      <div class="completion-container">
        <div>
          <strong style="color: var(--text-main); font-size: 0.95rem;">Section Progress</strong>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">Mark this section complete to record your learning progress locally.</p>
        </div>
        <button class="mark-complete-btn" id="markCompleteBtn" type="button" aria-pressed="false" aria-label="Mark Section Complete">
          <svg class="complete-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span class="complete-text">Mark Section Complete</span>
        </button>
      </div>

      <!-- Bottom Navigation Prev / Next -->
      <nav class="bottom-nav" aria-label="Previous and Next Section Navigation">
        ${prevHtml}
        ${nextHtml}
      </nav>

      <!-- Section Footer -->
      <footer style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-subtle); color: var(--text-dim); font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;" role="contentinfo">
        <span>ASP.NET Core Masterclass &mdash; Offline Documentation Portal</span>
        <a href="#top" style="color: var(--text-muted); text-decoration: none;">&uarr; Back to top</a>
      </footer>
    </main>

    <!-- Right Table of Contents (TOC) -->
    <aside class="docs-toc" aria-label="Page Table of Contents">
      <div class="toc-title">On This Page</div>
      <ul class="toc-list">
        ${tocHtml}
      </ul>
    </aside>
  </div>

  <!-- Floating Back to Top Button -->
  <button class="back-to-top-btn" id="backToTopBtn" aria-label="Back to Top of Page" title="Back to Top" type="button">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>
  </button>

  <!-- Scripts -->
  <script src="../assets/js/search-index.js"></script>
  <script src="../assets/js/search-engine.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>`;

    // Strict validation against disallowed names before writing
    for (const name of disallowedNames) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(fullPageHtml)) {
        throw new Error(`Attribution leak in Section ${secNum}: found "${name}"!`);
      }
    }

    const outPath = path.join(SECTIONS_DIR, `section-${secNum}.html`);
    fs.writeFileSync(outPath, fullPageHtml, 'utf8');
    console.log(`✓ Generated ${outPath} (${tocItems.length} TOC anchors).`);
  }

  // 2. Generate index.html
  console.log('Generating index.html...');
  const moduleBadgeColors = {
    1: { bg: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.35)' },
    2: { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', border: 'rgba(139, 92, 246, 0.35)' },
    3: { bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' },
    4: { bg: 'rgba(79, 70, 229, 0.12)', color: '#818cf8', border: 'rgba(79, 70, 229, 0.35)' },
    5: { bg: 'rgba(6, 182, 212, 0.12)', color: '#22d3ee', border: 'rgba(6, 182, 212, 0.35)' },
    6: { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(16, 185, 129, 0.35)' },
    7: { bg: 'rgba(217, 70, 239, 0.12)', color: '#e879f9', border: 'rgba(217, 70, 239, 0.35)' },
    8: { bg: 'rgba(244, 63, 94, 0.12)', color: '#fb7185', border: 'rgba(244, 63, 94, 0.35)' }
  };

  const moduleFocusTopics = {
    1: ['Kestrel & IIS', 'HTTP Lifecycle', 'Middleware', 'Endpoint Routing', 'URL Constraints'],
    2: ['MVC Controllers', 'Action Results', 'Model Binding', 'Data Annotations', 'Validation'],
    3: ['Razor Syntax', 'Partial Views', 'View Components', 'Tag Helpers', 'Layouts & Sections'],
    4: ['IoC Container', 'Service Lifetimes', 'appsettings.json', 'Options Pattern', 'Environments'],
    5: ['xUnit Testing', 'Moq Framework', 'Repository Pattern', 'EF Core 8', 'LINQ Queries'],
    6: ['Action Filters', 'Global Errors', 'Serilog Logging', 'Clean Architecture', 'Identity'],
    7: ['RESTful Web APIs', 'OpenAPI & Swagger', 'API Versioning', 'CORS Policies', 'Angular Client'],
    8: ['JWT Authentication', 'Role-Based Auth', 'Minimal APIs', 'Route Handlers', 'Endpoint Filters']
  };

  let moduleCardsHtml = '';
  for (const mod of manifest.modules) {
    const modSections = manifest.sections.filter(s => mod.sections.includes(s.normalized_section));
    const totalPages = modSections.reduce((sum, s) => sum + (s.page_count || 0), 0);
    const badge = moduleBadgeColors[mod.module_number] || { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', border: 'rgba(139, 92, 246, 0.35)' };
    const focusTopics = moduleFocusTopics[mod.module_number] || ['Architecture', '.NET 8'];

    let focusTagsHtml = focusTopics.map(t => `<span class="module-focus-tag">${escapeHtml(t)}</span>`).join('');

    let secPillsHtml = '';
    for (const sec of modSections) {
      secPillsHtml += `
        <a href="sections/${sec.html_filename}" class="module-sec-pill" data-sec-num="${sec.normalized_section}" title="Sec ${sec.normalized_section}: ${escapeHtml(sec.title)} (${sec.page_count} pgs)">
          <span>Sec ${sec.normalized_section}</span>
        </a>
      `;
    }

    const firstSecFile = modSections[0] ? modSections[0].html_filename : 'section-01.html';

    moduleCardsHtml += `
      <div class="module-card" data-module-id="${mod.module_number}">
        <div class="module-card-header">
          <span class="module-badge" style="background: ${badge.bg}; color: ${badge.color}; border: 1px solid ${badge.border};">
            Module ${mod.module_number}
          </span>
          <span class="module-sec-count-badge">${modSections.length} Sections &bull; ${totalPages} pgs</span>
        </div>
        
        <div class="module-card-body">
          <h3 class="module-card-title">${escapeHtml(mod.title)}</h3>
          <p class="module-card-desc">${escapeHtml(mod.description)}</p>
        </div>

        <div class="module-card-focus">
          <div class="module-focus-label">Key Topics</div>
          <div class="module-focus-tags">
            ${focusTagsHtml}
          </div>
        </div>

        <div class="module-card-sections-row">
          <div class="module-sec-pills-label">Sections in Module</div>
          <div class="module-sec-pills">
            ${secPillsHtml}
          </div>
        </div>

        <div class="module-card-footer">
          <div class="module-card-progress">
            <div class="module-card-progress-bar">
              <div class="module-card-progress-fill"></div>
            </div>
            <span>0/${modSections.length} Done</span>
          </div>
          <a href="sections/${firstSecFile}" class="module-card-action">
            <span>Explore Module ${mod.module_number}</span> &rarr;
          </a>
        </div>
      </div>
    `;
  }

  // Directory table rows
  let dirRowsHtml = '';
  for (const sec of manifest.sections) {
    dirRowsHtml += `
      <tr data-section-num="${sec.normalized_section}" data-module-num="${sec.module_number}">
        <td class="directory-sec-num">Sec ${sec.normalized_section}</td>
        <td>
          <a href="sections/${sec.html_filename}" class="directory-sec-title">
            ${escapeHtml(sec.title)}
          </a>
        </td>
        <td><span class="tag-pill">Mod ${sec.module_number}</span></td>
        <td>${sec.page_count} pgs</td>
        <td>${sec.has_cheatsheet ? '<span class="sec-cs-badge">⚡ Included</span>' : '<span style="color: var(--text-dim);">—</span>'}</td>
        <td><span class="completion-indicator">Pending</span></td>
        <td>
          <a href="sections/${sec.html_filename}" class="directory-read-btn">
            Read &rarr;
          </a>
        </td>
      </tr>
    `;
  }

  const indexHtml = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASP.NET Core Masterclass &mdash; Architecture &amp; Documentation Portal</title>
  <link rel="icon" type="image/svg+xml" href="assets/images/favicon.svg">
  <link rel="alternate icon" href="favicon.ico">
  <link rel="stylesheet" href="assets/css/docs.css">
</head>
<body id="top">
  <!-- Accessible Skip Link -->
  <a href="#main-content" class="skip-link">Skip to main content</a>

  ${buildHeader(true)}

  <!-- Main Hero & Dashboard -->
  <main id="main-content" tabindex="-1">
    <section class="portal-hero">
      <div class="hero-badge">
        <span class="badge-dot"></span> .NET 8 LTS &bull; Production Architecture Masterclass
      </div>
      <h1>Master ASP.NET Core. Build Production-Ready Applications.</h1>
      <p class="portal-hero-lead">
        Your structured learning resource for mastering C#, ASP.NET Core, application architecture, APIs, databases, and modern .NET development.
      </p>

      <div class="hero-cta-group">
        <a href="sections/section-01.html" class="hero-cta-primary">
          <span>Start Learning</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </a>
        <a href="#curriculum-explorer" class="hero-cta-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          <span>Explore Curriculum</span>
        </a>
      </div>

      <div class="hero-chips-row">
        <span class="hero-chip">⚡ Minimal APIs</span>
        <span class="hero-chip">🏛️ Clean Architecture</span>
        <span class="hero-chip">🗄️ EF Core &amp; Migrations</span>
        <span class="hero-chip">🧪 xUnit &amp; Moq</span>
        <span class="hero-chip">🔐 JWT &amp; Identity</span>
        <span class="hero-chip">🔄 Middleware Pipeline</span>
        <span class="hero-chip">📦 100% Offline Static</span>
      </div>
    </section>

    <!-- Continue Learning Section (Populated dynamically) -->
    <section class="continue-learning-section" id="continueLearningSection" aria-label="Continue Learning"></section>

    <!-- Quick Stats -->
    <div class="portal-stats-row">
      <div class="stat-card">
        <div class="stat-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        </div>
        <div class="stat-number">8</div>
        <div class="stat-label">Core Modules</div>
        <div class="stat-sub">Architectural Progression</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        </div>
        <div class="stat-number">30</div>
        <div class="stat-label">Curriculum Sections</div>
        <div class="stat-sub">Deep-Dive Reference</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <div class="stat-number">700+</div>
        <div class="stat-label">Pages of Notes</div>
        <div class="stat-sub">Verbatim Notes &amp; Matrices</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <div class="stat-number"><span id="completedSectionsCount">0</span>/30</div>
        <div class="stat-label">Sections Completed</div>
        <div class="stat-sub">Synced Locally</div>
      </div>
    </div>

    <!-- Modules Grid Section -->
    <section class="modules-section" id="modules-section" style="max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem;">
      <h2 class="section-group-heading">Curriculum Architecture</h2>
      <p class="section-group-sub">Organized into eight comprehensive architectural tiers from basic HTTP to enterprise security and Minimal APIs.</p>

      <div class="modules-grid">
        ${moduleCardsHtml}
      </div>
    </section>

    <!-- Masterclass Directory Section -->
    <section class="directory-section" id="curriculum-explorer">
      <div class="directory-filter-row">
        <div>
          <h2 class="section-group-heading" style="font-size: 1.6rem; margin-bottom: 0.25rem;">Complete Masterclass Directory</h2>
          <p class="section-group-sub" style="margin-bottom: 0;">Full searchable directory of all thirty sections with page counts, cheat sheets, and completion status.</p>
        </div>
        <div class="directory-search-box">
          <span class="directory-search-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input type="text" id="directoryFilter" class="directory-search-input" placeholder="Search sections by title, topic..." aria-label="Search masterclass directory" />
        </div>
      </div>

      <!-- Module Filter Pills -->
      <div class="filter-pills-container">
        <div class="filter-pills-label">Filter by Architectural Module:</div>
        <div class="filter-pills-bar" id="moduleFilterPills" role="toolbar" aria-label="Filter sections by module">
          <button type="button" class="filter-pill active" data-mod="all">All Modules (30)</button>
          <button type="button" class="filter-pill" data-mod="1">Mod 1: Foundations (5)</button>
          <button type="button" class="filter-pill" data-mod="2">Mod 2: Controllers (2)</button>
          <button type="button" class="filter-pill" data-mod="3">Mod 3: Views &amp; UI (5)</button>
          <button type="button" class="filter-pill" data-mod="4">Mod 4: DI &amp; Config (3)</button>
          <button type="button" class="filter-pill" data-mod="5">Mod 5: Testing &amp; EF Core (4)</button>
          <button type="button" class="filter-pill" data-mod="6">Mod 6: Architecture (6)</button>
          <button type="button" class="filter-pill" data-mod="7">Mod 7: Web APIs (3)</button>
          <button type="button" class="filter-pill" data-mod="8">Mod 8: Minimal APIs (2)</button>
        </div>
      </div>

      <div class="table-responsive">
        <table aria-label="Curriculum Sections Directory">
          <caption class="visually-hidden">Complete Masterclass Directory of 30 sections with title, module, page count, and status</caption>
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">Title</th>
              <th scope="col">Module</th>
              <th scope="col">Pages</th>
              <th scope="col">Cheat Sheet</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody id="directoryTableBody">
            ${dirRowsHtml}
          </tbody>
        </table>
      </div>

      <div id="directoryEmptyState" class="directory-empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No sections found <span id="directoryEmptyTerm"></span></div>
        <p style="font-size: 0.88rem; color: var(--text-dim); margin-top: 0.25rem;">Try adjusting your keyword search or select "All Modules" above.</p>
        <button type="button" id="resetDirectoryFilterBtn" class="empty-state-btn">Reset All Filters</button>
      </div>
    </section>
  </main>

  <!-- Global Footer -->
  <footer style="margin-top: 4rem; padding: 2.5rem 1.5rem; border-top: 1px solid var(--border-subtle); background: var(--bg-surface); color: var(--text-muted); font-size: 0.85rem; text-align: center;" role="contentinfo">
    <p style="font-weight: 600; color: var(--text-main); margin-bottom: 0.35rem;">ASP.NET Core Masterclass &mdash; 100% Offline Static Reference Documentation Portal</p>
    <p style="font-size: 0.8rem; color: var(--text-dim);">Created as an open community learning companion. Built with pure HTML5, modern CSS, and vanilla JS. Zero build step or external CDNs required.</p>
  </footer>

  <!-- Scripts -->
  <script src="assets/js/search-index.js"></script>
  <script src="assets/js/search-engine.js"></script>
  <script src="assets/js/main.js"></script>
</body>
</html>`;

  // Attribution leak check for index.html
  for (const name of disallowedNames) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(indexHtml)) {
      throw new Error(`Attribution leak in index.html: found "${name}"!`);
    }
  }

  fs.writeFileSync('index.html', indexHtml, 'utf8');
  console.log('✓ Generated index.html.');

  // 3. Generate assets/js/search-index.js
  console.log(`Writing search index (${searchEntries.length} entries)...`);
  const searchIndexContent = `/**
 * Offline Search Index for ASP.NET Core Masterclass Documentation Portal
 * Auto-generated on ${new Date().toISOString()}
 */
window.SEARCH_INDEX = ${JSON.stringify(searchEntries, null, 2)};
`;

  // Attribution leak check on search index
  for (const name of disallowedNames) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(searchIndexContent)) {
      throw new Error(`Attribution leak in search-index.js: found "${name}"!`);
    }
  }

  fs.writeFileSync(SEARCH_INDEX_FILE, searchIndexContent, 'utf8');
  console.log(`✓ Wrote ${SEARCH_INDEX_FILE} (${searchEntries.length} items).`);

  // 4. Generate README.md
  console.log('Generating README.md...');
  const readmeContent = `# ASP.NET Core Masterclass — Offline Documentation Portal

[![.NET 8 / ASP.NET Core](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](#curriculum-architecture)
[![Zero Build Step](https://img.shields.io/badge/Build%20Step-Zero%20(Offline%20First)-38BDF8)](#offline-first)
[![Curriculum](https://img.shields.io/badge/Curriculum-30%20Sections-818CF8)](#curriculum-architecture)

A comprehensive, production-grade, 100% offline-first static documentation portal covering the entire **ASP.NET Core Masterclass** curriculum (from web architecture, HTTP, middleware, and controllers through Entity Framework Core, testing, Clean Architecture, Web APIs, JWT security, and Minimal APIs).

---

## ⚡ Key Highlights

* **100% Offline-First:** Pure vanilla HTML5, CSS3, and JavaScript. No npm build, bundler, webpack, or external CDNs required. Works completely offline by opening \`index.html\` or serving locally.
* **Instant Global Search (\`Ctrl+K\`):** Client-side fuzzy search across all 30 sections and subtopics with deep anchor linking and keyboard navigation.
* **Collapsible / Expandable Sidebar:** One-click toggle button to collapse the sidebar into a focused reading view with state persisted in \`localStorage\`.
* **Dark / Light Theme:** Seamless toggle with persistent user preference and WCAG 2.2 AA contrast compliance.
* **Curriculum Progress Tracking:** Interactive section completion toggle in every section footer with live status indicators in the masterclass directory.
* **Syntax-Highlighted Code Blocks:** Dedicated copy button with accessible live feedback and language labels.

---

## 🏗️ Curriculum Architecture

| Module | Architectural Focus | Sections Included |
| :--- | :--- | :--- |
| **Module 1** | Foundations, HTTP, Middleware & Routing | Sec 01–05 (.NET Architecture, Getting Started, HTTP Lifecycle, Middleware Pipeline, Endpoint Routing & Constraints) |
| **Module 2** | Controllers, Model Binding & Validation | Sec 06–07 (Controllers, IActionResult, ActionResult&lt;T&gt;, Model Binding Sources, Model Validations) |
| **Module 3** | Razor Views, Partial Views, View Components & Tag Helpers | Sec 08–11, 17 (Razor Syntax, Layout Views, Partial Views, View Components, Custom Tag Helpers) |
| **Module 4** | Dependency Injection, Environments & Configuration | Sec 12–14 (IoC Container, Service Lifetimes, Multi-Environment Setups, Options Pattern, AppSettings) |
| **Module 5** | Testing (xUnit), CRUD, EF Core, Filters & Clean Architecture | Sec 15–16, 18–25 (xUnit, Moq, CRUD Operations, EF Core, Action/Result Filters, Logging, Error Handling, SOLID, Clean Architecture, Identity) |
| **Module 6** | RESTful Web APIs, Swagger, Versioning & Angular Integration | Sec 26–28 (Web APIs, Content Negotiation, Swagger/OpenAPI, API Versioning, Angular Integration & CORS) |
| **Module 7** | API Security (JWT) & Minimal APIs | Sec 29–30 (JWT Authentication & Authorization, Claims-Based Security, Minimal APIs) |

---

## 🚀 How to Browse

### Method 1: Local HTTP Server (Recommended)
\`\`\`powershell
npx --yes serve -l 4174 .
\`\`\`
Then visit \`http://localhost:4174\` in any modern browser.

### Method 2: Direct File Access
Simply double-click \`index.html\` or open it in your browser:
\`\`\`powershell
start index.html
\`\`\`

---

## 🛠️ Verification & Audits

Run the automated static and accessibility audit:
\`\`\`powershell
node tools/audit_site.js
\`\`\`

---

## 📄 License & Attribution
Neutral community documentation portal created from course notes and companion cheat sheets for learning and reference purposes.
`;

  // Attribution leak check on README.md
  for (const name of disallowedNames) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(readmeContent)) {
      throw new Error(`Attribution leak in README.md: found "${name}"!`);
    }
  }

  fs.writeFileSync('README.md', readmeContent, 'utf8');
  console.log('✓ Generated README.md.');

  console.log('---------------------------------------------------------');
  console.log('✓ Phase D & E Gate PASSED.');
}

generateAll().catch(err => {
  console.error('Fatal Generation Error:', err);
  process.exit(1);
});
