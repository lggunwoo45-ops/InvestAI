# Sprint 10.27 — AI Copilot Final Read and Market Label Polish

## What changed

Market keeps the existing persisted instrument-list collapse behavior while replacing chart-centric labels with direct instrument-list wording. AI Copilot now places one deterministic Final Review card before the existing scenario analysis. The card synthesizes existing Practical Decision, Candidate Review Score, Review Range availability, technical-level availability, evidence quality, and optional snapshot, position, Bitcoin-anchor, and market-brief context. It does not create a new score or change candidate order, quality gates, market data, or technical calculations.

## Market label change

- Visible list: **Hide instruments / 종목 숨기기**
- Collapsed list: **Show instruments / 종목 보기**
- Existing local persistence, chart expansion, search, sort, favorites, and instrument selection remain unchanged.

## AI Copilot final read behavior

The Final Review card exposes one of seven conservative states: wait, keep watching, approach review possible, already extended, change check needed, re-check holding basis, or not enough data. State mapping starts from the existing Practical Decision result. Missing score or data forces an unavailable conclusion, snapshot changes and active recorded-price review take precedence, and optional Bitcoin volatility context can cap a crypto conclusion. The card shows a reason, next check, caution, signal-clarity label, and the inputs used.

## Scenario wording improvements

Upside, neutral, and downside scenario cards remain in place. Each now separates **Condition**, **What to check**, and **Weakening condition**. Wording stays observational: support behavior, resistance behavior, volume, activity, and wider-market context. Scenario probabilities remain unavailable and the mock/real-AI boundary is unchanged.

## Copy summary

When My Analysis has a Final Review result, the plain-text and clipboard summary includes the conclusion, reason, next check, and explicit decision-support caution. Personal notes remain excluded and recorded price remains limited to the existing position-review context.

## Data sources used

- Existing Practical Decision result
- Existing Candidate Review Score
- Existing Review Range availability
- Existing technical-level availability
- Existing market/news evidence state
- Optional snapshot freshness and recorded-price review context
- Optional Bitcoin-anchor and Daily Market Brief context

No new investment scoring, candidate ranking, quality-gate rule, provider, or prediction was introduced.

## Safety wording

The new layer uses `Decision-support information, not a trade instruction.` / `판단 보조 정보이며 거래 지시가 아닙니다.` It does not provide direct transaction directions, order-price labels, outcome promises, or personalized portfolio recommendations. Existing scenario planning safety wording was normalized to the same transaction-neutral boundary.

## Tests added or updated

- Seven-state Final Review mapping and precedence
- Unavailable-data and missing-score behavior
- Bitcoin-volatility cap and market-brief caution
- Bilingual Final Review component output and prohibited-word checks
- Final Review ordering above scenario cards
- Condition/check/weakening scenario structure
- Selected-instrument context refresh
- Bilingual Market collapse labels and persisted collapse behavior
- Final Review inclusion in copied My Analysis summary

Tests use deterministic fixtures only and do not call real DART, RSS, AI, account, payment, or broker services.

## Deferred

- Real AI-generated commentary
- Live macro/news reasoning
- Broker or trading integration
- Backend, authentication, payment, and database services
- Personalized portfolio recommendations
- Any direct transaction-signal service
