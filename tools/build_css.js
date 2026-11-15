const fs = require('fs');
const path = require('path');

const cssContent = `/* ==========================================================================
   ASP.NET Core Masterclass Documentation Portal - Modern Developer Theme
   Offline-First, Zero-Dependency, Pure Modern CSS & Design System
   Benchmarked against Microsoft Learn, Vercel Docs, Stripe Docs & Linear
   ========================================================================== */

:root {
  /* Color Palette - Dark Mode Default (Obsidian Slate & Vibrant .NET Violet) */
  --bg-app: #080b11;
  --bg-surface: #0f1420;
  --bg-surface-elevated: #161e30;
  --bg-sidebar: #0a0e17;
  --bg-sidebar-active: #1a2338;
  --bg-header: rgba(8, 11, 17, 0.88);
  --border-subtle: #1e293f;
  --border-strong: #2d3b59;
  
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  
  --accent-primary: #a78bfa;
  --accent-primary-hover: #c4b5fd;
  --accent-secondary: #06b6d4;
  --accent-glow: rgba(167, 139, 250, 0.20);
  --accent-soft: rgba(167, 139, 250, 0.12);
  
  /* Code blocks always maintain deep IDE dark styling for maximum token contrast */
  --code-bg: #0b0f19;
  --code-border: #1e283d;
  --code-text: #f1f5f9;
  --code-header-bg: #111726;
  
  /* Callout colors */
  --callout-original-border: #6366f1;
  --callout-original-bg: rgba(99, 102, 241, 0.08);
  --callout-original-badge: #818cf8;

  --callout-deepdive-border: #8b5cf6;
  --callout-deepdive-bg: rgba(139, 92, 246, 0.08);
  --callout-deepdive-badge: #a78bfa;

  --callout-tip-border: #10b981;
  --callout-tip-bg: rgba(16, 185, 129, 0.08);
  --callout-tip-badge: #34d399;

  --callout-warning-border: #f59e0b;
  --callout-warning-bg: rgba(245, 158, 11, 0.08);
  --callout-warning-badge: #fbbf24;

  --table-border: #1e293f;
  --table-header-bg: #141b2a;
  --table-zebra: rgba(22, 30, 48, 0.45);

  --sidebar-width: 295px;
  --toc-width: 250px;
  --header-height: 64px;
  --content-max-width: 880px;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 14px -2px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 14px 28px -4px rgba(0, 0, 0, 0.65);
  --shadow-glow: 0 0 24px -4px var(--accent-glow);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 9999px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, Menlo, Monaco, monospace;
}

/* Light Theme Variables */
[data-theme="light"] {
  --bg-app: #f8fafc;
  --bg-surface: #ffffff;
  --bg-surface-elevated: #f1f5f9;
  --bg-sidebar: #f8fafc;
  --bg-sidebar-active: #ede9fe;
  --bg-header: rgba(248, 250, 252, 0.90);
  --border-subtle: #e2e8f0;
  --border-strong: #cbd5e1;
  
  --text-main: #0f172a;
  --text-muted: #475569;
  --text-dim: #64748b;
  
  --accent-primary: #6d28d9;
  --accent-primary-hover: #5b21b6;
  --accent-secondary: #0284c7;
  --accent-glow: rgba(109, 40, 217, 0.15);
  --accent-soft: rgba(109, 40, 217, 0.08);
  
  --code-bg: #f3f4f6;
  --code-border: #e5e7eb;
  --code-text: #0f172a;
  --code-header-bg: #e5e7eb;
  
  --callout-original-border: #4f46e5;
  --callout-original-bg: #eef2ff;
  --callout-original-badge: #4338ca;

  --callout-deepdive-border: #7e22ce;
  --callout-deepdive-bg: #faf5ff;
  --callout-deepdive-badge: #6b21a8;

  --callout-tip-border: #059669;
  --callout-tip-bg: #f0fdf4;
  --callout-tip-badge: #047857;

  --callout-warning-border: #d97706;
  --callout-warning-bg: #fffbeb;
  --callout-warning-badge: #b45309;

  --table-border: #e2e8f0;
  --table-header-bg: #f1f5f9;
  --table-zebra: #f8fafc;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 12px 24px -4px rgba(0, 0, 0, 0.10);
  --shadow-glow: 0 0 20px -2px var(--accent-glow);
}

/* ==========================================================================
   Base Reset & Typography
   ========================================================================== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 15px;
  scroll-behavior: smooth;
  scroll-padding-top: calc(var(--header-height) + 24px);
  overflow-x: clip;
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg-app);
  color: var(--text-main);
  line-height: 1.68;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s ease, color 0.2s ease;
  overflow-x: clip;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: var(--accent-primary);
  text-decoration: none;
  transition: color 0.15s ease, opacity 0.15s ease;
}
a:hover {
  color: var(--accent-primary-hover);
}

/* Accessible Skip Link */
.skip-link {
  position: absolute;
  top: -100px;
  left: 1rem;
  background: var(--accent-primary);
  color: #ffffff;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  z-index: 1000;
  transition: top 0.2s ease;
}
.skip-link:focus {
  top: 1rem;
  outline: 3px solid #ffffff;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus visibility for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* ==========================================================================
   Top Navigation Header
   ========================================================================== */
.top-header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: var(--header-height);
  background: var(--bg-header);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.top-header.scrolled {
  border-bottom-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: var(--text-main);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}
.brand-link:hover {
  color: var(--text-main);
  opacity: 0.92;
}

.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-text {
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.version-pill {
  font-size: 0.72rem;
  font-weight: 600;
  font-family: var(--font-mono);
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: var(--accent-soft);
  color: var(--accent-primary);
  border: 1px solid var(--accent-glow);
}

.header-nav-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-left: 1.5rem;
}

.header-nav-link {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s ease;
}
.header-nav-link:hover {
  color: var(--text-main);
}
.header-nav-link.active {
  color: var(--accent-primary);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Search Trigger Button */
.search-trigger-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.search-trigger-btn:hover {
  background: var(--bg-surface-elevated);
  border-color: var(--border-strong);
  color: var(--text-main);
}

.search-icon {
  display: inline-flex;
  opacity: 0.75;
}

.search-text {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbd-shortcut {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 2px 6px;
  color: var(--text-dim);
}

/* Theme Toggle Button */
.theme-toggle-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.theme-toggle-btn:hover {
  background: var(--bg-surface-elevated);
  border-color: var(--border-strong);
  color: var(--text-main);
}

/* Nav toggle button for mobile */
.nav-toggle-btn {
  display: none;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  border-radius: var(--radius-sm);
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Sidebar Toggle button on desktop header */
.sidebar-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.sidebar-toggle-btn:hover {
  background: var(--bg-surface-elevated);
  color: var(--text-main);
  border-color: var(--border-strong);
}

/* ==========================================================================
   Homepage Hero Section
   ========================================================================== */
.portal-hero {
  padding: 4.5rem 1.5rem 3rem 1.5rem;
  text-align: center;
  max-width: 960px;
  margin: 0 auto;
  position: relative;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  border-radius: var(--radius-pill);
  background: var(--accent-soft);
  color: var(--accent-primary);
  border: 1px solid var(--accent-glow);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 1.5rem;
  box-shadow: 0 0 16px -2px var(--accent-glow);
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--accent-primary);
  box-shadow: 0 0 8px var(--accent-primary);
  display: inline-block;
  animation: pulseDot 2s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.portal-hero h1 {
  font-size: 2.85rem;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.18;
  margin-bottom: 1.25rem;
  color: var(--text-main);
  text-wrap: balance;
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

[data-theme="light"] .portal-hero h1 {
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.portal-hero-lead {
  font-size: 1.15rem;
  color: var(--text-muted);
  max-width: 740px;
  margin: 0 auto 2.25rem auto;
  line-height: 1.62;
}

.hero-cta-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2.25rem;
}

.hero-cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: #ffffff !important;
  font-weight: 600;
  font-size: 0.98rem;
  padding: 11px 24px;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 14px -1px var(--accent-glow);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid transparent;
}
.hero-cta-primary:hover {
  background: var(--accent-primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -2px var(--accent-glow);
  color: #ffffff !important;
}

.hero-cta-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-surface);
  color: var(--text-main);
  border: 1px solid var(--border-subtle);
  font-weight: 600;
  font-size: 0.98rem;
  padding: 11px 22px;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}
.hero-cta-secondary:hover {
  background: var(--bg-surface-elevated);
  border-color: var(--border-strong);
  color: var(--text-main);
  transform: translateY(-2px);
}

.hero-chips-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
  max-width: 820px;
  margin: 0 auto;
}

.hero-chip {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-dim);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
}
.hero-chip:hover {
  border-color: var(--border-strong);
  color: var(--text-muted);
}

/* ==========================================================================
   Continue Learning Component
   ========================================================================== */
.continue-learning-section {
  max-width: 1200px;
  margin: 0 auto 2.5rem auto;
  padding: 0 1.5rem;
}

.continue-card {
  background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%);
  border: 1px solid var(--accent-glow);
  border-radius: var(--radius-lg);
  padding: 1.5rem 1.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  box-shadow: var(--shadow-sm), 0 0 20px -5px var(--accent-glow);
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.continue-card:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-md), 0 0 24px -3px var(--accent-glow);
}

.continue-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--accent-primary);
}

.continue-card-left {
  flex: 1;
  min-width: 0;
}

.continue-pill-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.continue-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-primary);
  display: inline-block;
  animation: pulseDot 2s infinite ease-in-out;
}

.continue-meta {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.continue-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.35rem;
  line-height: 1.3;
}

.continue-sub {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 0.85rem;
  line-height: 1.5;
}

.continue-progress-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.progress-bar-bg {
  width: 180px;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  border-radius: var(--radius-pill);
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-dim);
}

.progress-badge {
  font-size: 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.continue-card-right {
  flex-shrink: 0;
}

.continue-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: #ffffff !important;
  font-weight: 600;
  font-size: 0.92rem;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px -2px var(--accent-glow);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}
.continue-action-btn:hover {
  background: var(--accent-primary-hover);
  transform: translateY(-2px);
  color: #ffffff !important;
}

/* ==========================================================================
   Platform Learning Statistics Row
   ========================================================================== */
.portal-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto 3.5rem auto;
  padding: 0 1.5rem;
}

.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.35rem 1.25rem;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.stat-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.85rem;
}

.stat-number {
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 0.35rem;
}

.stat-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 0.2rem;
}

.stat-sub {
  font-size: 0.78rem;
  color: var(--text-dim);
}

/* ==========================================================================
   Curriculum Modules Section & Cards
   ========================================================================== */
.modules-section {
  max-width: 1200px;
  margin: 0 auto 4rem auto;
  padding: 0 1.5rem;
}

.section-group-heading {
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.025em;
  margin-bottom: 0.4rem;
}

.section-group-sub {
  font-size: 1rem;
  color: var(--text-muted);
  margin-bottom: 2rem;
  max-width: 680px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  margin-bottom: 3.5rem;
}

@media (max-width: 1200px) {
  .modules-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .modules-grid {
    grid-template-columns: 1fr;
  }
}

.module-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.35rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
  position: relative;
}
.module-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-3px);
  box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--accent-glow);
}

.module-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.module-badge {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
}

.module-sec-count-badge {
  font-size: 0.72rem;
  color: var(--text-dim);
  font-weight: 500;
  background: var(--bg-surface-elevated);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-subtle);
}

.module-card-body {
  margin-bottom: 0.85rem;
}

.module-card-title {
  font-size: 1.12rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.35;
  margin-bottom: 0.45rem;
}

.module-card-desc {
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.48;
  margin: 0;
}

.module-card-focus {
  margin-bottom: 0.85rem;
}

.module-focus-label,
.module-sec-pills-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--text-dim);
  margin-bottom: 0.45rem;
}

.module-focus-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.module-focus-tag {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: var(--bg-surface-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}

.module-card-sections-row {
  margin-bottom: 0.85rem;
}

.module-sec-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.module-sec-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
  text-decoration: none;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.module-sec-pill:hover {
  background: var(--accent-glow);
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}
.module-sec-pill.completed {
  border-color: rgba(16, 185, 129, 0.4);
  color: #34d399;
  background: rgba(16, 185, 129, 0.1);
}
.module-sec-pill.completed::after {
  content: '✓';
  font-size: 0.68rem;
  font-weight: 700;
  margin-left: 2px;
}

.module-card-sections {
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.85rem;
  margin-bottom: 1.25rem;
}

.module-card-sections-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--text-dim);
  margin-bottom: 0.6rem;
}

.module-sec-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
}

.module-sec-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-elevated);
  border: 1px solid transparent;
  transition: all 0.15s ease;
  text-decoration: none;
}
.module-sec-item:hover {
  background: var(--bg-sidebar-active);
  border-color: var(--border-subtle);
}

.module-sec-item-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.module-sec-item-link:hover {
  color: var(--accent-primary);
}

.module-sec-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.module-sec-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--text-dim);
}

.sec-cs-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.module-card-footer {
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.module-card-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-dim);
}

.module-card-progress-bar {
  width: 55px;
  height: 4px;
  background: var(--bg-app);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.module-card-progress-fill {
  height: 100%;
  background: var(--accent-primary);
  border-radius: var(--radius-pill);
  width: 0%;
  transition: width 0.3s ease;
}

.module-card-action {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent-primary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  transition: gap 0.15s ease;
}
.module-card-action:hover {
  gap: 8px;
  color: var(--accent-primary-hover);
}

/* ==========================================================================
   Curriculum Explorer (Directory Table & Filter Pills)
   ========================================================================== */
.directory-section {
  max-width: 1200px;
  margin: 0 auto 5rem auto;
  padding: 0 1.5rem;
}

.filter-pills-container {
  margin-bottom: 1.5rem;
}

.filter-pills-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--text-dim);
  margin-bottom: 0.65rem;
}

.filter-pills-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-pill {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.filter-pill:hover {
  border-color: var(--border-strong);
  color: var(--text-main);
  background: var(--bg-surface-elevated);
}
.filter-pill.active {
  background: var(--accent-primary);
  color: #ffffff;
  border-color: var(--accent-primary);
  box-shadow: 0 2px 8px -1px var(--accent-glow);
}

.directory-filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.directory-search-box {
  width: 360px;
  max-width: 100%;
  position: relative;
}

.directory-search-input {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  padding: 9px 14px 9px 36px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.directory-search-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.directory-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-dim);
  pointer-events: none;
}

/* Data Table Styling */
.table-responsive {
  width: 100%;
  max-height: 650px;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

thead th {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--table-header-bg);
  backdrop-filter: blur(8px);
  color: var(--text-dim);
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--table-border);
  white-space: nowrap;
}

tbody tr {
  border-bottom: 1px solid var(--table-border);
  transition: background-color 0.15s ease;
}
tbody tr:last-child {
  border-bottom: none;
}
tbody tr:nth-child(even) td {
  background: var(--table-zebra);
}
tbody tr:hover td {
  background: rgba(139, 92, 246, 0.06);
}

tbody td {
  padding: 12px 16px;
  vertical-align: middle;
  color: var(--text-muted);
}

.directory-sec-num {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--accent-primary);
}

.directory-sec-title {
  font-weight: 600;
  color: var(--text-main);
  text-decoration: none;
  display: block;
  transition: color 0.15s ease;
}
.directory-sec-title:hover {
  color: var(--accent-primary);
}

.tag-pill {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.completion-indicator {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--bg-surface-elevated);
  color: var(--text-dim);
  border: 1px solid var(--border-subtle);
  font-weight: 500;
}
.completion-indicator.completed {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.35);
  font-weight: 600;
}

.directory-read-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.directory-read-btn:hover {
  background: var(--accent-primary);
  color: #ffffff !important;
  border-color: var(--accent-primary);
}

.directory-empty-state {
  display: none;
  padding: 3.5rem 1.5rem;
  text-align: center;
  color: var(--text-muted);
}
.empty-state-icon {
  font-size: 2.2rem;
  margin-bottom: 0.75rem;
  opacity: 0.6;
}
.empty-state-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.35rem;
}
.empty-state-btn {
  margin-top: 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--accent-primary);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.empty-state-btn:hover {
  background: var(--bg-surface-elevated);
}

/* ==========================================================================
   Documentation Page Layout
   ========================================================================== */
.docs-wrapper {
  display: flex;
  position: relative;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* Left Sidebar */
.docs-sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  position: sticky;
  top: var(--header-height);
  height: calc(100vh - var(--header-height));
  overflow-y: auto;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
  padding: 1.25rem 1rem 2.5rem 1.25rem;
  transition: transform 0.25s ease;
}

.sidebar-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.sidebar-top-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.sidebar-collapse-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.sidebar-collapse-btn:hover {
  background: var(--bg-surface-elevated);
  color: var(--text-main);
  border-color: var(--border-strong);
}

.sidebar-search-box {
  margin-bottom: 1.25rem;
}

.sidebar-filter-input {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  outline: none;
}
.sidebar-filter-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.sidebar-group {
  margin-bottom: 1.25rem;
}

.sidebar-group-title {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
  padding-left: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-nav-list {
  list-style: none;
}

.sidebar-nav-item {
  margin-bottom: 2px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.86rem;
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.15s ease;
}
.sidebar-link:hover {
  background: var(--bg-sidebar-active);
  color: var(--text-main);
  text-decoration: none;
}
.sidebar-link.active {
  background: var(--bg-surface-elevated);
  color: var(--accent-primary);
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--accent-primary);
}

.sidebar-sec-num {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  opacity: 0.75;
  background: var(--bg-app);
  padding: 1px 5px;
  border-radius: 4px;
}

/* Collapsed State on Desktop */
body.sidebar-collapsed .docs-sidebar {
  display: none !important;
}

body.sidebar-collapsed .expand-sidebar-pill {
  display: inline-flex;
}

body.sidebar-collapsed .docs-main-container {
  max-width: 1100px;
  margin: 0 auto;
}

.expand-sidebar-pill {
  display: none;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-strong);
  color: var(--accent-primary);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1.25rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}
.expand-sidebar-pill:hover {
  background: var(--accent-glow);
  border-color: var(--accent-primary);
}

/* ==========================================================================
   Documentation Main Article Area
   ========================================================================== */
.docs-main-container {
  flex: 1;
  min-width: 0;
  padding: 2.25rem 3rem 4rem 3rem;
  max-width: var(--content-max-width);
}

/* Breadcrumbs */
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--text-dim);
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.breadcrumbs a {
  color: var(--text-muted);
  text-decoration: none;
}
.breadcrumbs a:hover {
  color: var(--accent-primary);
}
.breadcrumb-sep {
  opacity: 0.5;
}
.breadcrumb-current {
  color: var(--text-main);
  font-weight: 500;
}

.section-banner {
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.section-meta-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}

.read-time-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-dim);
  background: var(--bg-surface-elevated);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.section-banner h1 {
  font-size: 2.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.22;
  margin-bottom: 0.75rem;
  color: var(--text-main);
  text-wrap: balance;
}

.section-description {
  font-size: 1.05rem;
  color: var(--text-muted);
  line-height: 1.6;
}

/* Prose Typography */
.docs-content {
  font-size: 1.02rem;
  line-height: 1.74;
  color: var(--text-main);
}

.docs-content p {
  margin-bottom: 1.35rem;
}

.docs-content h2 {
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 2.75rem 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-main);
  scroll-margin-top: calc(var(--header-height) + 24px);
}

.docs-content h3 {
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 2rem 0 0.75rem 0;
  color: var(--text-main);
  scroll-margin-top: calc(var(--header-height) + 24px);
}

.docs-content h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1.5rem 0 0.5rem 0;
  color: var(--text-main);
}

.docs-content ul, .docs-content ol {
  margin: 0 0 1.35rem 1.5rem;
  padding: 0;
}

.docs-content li {
  margin-bottom: 0.45rem;
}

.docs-content strong {
  font-weight: 600;
  color: var(--text-main);
}

/* Callouts / Admonitions */
.callout {
  border-left: 4px solid var(--border-strong);
  background: var(--bg-surface);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
  box-shadow: var(--shadow-sm);
}

.callout-header {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.45rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.callout-content {
  font-size: 0.92rem;
  line-height: 1.6;
}
.callout-content p:last-child {
  margin-bottom: 0;
}

.callout-original {
  background: var(--callout-original-bg);
  border-color: var(--callout-original-border);
}
.callout-original .callout-header {
  color: var(--callout-original-badge);
}

.callout-deepdive {
  background: var(--callout-deepdive-bg);
  border-color: var(--callout-deepdive-border);
}
.callout-deepdive .callout-header {
  color: var(--callout-deepdive-badge);
}

.callout-tip {
  background: var(--callout-tip-bg);
  border-color: var(--callout-tip-border);
}
.callout-tip .callout-header {
  color: var(--callout-tip-badge);
}

.callout-warning {
  background: var(--callout-warning-bg);
  border-color: var(--callout-warning-border);
}
.callout-warning .callout-header {
  color: var(--callout-warning-badge);
}

/* ==========================================================================
   Code Blocks & Syntax Highlighting
   ========================================================================== */
.code-block-container, .code-block {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: var(--radius-md);
  margin: 1.35rem 0 1.65rem 0;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  max-width: 100%;
  width: 100%;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--code-header-bg);
  border-bottom: 1px solid var(--code-border);
  font-size: 0.75rem;
  color: var(--text-dim);
}

.code-lang-label {
  font-family: var(--font-mono);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent-primary-hover);
}

.copy-btn, .copy-code-btn {
  background: transparent;
  border: 1px solid var(--code-border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 3px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}
.copy-btn:hover, .copy-code-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}
.copy-btn.copied, .copy-code-btn.copied {
  color: #34d399;
  border-color: #34d399;
}

pre {
  margin: 0;
  padding: 1.15rem 1.35rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  line-height: 1.62;
  color: var(--code-text);
}

code {
  font-family: var(--font-mono);
}

p code, li code {
  background: var(--bg-surface-elevated);
  color: var(--accent-primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85em;
  border: 1px solid var(--border-subtle);
}

/* Syntax Highlighting Tokens (High Contrast) */
.token-keyword { color: #f472b6; font-weight: 600; }
.token-type { color: #a78bfa; font-weight: 600; }
.token-string { color: #34d399; }
.token-comment { color: #94a3b8; font-style: italic; }
.token-number { color: #fb923c; }
.token-method { color: #38bdf8; }
.token-property { color: #c084fc; }

/* Light Theme High Contrast Tokens */
[data-theme="light"] .token-keyword { color: #9f1239; font-weight: 600; }
[data-theme="light"] .token-type { color: #6d28d9; font-weight: 600; }
[data-theme="light"] .token-string { color: #15803d; }
[data-theme="light"] .token-comment { color: #4b5563; font-style: italic; }
[data-theme="light"] .token-number { color: #c2410c; }
[data-theme="light"] .token-method { color: #b45309; }
[data-theme="light"] .token-property { color: #7e22ce; }

/* ASCII Diagrams */
.diagram-container {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin: 1.5rem 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}

.diagram-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent-primary);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.diagram-pre {
  font-family: var(--font-mono);
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--text-main);
  background: transparent;
  padding: 0;
  margin: 0;
  white-space: pre;
}

/* Completion Check Container */
.completion-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  margin: 3rem 0 2rem 0;
}

.mark-complete-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-strong);
  color: var(--text-main);
  font-size: 0.88rem;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}
.mark-complete-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}
.mark-complete-btn.completed {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #10b981;
}

/* ==========================================================================
   Bottom Navigation Prev / Next Cards
   ========================================================================== */
.bottom-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-top: 3.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-subtle);
}

.nav-card {
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.5rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 0;
}
.nav-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.nav-card.prev {
  text-align: left;
  align-items: flex-start;
}

.nav-card.next {
  text-align: right;
  align-items: flex-end;
}

.nav-direction {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  margin-bottom: 0.35rem;
}

.nav-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ==========================================================================
   Right Table of Contents (TOC)
   ========================================================================== */
.docs-toc {
  width: var(--toc-width);
  flex-shrink: 0;
  position: sticky;
  top: calc(var(--header-height) + 1.5rem);
  max-height: calc(100vh - var(--header-height) - 3rem);
  overflow-y: auto;
  padding: 0.5rem 0.75rem 2rem 1.25rem;
}

.toc-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  margin-bottom: 0.75rem;
}

.toc-list {
  list-style: none;
  border-left: 1px solid var(--border-subtle);
  padding-left: 0.75rem;
}

.toc-item {
  margin-bottom: 6px;
}

.toc-link {
  font-size: 0.82rem;
  color: var(--text-dim);
  text-decoration: none;
  display: block;
  line-height: 1.4;
  transition: all 0.15s ease;
}
.toc-link:hover {
  color: var(--text-main);
}
.toc-link.active {
  color: var(--accent-primary);
  font-weight: 600;
}

/* Floating Back to Top Button */
.back-to-top-btn {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-strong);
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.2s ease;
  z-index: 40;
}
.back-to-top-btn.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.back-to-top-btn:hover {
  background: var(--accent-primary);
  color: #ffffff;
  border-color: var(--accent-primary);
}

/* ==========================================================================
   Global Search Modal
   ========================================================================== */
.search-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 100;
  display: none;
  align-items: flex-start;
  justify-content: center;
  padding: 4.5rem 1.5rem;
}
.search-modal-backdrop.open {
  display: flex;
}

.search-modal {
  width: 100%;
  max-width: 640px;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  overflow: hidden;
  animation: modalEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.96) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.search-modal-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  gap: 10px;
}

.search-input-icon {
  color: var(--text-dim);
  display: inline-flex;
}

.search-modal-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 1.05rem;
  outline: none;
}

.search-close-btn {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 2px 6px;
  color: var(--text-dim);
  cursor: pointer;
}

.search-modal-results {
  max-height: 380px;
  overflow-y: auto;
  padding: 0.5rem;
}

.search-result-item {
  display: block;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--text-main);
  transition: all 0.15s ease;
}
.search-result-item:hover, .search-result-item.selected {
  background: var(--bg-surface-elevated);
  outline: none;
}

.search-result-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 2px;
}

.search-result-snippet {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.search-empty {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.search-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 8px 16px;
  border-top: 1px solid var(--border-subtle);
  font-size: 0.75rem;
  color: var(--text-dim);
  background: var(--bg-app);
}

/* ==========================================================================
   Responsive Media Queries
   ========================================================================== */

/* Laptop / Medium Desktops (<= 1200px) */
@media (max-width: 1200px) {
  .docs-toc {
    display: none;
  }
  .docs-main-container {
    max-width: 860px;
    padding: 2rem 2rem 4rem 2rem;
  }
}

/* Tablet & Smaller Laptops (<= 992px) */
@media (max-width: 992px) {
  .portal-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .header-nav-links {
    display: none;
  }
  .search-text {
    display: none;
  }
}

/* Tablet Landscape & Below (<= 900px) - Mobile Sidebar Drawer */
@media (max-width: 900px) {
  .nav-toggle-btn {
    display: inline-flex;
  }
  .sidebar-toggle-btn {
    display: none !important;
  }
  .expand-sidebar-pill {
    display: none !important;
  }

  .docs-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 90;
    transform: translateX(-100%);
    box-shadow: var(--shadow-lg);
    background: var(--bg-surface);
    width: 320px;
    height: 100vh;
  }
  .docs-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.65);
    z-index: 85;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }
  .sidebar-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  .docs-main-container {
    padding: 1.5rem 1.25rem 3.5rem 1.25rem;
  }

  .continue-card {
    flex-direction: column;
    align-items: stretch;
    gap: 1.25rem;
  }
}

/* Mobile Devices (<= 640px) */
@media (max-width: 640px) {
  .portal-hero {
    padding: 3rem 1rem 2rem 1rem;
  }
  .portal-hero h1 {
    font-size: 2rem;
  }
  .portal-hero-lead {
    font-size: 1rem;
    margin-bottom: 1.75rem;
  }
  
  .hero-cta-group {
    flex-direction: column;
    width: 100%;
  }
  .hero-cta-primary, .hero-cta-secondary {
    width: 100%;
    justify-content: center;
  }

  .portal-stats-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .modules-grid {
    grid-template-columns: 1fr;
  }

  .bottom-nav {
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
  .nav-card.next {
    text-align: left;
    align-items: flex-start;
  }

  .directory-search-box {
    width: 100%;
  }

  .filter-pills-bar {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 0.5rem;
  }
  .filter-pill {
    flex-shrink: 0;
  }

  .completion-container {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Small Mobile (<= 400px) */
@media (max-width: 400px) {
  .brand-text {
    font-size: 0.95rem;
  }
  .version-pill {
    display: none;
  }
  .portal-hero h1 {
    font-size: 1.75rem;
  }
}
`;

fs.writeFileSync('assets/css/docs.css', cssContent, 'utf8');
console.log('✓ Successfully written assets/css/docs.css (' + cssContent.length + ' bytes).');
