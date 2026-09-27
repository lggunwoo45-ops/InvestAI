# Beta Share Checklist

Use this checklist before sharing any Market Copilot build outside the development team.

## Build and tests

- [ ] `npm run test:proxy`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test -- --maxWorkers=1`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] Build artifact comes from the reviewed commit and contains no `.env` file or secret

## Route review

- [ ] `/dashboard` Market Radar loads
- [ ] `/market` Market Explorer loads and keeps LIVE/MOCK labels honest
- [ ] `/ai-analysis` shows one fixed snapshot list per selected horizon
- [ ] `/my-analysis` explains data quality and missing evidence
- [ ] `/news` explains provider/fallback state
- [ ] `/demo` shows beta limitations and system status
- [ ] Unknown routes fail safely

## Security and privacy

- [ ] No secret uses a `VITE_` prefix
- [ ] `DART_API_KEY` exists only in the optional server process environment
- [ ] No credentials, browser profiles, personal data, or populated environment files are packaged
- [ ] Hosted proxies, if later approved, restrict origins, methods, upstream sources, and response size
- [ ] External links use safe protocols and appropriate `rel` attributes
- [ ] No backend, account, payment, broker, or trade-execution behavior is implied

## Language and product safety

- [ ] Core states and safety boundaries read correctly in Korean and English
- [ ] Disabled real AI/trading appear neutral, not as unexpected failures
- [ ] Missing services explain what is missing, what still works, and the next safe step
- [ ] No buy/sell/entry/stop/target/profit-guarantee language was introduced
- [ ] Mock, limited, live, unavailable, and saved-snapshot data are visibly distinguishable

## External sharing warning / 외부 공유 경고

**English:** This is a limited decision-support beta, not investment advice, a trading service, or a profit guarantee. Real AI, trading, accounts, payments, and durable cloud storage are not connected. Verify source data independently and do not enter secrets or sensitive personal information.

**한국어:** 이 빌드는 제한된 의사결정 지원 베타이며 투자 조언·거래 서비스·수익 보장이 아닙니다. 실제 AI, 거래, 계정, 결제, 영구 클라우드 저장소는 연결되어 있지 않습니다. 원천 데이터를 직접 확인하고 비밀값이나 민감한 개인정보를 입력하지 마세요.
