# Sprint 10.5.2 — Global Display Mode Foundation

## What was added

- A typed `DisplayMode` contract with `simple` and `expert` values.
- A global display-mode provider with safe local-storage persistence.
- A compact, bilingual Simple / Expert segmented control in the shared application header.
- `data-display-mode` on the application shell for future density and presentation work.
- Small, safe Simple Mode guidance on Dashboard, Market, News, AI Analysis, and Demo.

## Why the switch moved

Simple and Expert describe how the same application is presented. They are not separate products or primary destinations. Moving the switch to the shared header keeps it stable through route changes, avoids duplicate page controls, and leaves the sidebar focused on workspaces.

## State and persistence

The default is `expert`. The provider accepts only `simple` or `expert` from `market-copilot.displayMode.v1`; missing, invalid, or inaccessible storage falls back safely to `expert`. A user change updates React state immediately and persists locally without backend or account synchronization.

## Header and navigation

The shared header owns one keyboard-accessible, fixed-grid segmented control. English displays `Simple | Expert`; Korean displays `간편모드 | 전문가모드`. Selection changes styling without moving the control. `/simple` remains directly available, while Simple remains absent from primary sidebar navigation. `/simple` and `/ai-analysis` no longer render page-local switchers.

## Page-level foundation

- Dashboard: Simple Mode explains that key market points are shown first; Market Radar and beta boundaries remain.
- Market: Simple Mode adds a short search/context prompt; catalog, filters, detail workspace, and data modes remain.
- News: Simple Mode prioritizes a headline-first reading cue; sources, filters, and insights remain.
- AI Analysis: Simple Mode keeps expert tools available and links to the Simple Candidate View.
- Demo: Simple Mode adds a concise core-flow cue while preserving trust and limitation sections.
- Simple Candidate View: Expert display mode does not redirect; it explains that the route remains beginner-focused.

## Language and safety

All new visible and accessible display-mode labels are available in English and Korean. New copy describes review, context, evidence, and presentation only. No recommendation, trade instruction, outcome promise, or numeric stock planning language was added.

## Tests

Tests cover the expert default, valid persistence, invalid-value recovery, bilingual switch labels, selection changes, shared-header rendering, route persistence, absence from primary navigation, absence of duplicate page controls, major-page Simple guidance, and continued route rendering. Tests use no real network, RSS, AI, payment, account, or backend.

## Deferred

- Full Simple Mode redesign across every page
- Personalized beginner onboarding and user-specific portfolios
- Real AI and real stock providers
- Stock numeric planning levels
- Account and backend feedback synchronization
- Payment, subscriptions, trading, and order execution
