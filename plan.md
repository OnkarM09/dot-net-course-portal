# Implementation Plan — Offline ASP.NET Core MVC & Web API Documentation Portal

## 0. Objective and non-negotiable constraints

Build a **100% offline, zero-build static documentation portal** in this workspace from the PDF-only source collection at:

`D:\Dot net core\Asp.Net_Core_-Udemy-\Notes-20250125T050818Z-001`

The deliverable will be a static site with `index.html`, exactly thirty section pages in `sections/`, copied shared assets, a generated search index, extracted intermediate JSON, verification scripts/reports, and a neutral `README.md`.

The implementation must follow these rules throughout:

- Treat PDFs (including cheatsheet PDFs) as the sole content source. Do not read, copy from, or derive teaching content from `.cs`, `.cshtml`, `.csproj`, `.sln`, or sample-project files.
- Preserve every source PDF’s teaching sequence, wording, explanations, examples, code examples, and analogies verbatim. Permitted changes are limited to deterministic repair of PDF extraction defects (line-wrap joins, split headings, ligatures, page-number/header/footer removal when demonstrably repeated, and restoration of inline code formatting).
- Do not invent explanations, fill gaps, summarize, paraphrase, or silently omit text. If an extraction ambiguity cannot be repaired mechanically, retain the text and flag it in a review manifest.
- Remove PDF `/Author` metadata from extracted-document metadata and identify the instructor name from metadata/text before generation. That name must be excluded from all output files, HTML source/comments, titles, metadata, and `README.md`.
- Present the site as a neutral, free community learning and reference portal; do not claim individual authorship of the notes.
- Do not use a bundler, framework build, CDN, external font, analytics script, remote image, or runtime network dependency. All assets and searching must work when served locally without internet access.

## 1. Preflight, inventory, and source mapping

1. Inspect the workspace without overwriting unrelated user files; record `git status` before changes.
2. Validate the supplied notes path exists and recursively enumerate **PDF files only**. Explicitly ignore all non-PDF sources.
3. Create `tools/inventory_pdfs.py` (or equivalent local script) that records for every PDF:
   - absolute source path;
   - filename;
   - normalized section number detected from name/content;
   - page count;
   - PDF metadata with `/Author` omitted/redacted;
   - SHA-256 checksum;
   - proposed exact title from first valid title heading;
   - whether it is a numbered section or cheatsheet.
4. Write `data/pdf-inventory.json` and `data/source-map.json`. Fail preflight if there are not exactly 30 unique numbered section PDFs mapping one-to-one to sections `01`–`30`, or if numbering is ambiguous. Cheatsheets remain separately mapped to their relevant sections and must not create additional section pages.
5. Identify the instructor name only for exclusion checking. Keep it in a local, gitignored verification configuration or environment variable—not in any generated/public file or report.
6. Inspect the referenced C# portal path before copying. Confirm the four required source files exist:
   - `assets/css/docs.css`
   - `assets/js/main.js`
   - `assets/js/search-engine.js`
   - `assets/images/favicon.svg`

   If the source portal path has not been supplied, stop and request it; do not substitute a look-alike UI.

## 2. Deterministic PDF extraction with completeness controls

1. Create a Python extraction tool using `PyMuPDF` (`fitz`) as the primary extractor. Use a second local extractor such as `pdfplumber` only for page-level comparison when text is suspicious or empty.
2. Extract every page of every PDF in numerical section order, preserving page boundaries and block/line coordinates. Generate:
   - `data/extracted/section-01.json` through `data/extracted/section-30.json`;
   - `data/extracted/cheatsheet-*.json` for each cheatsheet;
   - `data/extraction-report.json` with per-page character counts and extractor status.
3. Store source page number, original extracted text, repaired text, and detected content blocks so each rendered fragment can be traced to its source page.
4. Implement only conservative repair passes:
   - de-hyphenate a trailing hyphen only when it joins a lower-case word across the line break;
   - join wrapped prose paragraphs without changing words or order;
   - normalize common PDF ligatures and invisible spacing artifacts;
   - recognize repeated page furniture by comparing repeated coordinate/text patterns across pages;
   - retain blank lines and code indentation;
   - never apply generic brace/HTML/template substitution to extracted code.
5. For every PDF, compare extracted page count to the inventory and fail on a missing/empty page. For code blocks, record raw and normalized character counts. Flag blocks that begin/end unexpectedly, have unmatched braces, or appear truncated for manual source-PDF review.
6. Keep original extraction and repaired extraction side-by-side in JSON; no repair may destroy raw evidence.

## 3. Content classification and 7-module mapping

