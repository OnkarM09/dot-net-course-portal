/**
 * ASP.NET Core Masterclass Documentation Portal - Global Search Engine & Modal
 * Offline-First, Zero External Dependency, Fast Token-Based Fuzzy Search
 * WCAG 2.2 AA Focus Trap, Keyboard Accessible, ARIA Compliant
 */

(function () {
  'use strict';

  // Determine relative root path depending on whether we are in /sections/ or root
  const isInSectionsDir = window.location.pathname.includes('/sections/');
  const rootPath = isInSectionsDir ? '../' : './';

  let lastActiveTrigger = null;
  let selectedIndex = -1;
  let currentResults = [];

  // Ensure Search Modal HTML exists in DOM
  function injectSearchModal() {
    if (document.querySelector('.search-modal-backdrop')) return;

    const modalHtml = `
      <div class="search-modal-backdrop" id="searchModalBackdrop" role="dialog" aria-modal="true" aria-label="Search ASP.NET Core Documentation" tabindex="-1">
        <div class="search-modal" role="document">
          <div class="search-modal-header">
            <span class="search-input-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input type="text" class="search-modal-input" id="searchModalInput" placeholder="Search topics, syntax, concepts (e.g. 'Partial Views', 'Dependency Injection', 'JWT')..." autocomplete="off" spellcheck="false" aria-label="Search curriculum query" />
            <button class="search-close-btn" id="searchCloseBtn" aria-label="Close search dialog" type="button">ESC</button>
          </div>
          <div class="search-modal-results" id="searchResultsContainer" role="listbox" aria-label="Search Results">
            <div class="search-empty">Type keywords above to search all 30 sections across the curriculum.</div>
          </div>
          <div class="search-modal-footer">
            <span><kbd class="kbd-shortcut">↑</kbd> <kbd class="kbd-shortcut">↓</kbd> to navigate</span>
            <span><kbd class="kbd-shortcut">Enter</kbd> to select</span>
            <span><kbd class="kbd-shortcut">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const backdrop = document.getElementById('searchModalBackdrop');
    const closeBtn = document.getElementById('searchCloseBtn');
    const input = document.getElementById('searchModalInput');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeSearchModal);
    }

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeSearchModal();
        }
      });
    }

    if (input) {
      input.addEventListener('input', (e) => {
        const query = e.target.value;
        const results = search(query);
        renderResults(results);
      });

      input.addEventListener('keydown', handleKeyNavigation);
    }

    // Trap focus inside modal
    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearchModal();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = backdrop.querySelectorAll('input, button, a[href], [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });
  }

  function openSearchModal(triggerElement) {
    injectSearchModal();
    lastActiveTrigger = triggerElement || document.activeElement;
    const backdrop = document.getElementById('searchModalBackdrop');
    const input = document.getElementById('searchModalInput');
    if (!backdrop || !input) return;

    backdrop.classList.add('open');
    input.value = '';
    input.focus();
    renderResults([]);
  }

  function closeSearchModal() {
    const backdrop = document.getElementById('searchModalBackdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
    }
    if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
      lastActiveTrigger.focus();
    }
  }

  function highlightMatches(text, terms) {
    if (!text || !terms || terms.length === 0) return escapeHtml(text || '');
    let escaped = escapeHtml(text);
    terms.forEach(term => {
      if (!term) return;
      const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
      escaped = escaped.replace(regex, '<span class="search-highlight">$1</span>');
    });
    return escaped;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function search(query) {
    if (!window.SEARCH_INDEX || !Array.isArray(window.SEARCH_INDEX)) {
      return [];
    }

    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const terms = cleanQuery.split(/\s+/).filter(t => t.length > 0);
    const scored = [];

    window.SEARCH_INDEX.forEach(item => {
      let score = 0;
      const titleLower = (item.title || '').toLowerCase();
      const sectionLower = (item.sectionTitle || '').toLowerCase();
      const keywordsLower = (item.keywords || []).join(' ').toLowerCase();
      const snippetLower = (item.snippet || '').toLowerCase();

      let allMatched = true;

      terms.forEach(term => {
        let termMatched = false;
        if (titleLower.includes(term)) {
          score += 150;
          if (titleLower.startsWith(term)) score += 50;
          termMatched = true;
        }
        if (sectionLower.includes(term)) {
          score += 80;
          termMatched = true;
        }
        if (keywordsLower.includes(term)) {
          score += 60;
          termMatched = true;
        }
        if (snippetLower.includes(term)) {
          score += 30;
          termMatched = true;
        }
        if (!termMatched) {
          allMatched = false;
        }
      });

      if (allMatched && score > 0) {
        scored.push({ item, score, terms });
      }
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 30).map(s => ({ ...s.item, terms: s.terms }));
  }

  function renderResults(results) {
    const container = document.getElementById('searchResultsContainer');
    if (!container) return;

    currentResults = results;
    selectedIndex = results.length > 0 ? 0 : -1;

    if (results.length === 0) {
      const input = document.getElementById('searchModalInput');
      const val = input ? input.value.trim() : '';
      if (val) {
        container.innerHTML = `<div class="search-empty">No topics found matching "<strong>${escapeHtml(val)}</strong>". Try broader keywords.</div>`;
      } else {
        container.innerHTML = `<div class="search-empty">Type keywords above to search all 30 sections across the curriculum.</div>`;
      }
      return;
    }

    let html = '';
    results.forEach((res, index) => {
      // Resolve link according to rootPath
      let targetUrl = res.url;
      if (isInSectionsDir) {
        if (!targetUrl.startsWith('section-') && !targetUrl.startsWith('../')) {
          targetUrl = targetUrl.replace(/^sections\//, '');
        }
      } else {
        if (!targetUrl.startsWith('sections/')) {
          targetUrl = 'sections/' + targetUrl;
        }
      }

      const isSelected = index === selectedIndex;
      html += `
        <a href="${targetUrl}" class="search-result-item ${isSelected ? 'selected' : ''}" role="option" aria-selected="${isSelected}" data-index="${index}">
          <div class="search-result-header">
            <span class="search-result-section">${escapeHtml(res.sectionTitle || ('Section ' + res.sectionNum))}</span>
            <span class="search-result-module">${escapeHtml(res.moduleTitle || '')}</span>
          </div>
          <div class="search-result-title">${highlightMatches(res.title, res.terms)}</div>
          ${res.snippet ? `<div class="search-result-snippet">${highlightMatches(res.snippet, res.terms)}</div>` : ''}
        </a>
      `;
    });

    container.innerHTML = html;

    // Attach click listeners
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        updateSelection(idx);
      });
    });
  }

  function updateSelection(newIndex) {
    const container = document.getElementById('searchResultsContainer');
    if (!container) return;

    const items = container.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    items.forEach(it => {
      it.classList.remove('selected');
      it.setAttribute('aria-selected', 'false');
    });

    if (newIndex >= 0 && newIndex < items.length) {
      selectedIndex = newIndex;
      const selected = items[selectedIndex];
      selected.classList.add('selected');
      selected.setAttribute('aria-selected', 'true');
      selected.scrollIntoView({ block: 'nearest' });
    } else {
      selectedIndex = -1;
    }
  }

  function handleKeyNavigation(e) {
    if (currentResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (selectedIndex + 1) % currentResults.length;
      updateSelection(nextIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
      updateSelection(prevIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
        const container = document.getElementById('searchResultsContainer');
        const selected = container ? container.querySelector(`.search-result-item[data-index="${selectedIndex}"]`) : null;
        if (selected) {
          window.location.href = selected.getAttribute('href');
        }
      }
    }
  }

  // Keyboard shortcut listener Ctrl+K / Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const modal = document.querySelector('.search-modal-backdrop');
      if (modal && modal.classList.contains('open')) {
        closeSearchModal();
      } else {
        openSearchModal();
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Ensure Search Modal is injected into the DOM on initial load
    injectSearchModal();

    // Attach to all search trigger buttons
    document.querySelectorAll('.search-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openSearchModal(btn);
      });
    });
  });
})();
