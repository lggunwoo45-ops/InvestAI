# Sprint 10.10 — My Analysis Report Polish

## What was added

`/my-analysis` now presents a selected instrument as one coherent report. The new `MyAnalysisReportSummary` formats the existing deterministic result into a concise current state, key reason, main caution, next check, data-confidence state, and evidence counts. It does not add analysis logic or a new data source.

## Report summary behavior

- Uses only `MyAnalysisResult` and the selected instrument identity.
- Labels the result as based on currently loaded data rather than certified real-time advice.
- Keeps the existing Action Readiness status visible directly below the report summary.
- Preserves the six-status guide as a collapsed reference in Simple Mode.
- Shows a read-only plain-text summary and a clipboard action when the browser clipboard API is available.
- Excludes personal notes and average price from the generated text by construction.

## Simple Mode report layout

Simple Mode is ordered as report summary, compact Action Readiness, additional observations, additional risks and limits, additional next checks, optional personal context, user inputs, and the safety footer. The first reason, caution, and next check live in the summary; detail sections begin with the remaining items so the same sentence is not repeated.

## Expert Mode report layout

Expert Mode is ordered as report summary, Action Readiness, Detailed evidence report, Evidence Board, Missing Evidence, Rule Basis, Review Checklist, User Inputs, and the safety footer. Sources and Available, Context, Demo, and Missing evidence levels remain visible. User inputs remain separate from market evidence.

## Copy and plain-text summary

The generated summary includes the symbol, action status, data-confidence label, current read, one next check, one caution, and a safety line. Clipboard failure is handled without blocking the page, and the read-only text remains available for manual selection. No backend, telemetry, or persistence is used.

## Repetition reduction

The former large Action Brief is no longer rendered on the page. Its useful top-level role is replaced by the report summary. The previous Simple Mode current-facts card is omitted because current state and data confidence already appear above it. Action Readiness is compact in Simple Mode and retains full detail in Expert Mode.

## Korean and English coverage

Both languages include report headings, current state, key reason, main caution, next check, data confidence, detailed evidence report, copy states, loaded-data notice, and the personal-data exclusion notice.

## Safety wording

The summary uses review, evidence, caution, missing-data, and next-check language. It adds no direct transaction signal, exact action price, return claim, or percentage zone ladder. The generated text explicitly says it is not investment advice or a trade instruction.

## Tests

Tests cover selected-instrument rendering, current state, data confidence, Korean labels, clipboard behavior, safe plain-text generation, personal-data exclusion, Simple/Expert ordering, Action Readiness continuity, and the absence of reintroduced zone or exact-price guidance. Existing route and analysis tests remain part of the full validation suite.

## Deferred

- Real AI and real stock providers
- Direct transaction signals and exact order prices
- Percentage zone ladders
- Filings, disclosures, earnings, fundamentals, export/sales data, and analyst ratings
- Portfolio storage and backend sync
- Accounts, authentication, payment, subscriptions, and entitlement
- Trading and order execution
- Regulated advisory workflow
