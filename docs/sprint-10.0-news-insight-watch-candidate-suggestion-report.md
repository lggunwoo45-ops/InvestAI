# Sprint 10.0 — News Insight to Watch Candidate Suggestions Foundation

## Outcome

Sprint 10.0 adds a deterministic news-insight layer between normalized news and the existing watch-candidate workspace. It does not call an AI model, translate content, execute a trade, or make an investment recommendation.

## Architecture

```text
NewsArticle (Mock / Browser RSS / Local Proxy RSS)
  -> newsInsightEngine (pure deterministic rules)
  -> NewsInsightSummary
       -> NewsInsightPanel in News Center
       -> compact News-driven candidate context in AI Analysis
```

The engine accepts only an article, the available instrument/candidate set, and the display language. It has no network dependency and does not mutate provider data.

## Scope rules

- Macro news always remains `market-level`. BTC and ETH may appear only as broad risk-market watch context when those candidates are available.
- Crypto news becomes `instrument-specific` only when the article explicitly links a symbol or internal instrument ID.
- AI and technology news exposes AI, semiconductor, and data-center sector tags. It does not invent tickers; without explicit links it remains `sector-level`.
- Regulation news carries regulation and risk impact tags and a dedicated interpretation/timing caveat.
- Mock news is visibly marked as a demo insight. Real provider articles retain their original headline, source, timestamp, and safe HTTPS source link.

## Korean summary boundary

The Korean text is a fixed rule-based placeholder, not a translation. The original headline remains untouched. Actual Korean AI summarization is a future Basic/Pro capability and requires reviewed model, backend, usage, and cost controls.

## Product tier policy

- Rule-based News Insight: Free and available.
- AI Korean summary: future limited Basic/Pro feature.
- AI impact analysis: future limited Basic/Pro feature.
- Candidate report: future paid AI feature; planning metadata only.

Every AI action remains disabled. No payment, entitlement, model request, or credit deduction occurs.

## Safety

All output is framed as research context. The engine does not promise returns, issue buy/sell instructions, calculate a probability, or modify Watch Score. Candidate feedback remains local and unchanged.

## Future extension points

1. Replace `rule-based` with a reviewed provider behind a server-side evidence and cost-control boundary.
2. Preserve `NewsInsightSummary` as the UI contract so components remain provider-agnostic.
3. Add entitlement and usage enforcement before enabling any paid AI action.
4. Add source-level evidence citations and cache invalidation before producing generated summaries.

