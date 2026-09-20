# Sprint 9.9 — AI Usage, Cost Control, and Product Tier Foundation

## Outcome

Sprint 9.9 defines the frontend contracts Market Copilot needs before any real model or paid feature can be considered. It adds deterministic Free, Basic, and Pro policies, feature-access states, request-level credit estimates, a planning-only usage decision service, a bilingual comparison UI, and visibly disabled AI action placeholders.

No model, prompt execution, API key, provider SDK, network request, token meter, account, billing, entitlement, or payment path was added.

## Product tier and feature access model

Free keeps Market Radar, rule-based Crypto Watch Candidates, Watch Score and planning zones, local notes, and original news available without AI usage. AI news summaries, candidate explanations, translation summaries, and deep reports remain locked or future-limited.

Basic and Pro are planning policies only. The displayed ₩29,000 and ₩79,000 values, 50 and 200 monthly credits, and daily limits are placeholders for product modelling. They do not constitute an offer and cannot be purchased. Sector candidates, portfolio analysis, and AI alerts remain planned even in Pro because their required backend and governance boundaries do not exist.

## Usage estimates and manager

The estimator assigns fixed planning credits: news summary 1, candidate analysis 2, deep dive 5, sector report 5, Korean summary 1, and portfolio analysis 8. It also records expected input/output shape, recommended tier, future cacheability, and a product note. These values are not API pricing or cost accounting.

`evaluateAiUsage` maps a tier and request type to its access state, estimate, reason, cache guidance, and safety note. Its `executable` property is deliberately and structurally always `false`. No local counter is decremented because trustworthy limits require server-side identity, metering, budgets, and audit controls.

## UI and locked actions

AI Analysis now includes AI Usage & Plans below Crypto Watch Candidates. It compares all tiers, features, placeholder credits and limits, usage examples, caching intent, and the reason unlimited model usage is unavailable. The UI repeatedly states that real AI is disconnected and no payment is processed.

Candidate cards show AI Analyze, AI News Summary, and Deep Dive as disabled planned actions. They have no click handler and cannot call a service.

## Free and future-paid boundary

Rule-based data processing remains free. Future model-consuming features require explicit cost control, evidence provenance, caching, daily/monthly budgets, and server-side enforcement. A future model should first explain or summarize the existing evidence package; it must not select unexplained winners.

## Product direction

The future first screen is Market Radar: Hot sectors, Unusual volume, Volatility radar, and Watch candidates. It must not be framed as today's recommended stocks.

Future Korean news summaries must preserve the original headline and source link, display a separate clearly labelled AI-generated summary, cache repeated article summaries when authorized, and enforce API/cost budgets. Translation is not implemented here.

Paid Sector Picks is deferred to 9.10 or later. Any sector view should contain evidence-based research candidates, remain non-directive, and depend on approved usage controls, backend entitlement, accounts, and payment architecture.

## Language and deferred scope

English and Korean cover plan names, planning state, feature access, credit estimates, limits, locked actions, payment disclosure, Market Radar concepts, and cost-control explanations. Basic and Pro names remain unchanged.

Real AI, keys, token accounting, server metering, accounts, subscriptions, payments, Paid Sector Picks, translation implementation, production news backend, portfolio-aware analysis, backtesting, probability modelling, entry/target calculations, trading, cloud sync, and telemetry remain deferred.
