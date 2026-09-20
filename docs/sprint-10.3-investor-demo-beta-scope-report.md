# Sprint 10.3 — Market Copilot 1.5 Beta Investor Demo

## Outcome

Market Copilot now includes an in-app investor demo route at `/demo`. It presents the current 1.5 Beta scope, a guided eight-step walkthrough, capability limits, future product direction, trust boundaries, and investor discussion prompts without changing any market, candidate, news, or Watch Score logic.

## 1.5 Beta scope

- Market Radar and local candidate feedback are available.
- Crypto Watch Candidates, News Insight, and AI Usage & Plans are beta workflows.
- Korea and US Stock Watch Candidates are limited early-beta workflows using existing mock data.
- Real AI, generated Korean summaries, AI impact analysis, paid plans, and Sector Picks remain planned.
- Trading and real-money order execution are not available.

The scope is defined in a typed, bilingual `DemoScopeSummary` configuration so the page does not invent product state in presentation components.

## Investor Demo page

The page contains:

1. A 1.5 Beta hero and positioning statement.
2. Current capability cards with status, working behavior, limitations, and next milestone.
3. Quick internal links to Market Radar, Watch Candidates, News Center, Market Workspace, and AI Usage & Plans.
4. An eight-step guided demo flow with what to show and what to say.
5. Directional version labels from 1.5 through 2.0, explicitly marked as non-committed dates.
6. Trust boundaries and investor questions with no form submission, telemetry, or backend.

## Beta scope banner

A shared, subtle banner appears on `/dashboard`, `/ai-analysis`, and `/demo`. It states that the crypto workflow is available, stock candidates are early beta, and real AI and trading are disconnected.

## Product narrative

Market Copilot is positioned as an AI-ready market decision-support platform. The currently working product centers on Market Radar, transparent rule-based candidates, horizon planning, source-preserving news context, and local review workflow. Future model usage is framed behind explicit cost and trust controls.

## Language coverage

The Demo navigation item, hero, quick links, capability statuses, walkthrough, roadmap, trust boundaries, investor questions, and beta banners support English and Korean. Product names, exchange names, company names, and Federal Reserve Board remain unchanged.

## Trust boundary

- Not investment advice
- No trade or order execution
- No real AI model call
- No payment or subscription processing
- No account, cloud sync, submission, or telemetry
- The user makes the final decision

## Deferred

- Real AI and real stock provider
- Production news backend
- Payment/subscription and user accounts
- Trading/order execution
- External sharing permissions
- Cloud deployment and telemetry

## Manual route

Open `http://localhost:5173/demo`. Manual browser validation is intentionally left to the user.

