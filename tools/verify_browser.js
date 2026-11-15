async (page) => {
  const BASE_URL = 'http://127.0.0.1:4174';
  const report = {
    timestamp: new Date().toISOString(),
    status: 'PASSED',
    total_pages_tested: 31,
    desktop_viewport: { width: 1440, height: 900 },
    mobile_viewport: { width: 390, height: 844 },
    page_sweeps: [],
    features: {},
    accessibility: {},
    failures: []
  };

  const pagesToTest = ['/index.html'];
  for (let i = 1; i <= 30; i++) {
    pagesToTest.push(`/sections/section-${String(i).padStart(2, '0')}.html`);
  }

  // Track console errors and network errors
  let consoleErrors = [];
  let failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push({ url: page.url(), text: err.message });
  });

  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      failedRequests.push({ url: resp.url(), status: resp.status() });
    }
  });

  // --- PART 1: DESKTOP SWEEP (1440x900) ---
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const pagePath of pagesToTest) {
    const fullUrl = `${BASE_URL}${pagePath}`;
    const pageErrorsBefore = consoleErrors.length;
    const pageFailedReqsBefore = failedRequests.length;

    const resp = await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
    const status = resp.status();

    // Check overflow and active syntax highlighting spans
    const pageMetrics = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      const tokenSpans = document.querySelectorAll('pre code span[class*="token-"]');
      const codeBlocks = document.querySelectorAll('.code-block pre code');
      return {
        scrollW,
        innerW,
        overflow: scrollW > innerW,
        code_blocks_count: codeBlocks.length,
        token_spans_count: tokenSpans.length,
        syntax_highlighting_active: codeBlocks.length === 0 || tokenSpans.length > 0
      };
    });

    const newErrors = consoleErrors.slice(pageErrorsBefore);
    const newFailed = failedRequests.slice(pageFailedReqsBefore);

    const sweepResult = {
      path: pagePath,
      status,
      desktop_overflow: pageMetrics.overflow,
      scroll_width: pageMetrics.scrollW,
      inner_width: pageMetrics.innerW,
      code_blocks: pageMetrics.code_blocks_count,
      token_spans: pageMetrics.token_spans_count,
      syntax_active: pageMetrics.syntax_highlighting_active,
      errors_count: newErrors.length,
      failed_reqs_count: newFailed.length
    };

    if (status !== 200 || pageMetrics.overflow || !pageMetrics.syntax_highlighting_active || newErrors.length > 0 || newFailed.length > 0) {
      report.failures.push({
        viewport: 'desktop',
        page: pagePath,
        error: `Status: ${status}, Overflow: ${pageMetrics.overflow}, SyntaxActive: ${pageMetrics.syntax_highlighting_active}, Errors: ${newErrors.length}, FailedReqs: ${newFailed.length}`
      });
    }

    report.page_sweeps.push(sweepResult);
  }

  // --- PART 2: MOBILE SWEEP (390x844) ---
  await page.setViewportSize({ width: 390, height: 844 });

  for (let i = 0; i < pagesToTest.length; i++) {
    const pagePath = pagesToTest[i];
    const fullUrl = `${BASE_URL}${pagePath}`;
    const pageErrorsBefore = consoleErrors.length;

    await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });

    const overflowCheck = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      return { scrollW, innerW, overflow: scrollW > innerW };
    });

    const newErrors = consoleErrors.slice(pageErrorsBefore);
    const targetSweep = report.page_sweeps[i];
    targetSweep.mobile_overflow = overflowCheck.overflow;
    targetSweep.mobile_scroll_width = overflowCheck.scrollW;
    targetSweep.mobile_inner_width = overflowCheck.innerW;

    if (overflowCheck.overflow || newErrors.length > 0) {
      report.failures.push({
        viewport: 'mobile',
        page: pagePath,
        error: `Mobile Overflow: ${overflowCheck.overflow}, Errors: ${newErrors.length}`
      });
    }
  }

  // Reset to Desktop for interactive feature tests
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });

  // --- PART 3: HOMEPAGE VERIFICATIONS ---

  // 1. Structure Verification (8 Module Cards, 30 Directory Rows)
  const homeStructure = await page.evaluate(() => {
    const cards = document.querySelectorAll('.module-card');
    const rows = document.querySelectorAll('#directoryTableBody tr');
    return {
      module_cards_count: cards.length,
      directory_rows_count: rows.length,
      pass: cards.length === 8 && rows.length === 30
    };
  });
  report.features.homepage_structure = homeStructure;

  // 2. Directory Filter: matching, empty state, reset
  const filterResult = await page.evaluate(() => {
    const input = document.getElementById('directoryFilter');
    const rows = document.querySelectorAll('#directoryTableBody tr');
    const emptyState = document.getElementById('directoryEmptyState');
    const total = rows.length;

    // Filter matching
    input.value = 'middleware';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const filtered = Array.from(rows).filter(r => r.style.display !== 'none').length;
    const emptyHidden = emptyState.style.display === 'none';

    // Zero match
    input.value = 'nonexistenttopicxyz999';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const zeroFiltered = Array.from(rows).filter(r => r.style.display !== 'none').length;
    const emptyShown = emptyState.style.display !== 'none';

    // Reset
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const reset = Array.from(rows).filter(r => r.style.display !== 'none').length;
    const emptyHiddenAfterReset = emptyState.style.display === 'none';

    return {
      total,
      filtered,
      emptyHidden,
      zeroFiltered,
      emptyShown,
      reset,
      emptyHiddenAfterReset,
      pass: total === 30 && filtered === 1 && zeroFiltered === 0 && emptyShown && reset === 30 && emptyHiddenAfterReset
    };
  });
  report.features.directory_filter = filterResult;

  // 3. Theme Toggle & Persistence
  const themeResult = await page.evaluate(() => {
    const btn = document.querySelector('.theme-toggle-btn');
    const initial = document.documentElement.getAttribute('data-theme') || 'dark';
    btn.click();
    const switched = document.documentElement.getAttribute('data-theme');
    const stored = localStorage.getItem('dotnet_docs_theme');
    return { initial, switched, stored };
  });

  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  const themeAfterReload = await page.evaluate(() => {
    return document.documentElement.getAttribute('data-theme');
  });
  themeResult.persisted_after_reload = (themeAfterReload === themeResult.switched);

  // Switch back to dark mode
  await page.evaluate(() => {
    const btn = document.querySelector('.theme-toggle-btn');
    if (document.documentElement.getAttribute('data-theme') !== 'dark') {
      btn.click();
    }
  });
  report.features.theme_toggle = themeResult;

  // 4. Multi-Button Search (Header + Hero) and All 7 Required Queries
  const searchResult = await page.evaluate(() => {
    const triggers = document.querySelectorAll('.search-trigger-btn');
    const headerBtn = triggers[0];
    const heroBtn = triggers[1];

    // Test Hero trigger
    heroBtn.click();
    let backdrop = document.getElementById('searchModalBackdrop');
    let input = document.getElementById('searchModalInput');
    let closeBtn = document.getElementById('searchCloseBtn');
    let container = document.getElementById('searchResultsContainer');

    const heroOpened = backdrop && backdrop.classList.contains('open');
    if (closeBtn) closeBtn.click();

    // Test Header trigger
    headerBtn.click();
    backdrop = document.getElementById('searchModalBackdrop');
    input = document.getElementById('searchModalInput');
    closeBtn = document.getElementById('searchCloseBtn');
    container = document.getElementById('searchResultsContainer');

    const headerOpened = backdrop && backdrop.classList.contains('open');

    // Run all 7 required queries
    const queries = ['Middleware', 'Partial Views', 'Dependency Injection', 'Entity Framework', 'CORS', 'JWT', 'Minimal API'];
    const queryResults = {};

    for (const q of queries) {
      input.value = q;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const items = container.querySelectorAll('.search-result-item');
      queryResults[q] = {
        hits: items.length,
        top_title: items[0] ? items[0].querySelector('.search-result-title')?.textContent?.trim() : null,
        top_url: items[0] ? items[0].getAttribute('href') : null
      };
    }

    // Close modal
    if (closeBtn) closeBtn.click();

    return {
      hero_trigger_works: heroOpened,
      header_trigger_works: headerOpened,
      query_results: queryResults,
      all_queries_hit: Object.values(queryResults).every(r => r.hits > 0)
    };
  });
  report.features.search = searchResult;

  // 5. Click Search Result to Navigate
  await page.evaluate(() => {
    document.querySelector('.search-trigger-btn').click();
    const input = document.getElementById('searchModalInput');
    input.value = 'Middleware';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForSelector('#searchResultsContainer .search-result-item');
  await page.evaluate(() => {
    const firstResult = document.querySelector('#searchResultsContainer .search-result-item');
    if (firstResult) firstResult.click();
  });
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
  const currentUrl = page.url();
  report.features.search_navigation = {
    destination_url: currentUrl,
    pass: currentUrl.includes('section-04.html') || currentUrl.includes('section-05.html')
  };

  // --- PART 4: SECTION PAGE FEATURES & NAVIGATION ---
  await page.goto(`${BASE_URL}/sections/section-01.html`, { waitUntil: 'domcontentloaded' });

  // 1. Previous / Next Navigation
  await page.evaluate(() => {
    const nextLink = document.querySelector('.nav-card.next');
    if (nextLink) nextLink.click();
  });
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
  const navUrlNext = page.url();

  await page.evaluate(() => {
    const prevLink = document.querySelector('.nav-card.prev');
    if (prevLink) prevLink.click();
  });
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {});
  const navUrlPrev = page.url();

  report.features.prev_next_navigation = {
    next_url: navUrlNext,
    prev_url: navUrlPrev,
    pass: navUrlNext.includes('section-02.html') && navUrlPrev.includes('section-01.html')
  };

  // 2. TOC Link Scrolling
  await page.goto(`${BASE_URL}/sections/section-05.html`, { waitUntil: 'domcontentloaded' });
  const tocResult = await page.evaluate(() => {
    const firstToc = document.querySelector('.toc-link');
    if (!firstToc) return { pass: false, error: 'No TOC link' };
    const targetHash = firstToc.getAttribute('href');
    const targetId = targetHash.substring(1);
    const targetElem = document.getElementById(targetId);
    firstToc.click();
    return {
      targetId,
      targetExists: !!targetElem,
      pass: !!targetElem
    };
  });
  report.features.toc_interaction = tocResult;

  // 3. Copy Code Button
  const copyResult = await page.evaluate(async () => {
    const btn = document.querySelector('.copy-code-btn');
    if (!btn) return { pass: false, error: 'No copy button found' };
    const originalText = btn.textContent.trim();
    btn.click();
    await new Promise(r => setTimeout(r, 200));
    const copiedText = btn.textContent.trim();
    const hasCopiedClass = btn.classList.contains('copied');
    return {
      pass: hasCopiedClass || copiedText.includes('Copied'),
      originalText,
      copiedText,
      hasCopiedClass
    };
  });
  report.features.code_copy = copyResult;

  // 4. Desktop Sidebar Collapse & Expand
  const desktopSidebarResult = await page.evaluate(() => {
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const expandPill = document.getElementById('expandSidebarPill');

    collapseBtn.click();
    const collapsed = document.body.classList.contains('sidebar-collapsed');

    expandPill.click();
    const expanded = !document.body.classList.contains('sidebar-collapsed');

    return { collapsed, expanded, pass: collapsed && expanded };
  });
  report.features.desktop_sidebar_toggle = desktopSidebarResult;

  // 5. Mobile Drawer Open & Close (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileDrawerResult = await page.evaluate(() => {
    const navToggle = document.querySelector('.nav-toggle-btn');
    const sidebar = document.querySelector('.docs-sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    navToggle.click();
    const opened = sidebar.classList.contains('open') && backdrop.classList.contains('open');

    backdrop.click();
    const closed = !sidebar.classList.contains('open') && !backdrop.classList.contains('open');

    return { opened, closed, pass: opened && closed };
  });
  report.features.mobile_drawer_toggle = mobileDrawerResult;

  // Reset to Desktop
  await page.setViewportSize({ width: 1440, height: 900 });

  // 6. Section Progress Synchronization (Section 01 & Section 30)
  // Clear any existing completed items
  await page.evaluate(() => localStorage.removeItem('dotnet_completed_sections'));

  // Mark Section 01
  await page.goto(`${BASE_URL}/sections/section-01.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.getElementById('markCompleteBtn').click());

  // Mark Section 30
  await page.goto(`${BASE_URL}/sections/section-30.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.getElementById('markCompleteBtn').click());

  // Visit homepage and verify counter and rows
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  const completionSyncResult = await page.evaluate(() => {
    const countElem = document.getElementById('completedSectionsCount');
    const count = countElem ? parseInt(countElem.textContent.trim(), 10) : 0;

    const row01 = document.querySelector('tr[data-section-num="01"] .completion-indicator');
    const row30 = document.querySelector('tr[data-section-num="30"] .completion-indicator');
    const row02 = document.querySelector('tr[data-section-num="02"] .completion-indicator');

    const sec01Done = row01 && row01.textContent.includes('Done') && row01.classList.contains('completed');
    const sec30Done = row30 && row30.textContent.includes('Done') && row30.classList.contains('completed');
    const sec02Pending = row02 && row02.textContent.includes('Pending') && !row02.classList.contains('completed');

    return {
      completed_count: count,
      sec01_done: sec01Done,
      sec30_done: sec30Done,
      sec02_pending: sec02Pending,
      pass: count === 2 && sec01Done && sec30Done && sec02Pending
    };
  });
  report.features.section_progress_sync = completionSyncResult;

  // Clean up localStorage
  await page.evaluate(() => localStorage.removeItem('dotnet_completed_sections'));

  // --- PART 5: ACCESSIBILITY CHECKS ---
  const a11yResult = await page.evaluate(() => {
    const skipLink = document.querySelector('.skip-link');
    const mainContent = document.getElementById('main-content');
    const hasSingleH1 = document.querySelectorAll('h1').length === 1;
    const emptyButtons = Array.from(document.querySelectorAll('button')).filter(b => {
      const text = b.textContent.trim();
      const aria = b.getAttribute('aria-label');
      return !text && !aria;
    });

    return {
      skip_link_exists: !!skipLink,
      main_content_exists: !!mainContent,
      single_h1: hasSingleH1,
      empty_buttons_count: emptyButtons.length,
      pass: !!skipLink && !!mainContent && hasSingleH1 && emptyButtons.length === 0
    };
  });
  report.accessibility.core_a11y = a11yResult;

  // Final Assessment
  report.total_failures = report.failures.length;
  report.status = report.total_failures === 0 ? 'PASSED' : 'FAILED';

  return report;
}
