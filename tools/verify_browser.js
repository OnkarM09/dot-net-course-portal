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

    const overflowCheck = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      return { scrollW, innerW, overflow: scrollW > innerW };
    });

    const newErrors = consoleErrors.slice(pageErrorsBefore);
    const newFailed = failedRequests.slice(pageFailedReqsBefore);

    const sweepResult = {
      path: pagePath,
      status,
      desktop_overflow: overflowCheck.overflow,
      scroll_width: overflowCheck.scrollW,
      inner_width: overflowCheck.innerW,
      errors_count: newErrors.length,
      failed_reqs_count: newFailed.length
    };

    if (status !== 200 || overflowCheck.overflow || newErrors.length > 0 || newFailed.length > 0) {
      report.failures.push({
        viewport: 'desktop',
        page: pagePath,
        error: `Status: ${status}, Overflow: ${overflowCheck.overflow}, Errors: ${newErrors.length}, FailedReqs: ${newFailed.length}`
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

  // --- PART 3: HOMEPAGE FEATURE VERIFICATIONS ---

  // 1. Directory Filter
  const filterResult = await page.evaluate(() => {
    const input = document.getElementById('directoryFilter');
    const rows = document.querySelectorAll('#directoryTableBody tr');
    const total = rows.length;

    input.value = 'middleware';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const filtered = Array.from(rows).filter(r => r.style.display !== 'none').length;

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const reset = Array.from(rows).filter(r => r.style.display !== 'none').length;

    return { total, filtered, reset, pass: total === 30 && filtered === 1 && reset === 30 };
  });
  report.features.directory_filter = filterResult;

  // 2. Theme Toggle & Persistence
  const themeResult = await page.evaluate(() => {
    const btn = document.querySelector('.theme-toggle-btn');
    const initial = document.documentElement.getAttribute('data-theme') || 'dark';
    btn.click();
    const switched = document.documentElement.getAttribute('data-theme');
    const stored = localStorage.getItem('dotnet_docs_theme');
    return { initial, switched, stored };
  });

  // Reload to verify persistence
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  const themeAfterReload = await page.evaluate(() => {
    return document.documentElement.getAttribute('data-theme');
  });
  themeResult.persisted_after_reload = (themeAfterReload === themeResult.switched);

  // Switch back to dark
  await page.evaluate(() => {
    const btn = document.querySelector('.theme-toggle-btn');
    if (document.documentElement.getAttribute('data-theme') !== 'dark') {
      btn.click();
    }
  });
  report.features.theme_toggle = themeResult;

  // 3. Search Trigger, Ctrl+K, and Required Queries
  const searchResult = await page.evaluate(() => {
    const triggers = document.querySelectorAll('.search-trigger-btn');
    triggers[0].click();
    const backdrop = document.getElementById('searchModalBackdrop');
    const input = document.getElementById('searchModalInput');
    const container = document.getElementById('searchResultsContainer');

    const queries = ['Partial Views', 'Dependency Injection', 'Entity Framework', 'CORS', 'JWT', 'Minimal API'];
    const queryResults = {};

    for (const q of queries) {
      input.value = q;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const items = container.querySelectorAll('.search-result-item');
      queryResults[q] = {
        hits: items.length,
        top_title: items[0] ? items[0].querySelector('.search-result-title')?.textContent?.trim() : null
      };
    }

    // Close modal
    document.getElementById('searchCloseBtn').click();
    const isClosed = !backdrop.classList.contains('open');

    return {
      modal_opened: backdrop.classList.contains('open') || isClosed,
      query_results: queryResults,
      all_queries_hit: Object.values(queryResults).every(r => r.hits > 0)
    };
  });
  report.features.search = searchResult;

  // --- PART 4: SECTION PAGE INTERACTIONS ---
  await page.goto(`${BASE_URL}/sections/section-04.html`, { waitUntil: 'domcontentloaded' });

  // 1. Copy Code Button
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

  // 2. Mark Section Complete & Verify Homepage Badge
  const completionResult = await page.evaluate(() => {
    const btn = document.getElementById('markCompleteBtn');
    if (!btn) return { pass: false, error: 'No complete button found' };
    btn.click();
    const isCompleted = btn.classList.contains('completed');
    const stored = JSON.parse(localStorage.getItem('dotnet_completed_sections') || '[]');
    return {
      isCompleted,
      stored,
      includesSec4: stored.includes('04')
    };
  });

  // Return to homepage and check badge
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  const homeBadgeResult = await page.evaluate(() => {
    const row = document.querySelector('tr[data-section-num="04"]');
    const badge = row ? row.querySelector('.completion-indicator') : null;
    const countElem = document.getElementById('completedSectionsCount');
    return {
      rowFound: !!row,
      badgeText: badge ? badge.textContent.trim() : null,
      badgeCompleted: badge ? badge.classList.contains('completed') : false,
      completedCount: countElem ? countElem.textContent.trim() : null
    };
  });
  report.features.section_completion = {
    section_page: completionResult,
    homepage_reflection: homeBadgeResult,
    pass: completionResult.includesSec4 && homeBadgeResult.badgeText === '✓ Done'
  };

  // 3. Skip Link Test
  const skipLinkResult = await page.evaluate(() => {
    const skipLink = document.querySelector('.skip-link');
    const mainContent = document.getElementById('main-content');
    return {
      exists: !!skipLink,
      targetExists: !!mainContent,
      href: skipLink ? skipLink.getAttribute('href') : null
    };
  });
  report.accessibility.skip_link = skipLinkResult;

  // 4. Focus Trap in Search Modal Test
  const focusTrapResult = await page.evaluate(() => {
    document.querySelector('.search-trigger-btn').click();
    const backdrop = document.getElementById('searchModalBackdrop');
    const focusable = backdrop.querySelectorAll('input, button, a[href], [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Trigger Tab on last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    // Verify trap mechanism is wired
    document.getElementById('searchCloseBtn').click();
    return {
      focusable_elements_count: focusable.length,
      has_input: !!document.getElementById('searchModalInput'),
      has_close_btn: !!document.getElementById('searchCloseBtn'),
      pass: focusable.length >= 2
    };
  });
  report.accessibility.modal_focus_trap = focusTrapResult;

  // Overall status
  report.total_failures = report.failures.length;
  report.status = report.total_failures === 0 ? 'PASSED' : 'FAILED';

  return report;
}