1. Derive each section’s exact title from the PDF, retaining the PDF’s original title spelling/capitalization. Do not replace titles with the requested topic labels.
2. Inspect the extracted titles/content and assign every section to exactly one requested architectural module. Store this in `data/section-manifest.json` with section number, exact title, source PDF, source page range, module, and cheatsheet associations.
3. Use these module themes as the navigation architecture, while letting exact PDF titles determine page headings:

| Module | Required coverage |
| --- | --- |
| 1 — Foundations, HTTP, Middleware & Routing | .NET web architecture, HTTP lifecycle, Kestrel, middleware, endpoint routing/constraints |
| 2 — Controllers, Model Binding & Validation | controllers, `IActionResult`, `ActionResult&lt;T&gt;`, binding sources, validation |
| 3 — Razor Views, Partial Views, View Components & Tag Helpers | Razor, layouts, partials, view components, tag helpers |
| 4 — Dependency Injection, Environments & Configuration | IoC, lifetimes, environments, configuration, secrets, options |
| 5 — Testing (xUnit), CRUD, EF Core, Filters & Clean Architecture | xUnit/Moq, CRUD, EF Core, filters, logging, Identity, architecture |
| 6 — RESTful Web APIs, Swagger, Versioning & Angular Integration | APIs, conventions, negotiation, OpenAPI, versioning, Angular/CORS |
| 7 — API Security (JWT) & Minimal APIs | JWT/authentication/authorization and Minimal APIs |

4. If a source section touches several topics, retain it whole and select the single best module based on its primary teaching sequence. Document the decision in `data/section-manifest.json`; do not split or duplicate source content.

## 4. Static-site foundation and shared UI

1. Create the static structure:

```text
index.html
README.md
sections/section-01.html … sections/section-30.html
assets/css/docs.css
assets/js/main.js
assets/js/search-engine.js
assets/js/search-index.js
assets/images/favicon.svg
data/ (inventory, source map, extraction, manifests)
tools/ (extract, generate, audit, browser-test scripts)
reports/ (generated verification reports)
```

2. Copy the four requested C# portal assets byte-for-byte first. Preserve their existing functionality and then make minimal, documented extensions necessary for this portal:
   - offline syntax tokenization for C#, Razor/HTML, TypeScript/Angular, JSON, and Bash/CLI;
   - language labels and inline-SVG Copy controls for code blocks;
   - section-completion localStorage state;
   - completion-state reflection in homepage cards/directory;
   - robust search-index loading for local static hosting.
3. Keep all icons inline SVG with accessible labels. Do not leave empty icon elements/spans as visual placeholders.
4. Ensure CSS limits readable prose to `max-width: 72ch`, supports responsive code/table overflow containers, and prevents viewport-width overflow at desktop and mobile breakpoints.

### 4.1 Professional UI/UX, accessibility, and performance standards

The portal must feel like a purposeful learning product rather than a raw PDF dump. The shared C# portal visual language is the baseline; content fidelity never permits a degraded reading experience.

1. Establish a small, reusable design system in the copied stylesheet before generating pages:
   - semantic color tokens for light and dark themes, with text/background/border/focus combinations that meet WCAG 2.2 AA contrast (at least 4.5:1 for normal text and 3:1 for large text and non-text UI indicators);
   - a deliberate type scale, 1.45-1.7 line height for reading text, stable heading hierarchy, comfortable section spacing, and no text below 16 CSS pixels for body content;
   - consistent patterns for navigation, module cards, tables, code blocks, callouts, badges, search results, status controls, empty states, and error-free states;
   - visible hover, focus, active, selected, completed, and disabled states, with completion communicated by text as well as color/icon;
   - restrained transitions (150-250ms) that automatically respect `prefers-reduced-motion: reduce`.
2. Design the homepage around clear first actions: continue a completed section, choose one of seven modules, browse the directory, or search. Module cards must state the module number, title, scope, section count, and a clear destination. The directory must retain a compact, scannable layout and remain usable without JavaScript where practical.
3. Make the reading pages optimized for long-form study:
   - provide a skip link as the first focusable element, a clearly named `<main>`, and a logical landmark layout (`header`, `nav`, `main`, complementary right-side TOC, `footer`);
   - keep the current section and current heading identifiable in navigation/TOC with `aria-current` where applicable;
   - preserve a stable reading column while allowing wide code/tables to scroll only inside their own containers;
   - put Next/Previous section links in predictable locations using descriptive titles; do not rely on arrow glyphs alone;
   - make the desktop sidebars sticky only when viewport height permits and make their mobile equivalents accessible, dismissible, and keyboard operable;
   - give all information-carrying SVGs an accessible name and mark purely decorative SVGs `aria-hidden="true"`.
