# ASP.NET Core Masterclass — Offline Documentation Portal

[![.NET 8 / ASP.NET Core](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](#curriculum-architecture)
[![Zero Build Step](https://img.shields.io/badge/Build%20Step-Zero%20(Offline%20First)-38BDF8)](#offline-first)
[![Curriculum](https://img.shields.io/badge/Curriculum-30%20Sections-818CF8)](#curriculum-architecture)

A comprehensive, production-grade, 100% offline-first static documentation portal covering the entire **ASP.NET Core Masterclass** curriculum (from web architecture, HTTP, middleware, and controllers through Entity Framework Core, testing, Clean Architecture, Web APIs, JWT security, and Minimal APIs).

---

## ⚡ Key Highlights

* **100% Offline-First:** Pure vanilla HTML5, CSS3, and JavaScript. No npm build, bundler, webpack, or external CDNs required. Works completely offline by opening `index.html` or serving locally.
* **Instant Global Search (`Ctrl+K`):** Client-side fuzzy search across all 30 sections and subtopics with deep anchor linking and keyboard navigation.
* **Collapsible / Expandable Sidebar:** One-click toggle button to collapse the sidebar into a focused reading view with state persisted in `localStorage`.
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
```powershell
npx --yes serve -l 4174 .
```
Then visit `http://localhost:4174` in any modern browser.

### Method 2: Direct File Access
Simply double-click `index.html` or open it in your browser:
```powershell
start index.html
```

---

## 🛠️ Verification & Audits

Run the automated static and accessibility audit:
```powershell
node tools/audit_site.js
```

---

## 📄 License & Attribution
Neutral community documentation portal created from course notes and companion cheat sheets for learning and reference purposes.
