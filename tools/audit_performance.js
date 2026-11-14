import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const BUDGETS = {
  max_html_bytes: 350 * 1024, // 350 KB
  max_initial_css_bytes: 100 * 1024, // 100 KB
  max_initial_js_bytes: 100 * 1024, // 100 KB (excluding search-index)
  max_image_bytes: 100 * 1024 // 100 KB
};

function getCompressedSizes(buffer) {
  const gzip = zlib.gzipSync(buffer).length;
  const brotli = zlib.brotliCompressSync(buffer).length;
  return { gzip, brotli };
}

function countDomNodes(html) {
  // Approximate tag count by counting opening HTML tags
  const tags = html.match(/<[a-zA-Z][a-zA-Z0-9:-]*(\s+[^>]*)?>/g);
  return tags ? tags.length : 0;
}

function runPerformanceAudit() {
  console.log('--- Running Static Performance & Resource Budget Audit ---');

  const report = {
    timestamp: new Date().toISOString(),
    status: 'PASSED',
    budgets: {
      html_page_budget_kb: 350,
      initial_css_budget_kb: 100,
      initial_js_budget_kb: 100,
      image_budget_kb: 100
    },
    css_assets: [],
    js_assets: [],
    image_assets: [],
    pages: [],
    violations: [],
    summary: {}
  };

  // 1. Audit CSS
  const cssDir = 'assets/css';
  let totalCssBytes = 0;
  if (fs.existsSync(cssDir)) {
    fs.readdirSync(cssDir).forEach(f => {
      if (f.endsWith('.css')) {
        const p = path.join(cssDir, f);
        const buf = fs.readFileSync(p);
        const comp = getCompressedSizes(buf);
        totalCssBytes += buf.length;
        const item = {
          file: p,
          size_bytes: buf.length,
          size_kb: +(buf.length / 1024).toFixed(2),
          gzip_kb: +(comp.gzip / 1024).toFixed(2),
          brotli_kb: +(comp.brotli / 1024).toFixed(2)
        };
        report.css_assets.push(item);
        if (buf.length > BUDGETS.max_initial_css_bytes) {
          report.violations.push({ asset: p, error: `CSS exceeds budget: ${item.size_kb} KB > 100 KB` });
        }
      }
    });
  }

  // 2. Audit JS
  const jsDir = 'assets/js';
  let totalInitialJsBytes = 0;
  if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir).forEach(f => {
      if (f.endsWith('.js')) {
        const p = path.join(jsDir, f);
        const buf = fs.readFileSync(p);
        const comp = getCompressedSizes(buf);
        const isSearchIndex = f.includes('search-index');
        if (!isSearchIndex) {
          totalInitialJsBytes += buf.length;
        }
        const item = {
          file: p,
          size_bytes: buf.length,
          size_kb: +(buf.length / 1024).toFixed(2),
          gzip_kb: +(comp.gzip / 1024).toFixed(2),
          brotli_kb: +(comp.brotli / 1024).toFixed(2),
          is_search_index: isSearchIndex
        };
        report.js_assets.push(item);
        if (!isSearchIndex && buf.length > BUDGETS.max_initial_js_bytes) {
          report.violations.push({ asset: p, error: `Initial JS exceeds budget: ${item.size_kb} KB > 100 KB` });
        }
      }
    });
  }

  // 3. Audit Images
  const imgDirs = ['assets/images', '.'];
  imgDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(f => {
        if (/\.(svg|ico|png|jpg|webp)$/i.test(f)) {
          const p = path.join(dir, f);
          const stat = fs.statSync(p);
          if (stat.isFile()) {
            const buf = fs.readFileSync(p);
            const item = {
              file: p,
              size_bytes: buf.length,
              size_kb: +(buf.length / 1024).toFixed(2)
            };
            report.image_assets.push(item);
            if (buf.length > BUDGETS.max_image_bytes) {
              report.violations.push({ asset: p, error: `Image exceeds budget: ${item.size_kb} KB > 100 KB` });
            }
          }
        }
      });
    }
  });

  // 4. Audit HTML Pages (index.html + sections/section-*.html)
  const htmlFiles = ['index.html'];
  const secDir = 'sections';
  if (fs.existsSync(secDir)) {
    fs.readdirSync(secDir).forEach(f => {
      if (f.startsWith('section-') && f.endsWith('.html')) {
        htmlFiles.push(path.join(secDir, f));
      }
    });
  }

  let maxPageBytes = 0;
  let maxPageName = '';
  let totalHtmlBytes = 0;

  htmlFiles.forEach(file => {
    const buf = fs.readFileSync(file);
    const html = buf.toString('utf8');
    const comp = getCompressedSizes(buf);
    const domNodes = countDomNodes(html);
    totalHtmlBytes += buf.length;

    if (buf.length > maxPageBytes) {
      maxPageBytes = buf.length;
      maxPageName = file;
    }

    // Check script/link tags
    const scriptCount = (html.match(/<script\b/g) || []).length;
    const styleCount = (html.match(/<link[^>]+rel=["']stylesheet["']/g) || []).length;

    const pageInfo = {
      file,
      size_bytes: buf.length,
      size_kb: +(buf.length / 1024).toFixed(2),
      gzip_kb: +(comp.gzip / 1024).toFixed(2),
      brotli_kb: +(comp.brotli / 1024).toFixed(2),
      estimated_dom_nodes: domNodes,
      requests_count: 1 + scriptCount + styleCount + 1 // document + scripts + styles + favicon
    };

    report.pages.push(pageInfo);

    if (buf.length > BUDGETS.max_html_bytes) {
      // Justified exception if content-heavy
      report.violations.push({
        asset: file,
        error: `Page exceeds 350 KB budget: ${pageInfo.size_kb} KB`
      });
    }
  });

  report.summary = {
    total_pages: htmlFiles.length,
    total_html_size_kb: +(totalHtmlBytes / 1024).toFixed(2),
    largest_page: {
      file: maxPageName,
      size_kb: +(maxPageBytes / 1024).toFixed(2)
    },
    total_initial_css_kb: +(totalCssBytes / 1024).toFixed(2),
    total_initial_js_kb: +(totalInitialJsBytes / 1024).toFixed(2),
    all_budgets_passed: report.violations.length === 0
  };

  if (report.violations.length > 0) {
    report.status = 'FAILED';
  }

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/performance-report.json', JSON.stringify(report, null, 2), 'utf8');

  console.log(`Audited ${htmlFiles.length} HTML pages, ${report.css_assets.length} CSS, ${report.js_assets.length} JS`);
  console.log(`Largest HTML: ${maxPageName} (${(maxPageBytes / 1024).toFixed(2)} KB, budget: 350 KB)`);
  console.log(`Initial CSS: ${(totalCssBytes / 1024).toFixed(2)} KB (budget: 100 KB)`);
  console.log(`Initial JS: ${(totalInitialJsBytes / 1024).toFixed(2)} KB (budget: 100 KB)`);
  console.log(`Status: ${report.status} (${report.violations.length} violations)`);
  console.log(`Wrote reports/performance-report.json`);
}

runPerformanceAudit();