4. Make every interaction fully keyboard accessible:
   - use native `<button>`, `<a>`, `<input>`, `<dialog>`/equivalent semantic controls rather than clickable `div`/`span` elements;
   - support Tab/Shift+Tab, Enter, Space, Escape, and expected arrow-key behaviors for any composite controls;
   - trap focus within the search modal while open, return focus to its invoking search trigger on close, and prevent background interaction/inertness issues;
   - give theme, sidebar, completion, copy, and search controls explicit accessible names, state (`aria-expanded`, `aria-pressed`, `aria-live` where appropriate), and durable focus indicators;
   - announce copy and completion changes through a polite live region, not color/animation alone.
5. Produce semantically correct generated markup:
   - exactly one `<h1>` per page; headings do not skip levels solely for visual styling;
   - use lists for sequences, `<dl>` for terms/definitions when source structure establishes them, and scoped `<th>` headers plus `<caption>` for source-derived data tables;
   - label every form control; avoid placeholder-only labels;
   - use descriptive link text and `aria-label` only when visible wording cannot express the destination;
   - ensure source code remains selectable and copyable as text, is not announced as an unreadable wall of punctuation, and has a visible language label.
6. Target offline performance from the start:
   - use system font stacks and local SVG only; do not add web fonts, remote scripts/styles, heavy frameworks, or unused assets;
   - keep JavaScript modular and defer non-critical scripts; avoid layout thrashing, broad DOM scans on every keystroke, and duplicate listeners across pages;
   - precompute the search index at generation time; debounce filtering/search input and limit rendered results;
   - minify only if source maps and readable source copies are retained for maintenance, and never make minification a required build step for readers;
   - set measurable release budgets: each HTML page <= 350 KB before source-derived code/content makes that impossible, initial CSS <= 100 KB, initial JS excluding the generated search index <= 100 KB, no individual non-content image > 100 KB, and no synchronous work that blocks interaction for more than 200 ms on a representative laptop;
   - record actual byte sizes and DOM node counts per page in `reports/performance-report.json`; investigate outliers rather than silently accepting them.
7. Ensure progressive enhancement: all essential reading, linking, headings, code, and navigation work with JavaScript disabled. JavaScript may enhance search, theme persistence, copy feedback, sidebar controls, and completion tracking, but must not be required to expose PDF-derived content.

## 5. HTML generation with fidelity safeguards

1. Create a deterministic generator (`tools/generate_site.py`) that reads only `data/extracted/*.json` plus `data/section-manifest.json`.
2. Build a reusable HTML template providing:
   - copied theme controls and collapsible left sidebar;
   - sticky right-side **On This Page** table of contents built from valid section/subsection headings;
   - a content `<main>` with exact title and source-derived content;
   - copy controls with inline SVG for every recognized code block;
   - a `Mark Section Complete` toggle in each page footer;
   - search controls required by the shared portal UI;
   - relative asset links that work at all page depths.
3. Emit `sections/section-01.html` through `sections/section-30.html` exactly—no extra numbered section page and no missing number.
4. Escape all HTML from PDF prose before composition. Render generic type names safely as `ActionResult&lt;T&gt;`, `DbSet&lt;T&gt;`, `IOptions&lt;T&gt;`, `ILogger&lt;T&gt;`, `IEnumerable&lt;T&gt;`, and escape every other literal generic angle bracket. Never double-escape already-encoded content.
5. Convert detected code blocks into this semantic pattern while retaining the exact code text and indentation:

```html
<div class="code-block">
    <div class="code-toolbar">
        <span class="language-label">C#</span>
        <button class="copy-code-btn" type="button" aria-label="Copy code">…inline SVG…</button>
    </div>
    <pre><code class="language-csharp">…exact escaped code…</code></pre>
</div>
```

6. Do not force prose into code blocks or edit source code simply to balance braces. For C#, TypeScript, JSON, Razor, HTML, and Bash code blocks, preserve original line order and four-space indentation inside generated `<pre><code>` markup.
7. Convert source-derived comparison tables into `.table-responsive` tables only when rows/columns can be identified without interpretation. Preserve cell wording/order exactly. Otherwise leave the source arrangement intact and flag it for review.
8. Render source ASCII flows (HTTP/request/middleware/JWT flows) in `.diagram-container` with `<pre>` text. Use `.callout-original`, `.callout-deepdive`, and `.callout-warning` only where source labels clearly establish equivalent notes/warnings/deep dives; never label ordinary prose with invented editorial commentary.
9. Generate `index.html` with seven module cards, all thirty entries, a searchable **Complete Masterclass Directory** table, exact source titles, module assignment, page links, and completion markers.
10. Generate a neutral `README.md` explaining offline usage, source-PDF workflow, generation, and verification without an instructor byline/name.

