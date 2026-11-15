async (page) => {
  const BASE_URL = 'http://127.0.0.1:4174';

  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Check Section 01
  await page.goto(`${BASE_URL}/sections/section-01.html`, { waitUntil: 'domcontentloaded' });
  const sec01Nav = await page.evaluate(() => {
    const nav = document.querySelector('.bottom-nav');
    const cards = nav.querySelectorAll('.nav-card');
    const rectNav = nav.getBoundingClientRect();
    const rectCard = cards[0]?.getBoundingClientRect();
    const computedNav = window.getComputedStyle(nav);
    const computedCard = cards[0] ? window.getComputedStyle(cards[0]) : null;

    return {
      cards_count: cards.length,
      nav_display: computedNav.display,
      card_width: rectCard?.width,
      nav_width: rectNav.width,
      ratio: rectCard?.width / rectNav.width,
      card_text_align: computedCard?.textAlign,
      card_align_items: computedCard?.alignItems,
      has_left_gap: (rectCard?.left - rectNav.left) > 5
    };
  });

  // 2. Check Section 15 (middle section, has both prev and next)
  await page.goto(`${BASE_URL}/sections/section-15.html`, { waitUntil: 'domcontentloaded' });
  const sec15Nav = await page.evaluate(() => {
    const nav = document.querySelector('.bottom-nav');
    const cards = nav.querySelectorAll('.nav-card');
    const rectNav = nav.getBoundingClientRect();
    const rectCard0 = cards[0]?.getBoundingClientRect();
    const rectCard1 = cards[1]?.getBoundingClientRect();

    return {
      cards_count: cards.length,
      card0_width: rectCard0?.width,
      card1_width: rectCard1?.width,
      nav_width: rectNav.width,
      both_cards_equal: Math.abs(rectCard0?.width - rectCard1?.width) < 2
    };
  });

  // 3. Check Section 30 (last section, only prev)
  await page.goto(`${BASE_URL}/sections/section-30.html`, { waitUntil: 'domcontentloaded' });
  const sec30Nav = await page.evaluate(() => {
    const nav = document.querySelector('.bottom-nav');
    const cards = nav.querySelectorAll('.nav-card');
    const rectNav = nav.getBoundingClientRect();
    const rectCard = cards[0]?.getBoundingClientRect();
    const computedCard = cards[0] ? window.getComputedStyle(cards[0]) : null;

    return {
      cards_count: cards.length,
      card_width: rectCard?.width,
      nav_width: rectNav.width,
      ratio: rectCard?.width / rectNav.width,
      card_text_align: computedCard?.textAlign,
      card_align_items: computedCard?.alignItems,
      has_left_gap: (rectCard?.left - rectNav.left) > 5
    };
  });

  return {
    sec01: sec01Nav,
    sec15: sec15Nav,
    sec30: sec30Nav
  };
}
