# Sprint 10.5.3 — Global Simple Mode UI Simplification

## What was added

Global Simple Mode now changes presentation on the Dashboard, Market, News, AI Analysis, and Demo screens instead of showing only a notice. All pages continue using their existing data and business logic. Expert Mode retains the existing detailed experience.

## Dashboard

Simple Mode adds a four-card `Today’s Market Summary` generated only from the existing Market Radar snapshot: market mood, main watch area, risk to check, and news theme. Missing evidence is labelled `Needs review`, `Early beta`, or `Limited data`. Detailed signal cards start collapsed behind `Show detailed radar`, while Market Radar identity, risk notes, AI boundary, data mode, and source information stay visible. Expert Mode renders the original expanded radar.

## AI Analysis

Simple Mode displays a concise panel explaining that AI Analysis contains detailed evidence and controls, with a direct `Open Simple Candidate View` action. Crypto, Korea, and US candidate tabs, horizons, local review state, evidence, and AI Usage & Plans remain available. Expert Mode adds no beginner panel and preserves the existing workspace.

## Market

Simple Mode presents a stronger search-and-review prompt for price, movement, and basic context. The existing catalog, search, filters, favorites, Recently Viewed, detail workspace, and LIVE/MOCK controls remain unchanged and available.

## News

Simple Mode emphasizes reading the headline, original source, and why the item may matter. Advanced topic and filter controls remain fully available but have lower visual emphasis. Source URLs, original titles, provider status, Local Proxy Experimental behavior, and News Insight are unchanged.

## Demo

Simple Mode adds a short four-step demo path before the detailed presentation: Market Summary, Simple Candidate View, News Insight, and planned direction. Existing readiness, capability, trust, limitation, health, detailed flow, and presenter-warning content remains accessible. Expert Mode retains the existing detailed-first view.

## Simple Candidate View

`/simple` remains the primary beginner candidate screen. Compact cards, separated stock beta preview, percentage-only crypto planning, disabled numeric stock planning for mock/limited data, no rank, no large Watch Score, and the concise safety boundary are preserved. Expert display mode still shows a small contextual note without redirecting.

## Shared UI and visual density

`DisplayModeNotice` now supports compact and panel variants plus an optional CTA link. Simple Mode lowers the visual emphasis of optional News filters and AI Analysis asset tabs without hiding controls, errors, sources, data quality, beta labels, retry actions, or safety warnings.

## Language and safety

New summary, radar disclosure, helper, CTA, and demo-path labels are available in English and Korean. All new copy uses review, observation, context, evidence, and user-decision language. No recommendation, order, outcome promise, fake data, real AI inference, or numeric stock planning was introduced.

## Tests

Tests cover the Simple dashboard summary, Expert detailed radar, collapsed Simple radar disclosure with visible risk notes, AI Analysis CTA, Market and News helpers, Simple demo path, Korean summary labels, compact `/simple` behavior, global header mode state, navigation persistence, and unsafe-label exclusion. Tests do not use real network, RSS, AI, accounts, payment, or backend services.

## Deferred

- Full redesign of every page
- Personalized beginner onboarding and user-specific portfolios
- Real AI and real stock providers
- Stock numeric planning levels
- Account and backend feedback synchronization
- Payment, subscriptions, trading, and order execution
- Holdings analysis