## 6. Offline search index

1. Generate `assets/js/search-index.js` as a self-contained JavaScript data file with one entry per section plus one entry per generated `#id` heading.
2. Index exact titles, source-derived headings, URLs/fragments, section number, module, and plain text extracted from the rendered page. Include discoverability for Web API, Swagger, Angular/CORS, JWT, and Minimal APIs only where supplied by their source content.
3. Validate all search-index URLs and fragments against emitted HTML IDs. Ensure `search-engine.js` supports both homepage and section-page triggers, modal keyboard focus, Escape, and `Ctrl+K`/`Cmd+K`.

## 7. Programmatic content and structural audit

1. Create `tools/audit_site.py` and run it after every generation. It must fail with a non-zero exit code on any violation and write `reports/audit-report.json` plus a concise human-readable report.
2. Audit all `index.html`, `README.md`, assets, and the thirty section pages for:
   - exactly 30 files matching `sections/section-*.html`, numbered 01–30;
   - a one-to-one match between numbered PDFs, manifest entries, and section files;
   - no instructor-name occurrence (case-insensitive, including comments, attributes, titles, metadata, embedded JS, and README);
   - no PDF `/Author` metadata retained in JSON/output;
   - no raw/unescaped generic `<T>` HTML tags;
   - no `&lt;code&gt;` double-escape artifact;
   - no empty buttons/icons and no missing accessible labels;
   - local relative links/assets resolve to actual files;
   - all `#id` TOC/search references exist;
   - all code containers have a language class, label, and Copy button;
   - braces are balanced in every C#, TypeScript, and JSON `<pre><code>` block after decoding HTML entities. Report exact page/block/line on failure;
   - no external `http:`, `https:`, protocol-relative, CDN, font, telemetry, or analytics asset dependency.
3. Add a fidelity report that compares normalized source text against normalized rendered text in original order per source page. Any non-allowed deletion/reordering/substitution must fail or enter an explicit manual-review queue before release.
4. Add automated static accessibility checks to `tools/audit_site.py` using an HTML parser plus an offline ruleset. Fail for missing document language/title/viewport, duplicate IDs, skipped heading levels, absent main/landmarks, missing skip link, form controls without labels, image/SVG alternative-text errors, invalid ARIA role/state combinations, keyboard-inaccessible custom controls, missing table captions/headers, links with empty/ambiguous accessible names, and invalid HTML.
5. Add an offline contrast audit against the actual light/dark CSS tokens and all component state combinations. Report contrast ratios and fail any WCAG 2.2 AA violation. Manually review syntax-highlight token contrast in both themes because automated color-pair discovery can miss layered code styles.
6. Add `tools/audit_performance.py` that measures uncompressed and gzip/Brotli-eligible byte sizes, total request count, DOM node count, duplicate assets, render-blocking resources, CSS/JS byte budgets, and search-index size. Write `reports/performance-report.json`, fail hard budget violations, and identify justified exceptions such as unusually code-heavy source sections.
7. Use a pinned local accessibility checker (for example axe-core packaged with the project, not a hosted script) during browser testing. Its serious/critical violations are release blockers; every remaining moderate/minor result requires a documented disposition in the report.

## 8. Local-server and Playwright MCP verification

1. Start the required server from the workspace root:

```powershell
npx --yes serve -l 4174 .
```

