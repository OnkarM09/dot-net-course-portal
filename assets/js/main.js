/**
 * ASP.NET Core Masterclass Documentation Portal - Main Script
 * Offline-First, Zero Build Step, WCAG 2.2 Accessible
 */

(function () {
  'use strict';

  // 1. Storage Keys
  const STORAGE_KEY_THEME = 'dotnet_docs_theme';
  const STORAGE_KEY_SIDEBAR = 'dotnet_sidebar_collapsed';
  const STORAGE_KEY_COMPLETED = 'dotnet_completed_sections';

  // Helper for polite live-region announcements
  function announceLive(message) {
    let region = document.getElementById('globalLiveRegion');
    if (!region) {
      region = document.createElement('div');
      region.id = 'globalLiveRegion';
      region.className = 'visually-hidden';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      document.body.appendChild(region);
    }
    region.textContent = '';
    setTimeout(() => {
      region.textContent = message;
    }, 50);
  }

  // 2. Sidebar State Management
  function initSidebarState() {
    const isCollapsed = localStorage.getItem(STORAGE_KEY_SIDEBAR) === 'true';
    if (isCollapsed && window.innerWidth > 900) {
      document.body.classList.add('sidebar-collapsed');
      updateSidebarToggleBtn(true);
    } else if (window.innerWidth <= 900) {
      document.body.classList.remove('sidebar-collapsed');
    }
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 900) {
      document.body.classList.remove('sidebar-collapsed');
    } else {
      const isCollapsed = localStorage.getItem(STORAGE_KEY_SIDEBAR) === 'true';
      if (isCollapsed) {
        document.body.classList.add('sidebar-collapsed');
        updateSidebarToggleBtn(true);
      }
    }
  });

  function toggleSidebarCollapsed() {
    const isNowCollapsed = document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem(STORAGE_KEY_SIDEBAR, isNowCollapsed ? 'true' : 'false');
    updateSidebarToggleBtn(isNowCollapsed);
  }

  function updateSidebarToggleBtn(isCollapsed) {
    const btns = document.querySelectorAll('.sidebar-toggle-btn, #sidebarToggleBtn');
    btns.forEach(btn => {
      const label = btn.querySelector('.sidebar-toggle-text');
      if (label) {
        label.textContent = isCollapsed ? '» Expand' : '« Collapse';
      }
      btn.setAttribute('aria-expanded', (!isCollapsed).toString());
    });
  }

  // 3. Theme Management
  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    updateThemeToggleIcons(theme);
  }

  function updateThemeToggleIcons(theme) {
    const btns = document.querySelectorAll('.theme-toggle-btn');
    btns.forEach(btn => {
      btn.innerHTML = theme === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    });
  }

  // Initialize theme immediately to avoid flash
  applyTheme(getPreferredTheme());

  // 4. Section Completion Tracking
  function getCompletedSections() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMPLETED);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveCompletedSections(list) {
    localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(list));
  }

  function updateCompletionUI() {
    const completedList = getCompletedSections();

    // Check if on a section page
    const completeBtn = document.getElementById('markCompleteBtn');
    if (completeBtn) {
      const secMatch = window.location.pathname.match(/section-(\d+)\.html/i);
      if (secMatch) {
        const secId = secMatch[1].padStart(2, '0');
        const isComplete = completedList.includes(secId);
        completeBtn.classList.toggle('completed', isComplete);
        completeBtn.setAttribute('aria-pressed', isComplete.toString());
        const textSpan = completeBtn.querySelector('.complete-text');
        if (textSpan) {
          textSpan.textContent = isComplete ? '✓ Section Completed' : 'Mark Section Complete';
        }
      }
    }

    // Check if on homepage directory
    const directoryRows = document.querySelectorAll('[data-section-num]');
    directoryRows.forEach(row => {
      const secId = row.getAttribute('data-section-num').padStart(2, '0');
      const isComplete = completedList.includes(secId);
      const badge = row.querySelector('.completion-indicator');
      if (badge) {
        badge.textContent = isComplete ? '✓ Done' : 'Pending';
        badge.className = `completion-indicator tag-pill ${isComplete ? 'completed' : ''}`;
      }
    });

    // Update homepage completion stats if present
    const completedStat = document.getElementById('completedSectionsCount');
    if (completedStat) {
      completedStat.textContent = completedList.length;
    }
  }

  function toggleSectionCompletion() {
    const secMatch = window.location.pathname.match(/section-(\d+)\.html/i);
    if (!secMatch) return;
    const secId = secMatch[1].padStart(2, '0');
    let completedList = getCompletedSections();

    const idx = completedList.indexOf(secId);
    let nowComplete = false;
    if (idx >= 0) {
      completedList.splice(idx, 1);
      nowComplete = false;
    } else {
      completedList.push(secId);
      nowComplete = true;
    }

    saveCompletedSections(completedList);
    updateCompletionUI();
    announceLive(nowComplete ? `Section ${secId} marked as completed.` : `Section ${secId} marked as incomplete.`);
  }

  // 5. Offline Multi-Language Syntax Highlighter
  function escapeCodeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tokenizeCode(code, lang) {
    const csharpKeywords = '\\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|async|await|record|var|get|set|init|value|yield|import|export|from|function|let|type|any)\\b';
    const knownTypes = '\\b(Task|IResult|IActionResult|HttpContext|WebApplication|WebApplicationBuilder|IServiceCollection|DbContext|ClaimsPrincipal|ClaimsIdentity|Claim|StringValues|EndpointFilterInvocationContext|EndpointFilterInvocationDelegate|RouteValueDictionary|ActionContext|ControllerBase|Controller|ViewResult|JsonResult|ContentResult|StatusCodeResult|RedirectResult|RedirectToActionResult|LocalRedirectResult)\\b';

    const regex = new RegExp([
      '(?<comment>\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/)',
      '(?<string>@"(?:""|[^"])*"|"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')',
      '(?<directive>@[A-Za-z0-9_]+)',
      '(?<number>\\b\\d+(\\.\\d+)?([fFdDmMuUlL])?\\b)',
      `(?<keyword>${csharpKeywords})`,
      `(?<type>${knownTypes})`,
      '(?<method>\\b[A-Za-z0-9_]+(?=\\())',
      '(?<other>[\\s\\S])'
    ].join('|'), 'g');

    let result = '';
    let match;
    while ((match = regex.exec(code)) !== null) {
      const g = match.groups;
      if (g.comment) {
        result += `<span class="token-comment">${escapeCodeHtml(g.comment)}</span>`;
      } else if (g.string) {
        if (lang === 'json' && /:\s*$/.test(code.slice(match.index + g.string.length, match.index + g.string.length + 3))) {
          result += `<span class="token-property">${escapeCodeHtml(g.string)}</span>`;
        } else {
          result += `<span class="token-string">${escapeCodeHtml(g.string)}</span>`;
        }
      } else if (g.directive) {
        result += `<span class="token-keyword">${escapeCodeHtml(g.directive)}</span>`;
      } else if (g.number) {
        result += `<span class="token-number">${escapeCodeHtml(g.number)}</span>`;
      } else if (g.keyword) {
        result += `<span class="token-keyword">${escapeCodeHtml(g.keyword)}</span>`;
      } else if (g.type) {
        result += `<span class="token-type">${escapeCodeHtml(g.type)}</span>`;
      } else if (g.method) {
        result += `<span class="token-method">${escapeCodeHtml(g.method)}</span>`;
      } else {
        result += escapeCodeHtml(g.other);
      }
    }
    return result;
  }

  function highlightCodeBlocks() {
    const codeElements = document.querySelectorAll('.code-block pre code, .code-block-container pre code');
    codeElements.forEach(block => {
      const langClass = Array.from(block.classList).find(c => c.startsWith('language-')) || 'language-csharp';
      const lang = langClass.replace('language-', '');
      const raw = block.textContent;
      if (!raw) return;

      const highlighted = tokenizeCode(raw, lang);
      block.innerHTML = highlighted;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSidebarState();
    updateCompletionUI();
    highlightCodeBlocks();

    // Attach mark complete listener
    const markCompleteBtn = document.getElementById('markCompleteBtn');
    if (markCompleteBtn) {
      markCompleteBtn.addEventListener('click', toggleSectionCompletion);
    }

    // Attach sidebar collapse/expand listener
    document.querySelectorAll('.sidebar-toggle-btn, .sidebar-collapse-btn, .expand-sidebar-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const sidebar = document.querySelector('.docs-sidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (window.innerWidth <= 900) {
          if (sidebar) sidebar.classList.remove('open');
          if (backdrop) backdrop.classList.remove('open');
        } else {
          toggleSidebarCollapsed();
        }
      });
    });

    // Attach theme toggle listener
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        announceLive(`Switched to ${next} theme.`);
      });
    });

    // Mobile Sidebar Drawer
    const navToggle = document.querySelector('.nav-toggle-btn');
    const sidebar = document.querySelector('.docs-sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (navToggle && sidebar) {
      navToggle.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', isOpen.toString());
      });

      if (backdrop) {
        backdrop.addEventListener('click', () => {
          sidebar.classList.remove('open');
          backdrop.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        });
      }

      sidebar.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 900) {
            sidebar.classList.remove('open');
            if (backdrop) backdrop.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }

    // Code Block Copy Functionality
    document.querySelectorAll('.copy-btn, .copy-code-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const container = btn.closest('.code-block, .code-block-container');
        if (!container) return;
        const codeElem = container.querySelector('pre code') || container.querySelector('pre');
        if (!codeElem) return;

        const textToCopy = codeElem.innerText;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
          } else {
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }

          const originalHtml = btn.innerHTML;
          const textNode = btn.querySelector('.copy-feedback') || btn;
          if (textNode !== btn) {
            textNode.textContent = 'Copied!';
          } else {
            btn.innerHTML = '✓ Copied!';
          }
          btn.classList.add('copied');
          announceLive('Code copied to clipboard');

          setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code: ', err);
          announceLive('Failed to copy code');
        }
      });
    });

    // Sidebar Real-Time Filtering
    const filterInput = document.querySelector('.sidebar-filter-input');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('.sidebar-nav-item');
        const groups = document.querySelectorAll('.sidebar-group');

        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(term) ? '' : 'none';
        });

        groups.forEach(group => {
          const visibleItems = group.querySelectorAll('.sidebar-nav-item:not([style*="display: none"])');
          group.style.display = visibleItems.length === 0 ? 'none' : '';
        });
      });
    }

    // Table of Contents ScrollSpy
    const tocLinks = document.querySelectorAll('.toc-link');
    const headings = Array.from(document.querySelectorAll('.docs-content h2[id], .docs-content h3[id]'));

    if (tocLinks.length > 0 && headings.length > 0) {
      const observerCallback = () => {
        const scrollY = window.scrollY;
        let activeHeading = null;

        for (let i = 0; i < headings.length; i++) {
          const heading = headings[i];
          const top = heading.getBoundingClientRect().top + window.scrollY - 100;
          if (scrollY >= top) {
            activeHeading = heading;
          } else {
            break;
          }
        }

        if (!activeHeading && headings.length > 0) {
          activeHeading = headings[0];
        }

        if (activeHeading) {
          const id = activeHeading.getAttribute('id');
          tocLinks.forEach(link => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
              link.setAttribute('aria-current', 'true');
            } else {
              link.classList.remove('active');
              link.removeAttribute('aria-current');
            }
          });
        }
      };

      window.addEventListener('scroll', observerCallback, { passive: true });
      observerCallback();
    }

    // Smooth scrolling offset fix when clicking on in-page hashes
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href').substring(1);
        if (!targetId) return;
        const targetElem = document.getElementById(targetId);
        if (targetElem) {
          e.preventDefault();
          history.pushState(null, null, `#${targetId}`);
          targetElem.scrollIntoView({ behavior: 'smooth' });
          targetElem.focus({ preventScroll: true });
        }
      });
    });

    // Homepage Directory Filter
    const dirFilter = document.getElementById('directoryFilter');
    if (dirFilter) {
      dirFilter.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#directoryTableBody tr');
        let visibleCount = 0;
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          const matches = text.includes(query);
          row.style.display = matches ? '' : 'none';
          if (matches) visibleCount++;
        });

        const emptyMsg = document.getElementById('directoryEmptyState');
        if (emptyMsg) {
          emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
        }
      });
    }

    // Header elevation on scroll
    const header = document.querySelector('.top-header');
    if (header) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }, { passive: true });
    }

    // Floating Back to Top button
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (backToTopBtn) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 350) {
          backToTopBtn.classList.add('visible');
        } else {
          backToTopBtn.classList.remove('visible');
        }
      }, { passive: true });

      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });
})();