2. Use Playwright MCP (or a local Playwright test harness if MCP is unavailable) against `http://127.0.0.1:4174` and capture console errors, page errors, failed requests, response status, and viewport overflow. Test desktop `1440×900` and mobile `390×844`.
3. On `index.html`, verify:
   - no `console.error`, `pageerror`, failed network request, or 404;
   - `#directoryFilter` narrows directory rows;
   - both `.search-trigger-btn` controls open global search;
   - `Ctrl+K` opens the same dialog;
   - each query returns an applicable result: `Partial Views`, `Dependency Injection`, `Entity Framework`, `CORS`, `JWT`, and `Minimal API`;
   - theme switching persists through a reload using `localStorage`;
   - sidebar collapse/expand works and persists as intended;
   - no horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`).
4. Visit every one of the thirty section pages at both relevant responsive widths (full interaction sweep at desktop, layout/link sweep at mobile). For every page, assert zero console/page/network errors and no horizontal overflow.
5. On representative pages containing code, trigger Copy and assert visible `Copied!` feedback, then confirm clipboard behavior where browser permissions permit. On a representative section, mark it complete, return to the homepage, and verify the directory state updates/persists.
6. Add an accessibility interaction pass at desktop and mobile widths:
   - run the local axe ruleset on `index.html` and every section page in both themes;
   - keyboard-navigate the skip link, primary navigation, directory filter, theme toggle, sidebar control, search dialog, Copy buttons, completion toggle, TOC, and previous/next navigation;
   - assert keyboard focus is always visible, focus order is logical, modal focus is contained/restored, and all state changes have accessible names/announcements;
   - verify zoom/reflow at 200% and 400% equivalent viewport widths, text spacing override resilience, and reduced-motion behavior;
   - emulate a coarse pointer and verify target sizes are at least 24 by 24 CSS pixels or have adequate spacing under WCAG 2.2 AA target-size guidance.
7. Add a performance pass with browser Performance APIs. On a cold local load, record resource count/bytes, DOMContentLoaded, load, long tasks, and interaction responsiveness for `index.html` plus the longest and most code-heavy section pages. Check no late layout shift is caused by navigation/search/theme initialization, and confirm filtering a large directory and opening search stay responsive.
8. Run a no-JavaScript smoke test for `index.html` and representative section pages. Confirm all PDF-derived content, title/headings, links, and reading navigation remain available; record any intentionally JavaScript-enhanced feature as such.
9. Save machine-readable results in `reports/browser-report.json`, `reports/accessibility-report.json`, and `reports/performance-report.json`, screenshots for failures only, and a test log. Fix all discovered defects, regenerate, rerun every audit and browser suite, and repeat until all assertions pass.
10. Stop the local server cleanly after verification.

## 9. Final delivery checklist

- [ ] The workspace contains the offline static portal and no build is needed to read it.
- [ ] Inventory proves all 30 source PDFs were extracted in numeric order; cheatsheets are retained and associated.
- [ ] There are exactly `section-01.html` through `section-30.html`, each with an exact PDF-derived title.
- [ ] Every generated prose/code item is traceable to source PDF pages; fidelity report is clean or all exceptions have been manually resolved from the PDF.
- [ ] The 7-module homepage architecture contains all thirty sections exactly once.
- [ ] Required C# portal visual/interaction assets are copied and extended only for the required offline features.
- [ ] The homepage and section templates meet the documented professional UI/UX standard: clear task hierarchy, readable long-form layout, predictable navigation, responsive tables/code, and stable light/dark themes.
- [ ] The site passes WCAG 2.2 AA static checks, contrast checks, local axe checks, and keyboard/focus/modal/reflow/reduced-motion verification with no serious or critical issues.
- [ ] Essential reading and navigation remain usable with JavaScript disabled; JavaScript-only enhancements fail gracefully.
- [ ] Offline performance budgets pass and reports capture page weights, request counts, DOM size, search responsiveness, and browser timing/long-task measurements.
- [ ] No instructor identity or `/Author` metadata appears in deliverable files.
- [ ] Static audit passes: braces, generic escaping, code markup, icons, links, assets, counts, and offline dependency checks.
- [ ] Desktop and mobile Playwright verification passes, including search, filter, theme, sidebar, copy, completion, no errors/404s, and no horizontal overflow.
- [ ] Local server is stopped and `README.md` explains how to open/serve and verify the portal.
- [ ] Final handoff summarizes all 30 generated sections by number, exact title, and assigned module, along with the audit/browser report locations.

## Implementation sequencing and gates

| Phase | Work | Exit gate |
| --- | --- | --- |
| A | Preflight and source inventory | 30 unambiguous numbered PDFs; C# portal asset source known |
| B | Page-complete JSON extraction | Every PDF page represented; no empty/truncated extraction |
| C | Manifest and module mapping | 30 titles, 30 pages, 7 modules, cheatsheets mapped |
| D | Copy UI assets and implement generator | Static structure produced without content edits beyond extraction repairs; design-system/accessibility baseline established |
| E | Generate HTML/search/README | Exactly 30 pages and valid offline navigation/search; progressive enhancement retained |
| F | Automated fidelity, structure, accessibility, and performance audits | All hard requirements and budgets pass, or source-review issues are resolved |
| G | Static server + Playwright MCP | Desktop/mobile interaction, keyboard/accessibility, performance, and error-free rendering pass |
| H | Release cleanup and handoff | Server stopped; reports and 30-section summary delivered |

No phase may advance on a failed gate. This prevents a visually polished portal from masking missing PDF content, attribution leakage, code corruption, or broken offline behavior.
