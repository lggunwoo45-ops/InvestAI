# Market Copilot Claude Review Request

## 1. 프로젝트 목적

Market Copilot은 사용자가 시장 데이터와 제한된 근거를 구조적으로 검토하도록 돕는 **투자 판단 보조 도구**입니다. 직접적인 매수·매도 지시, 주문 실행, 수익 보장 또는 개인화된 투자자문을 제공하는 서비스가 아닙니다.

현재 목표는 베타 사용자가 다음 질문에 답할 수 있게 돕는 것입니다.

- 오늘 어느 시장군을 먼저 살펴볼 것인가?
- 관심 후보를 선정한 기존 규칙 근거는 무엇인가?
- 현재 판단 상태와 부족한 근거는 무엇인가?
- 후보가 생성된 시점과 지금의 정보는 어떻게 다른가?
- 사용자가 최종 판단 전 직접 확인해야 할 것은 무엇인가?

## 2. 현재 제품 방향

제품은 “추천 종목을 맞히는 서비스”가 아니라 **근거가 보이는 일일 검토 흐름**을 지향합니다. 메인 베타 흐름은 다음과 같습니다.

1. AI Analysis에서 시장군을 선택합니다.
2. 로컬 08:00 기준으로 고정된 오늘의 관심 후보를 확인합니다.
3. 업비트, 바이낸스, 코스피, 코스닥, 미국주식 중 선택한 시장군에서 최대 5개만 봅니다.
4. Practical Decision Card로 현재 규칙 기반 판단 상태를 읽습니다.
5. Review Ranges를 주문 가격이 아닌 검토 참고 범위로 확인합니다.
6. My Analysis에서 선택 종목의 근거, 부족한 데이터와 다음 점검 사항을 검토합니다.
7. 이미 보유 중인 사용자는 선택적으로 본인이 기록한 가격 또는 평균 가격을 입력해 보유 기준 맥락을 확인합니다.
8. 한국 주식은 선택형 DART 공시 검토를 추가로 확인할 수 있습니다.
9. 뉴스는 정규화된 근거 연결 기반만 준비되어 있으며 실제 AI 요약은 없습니다.

현재 실제 AI, 실제 주식 공급자, 거래 실행, 백엔드, 인증, 결제, 데이터베이스는 연결되어 있지 않습니다.

## 3. 현재 구현된 핵심 기능

- React 19, TypeScript, Vite 기반 데스크톱 우선 UI
- Upbit/Binance 공개 시장 데이터와 명시적인 LIVE/MOCK 경계
- KOSPI/KOSDAQ/미국 주식 모의 카탈로그
- 시장군별 최대 5개의 일일 관심 후보
- 로컬 시간 08:00 기준 일일 스냅샷
- 후보 순서 및 항목 고정, 수동 새로고침
- 스키마 검증과 손상 복구가 포함된 Local Storage
- Practical Decision Card와 Signal clarity
- 데이터 품질에 따라 제한되는 Review Ranges
- My Analysis의 Simple/Expert 검토 흐름
- 선택형 사용자 기록 가격과 평균 가격 맥락
- 한국 주식 DART 공시 목록 및 중립적 검토 계층
- Mock/RSS/Local Proxy 뉴스 공급자 경계와 뉴스 근거 기반
- 한·영 UI, 베타 범위 배너, Getting Started, 제한사항 패널
- 공개 런타임 설정과 서버 전용 DART 키 경계
- 베타 시스템 상태와 배포 준비 문서

## 4. 최근 주요 Sprint 요약

### Sprint 10.14

- Candidate Snapshot Lock 도입
- 후보 목록이 실시간 목록이 아니라 시점이 고정된 기준 기록이 됨
- My Analysis로 스냅샷 기준을 안전하게 전달

### Sprint 10.14.1

- Candidate Snapshot 안전 문구 강화
- 기준 기록과 실제 관심 후보 목록의 정보 계층 정리
- 만료·누락 상태와 단일 목록 표시 강화

### Sprint 10.14.2

- 현재 가격 미확인과 현재 검토 근거 비교 불가를 분리
- 가격은 있어도 판단 근거 비교가 불가능한 상태를 별도로 설명

### Sprint 10.15

- Practical Decision Card 추가
- Review Ranges 추가
- 기존 규칙 근거를 더 직관적인 현재 판단 문구로 변환
- 범위는 주문 가격이나 수익 전망이 아니라 검토 참고값으로 제한

### Sprint 10.16

- 베타 출시 준비 흐름 정리
- 공통 Beta 배너
- Getting Started 흐름
- 제한사항 및 내부 준비 상태 패널

### Sprint 10.17

- 배포 기반과 정적 프런트/선택 프록시 구조 문서화
- 공개 Runtime Config 도입
- Beta System Status 추가
- 뉴스/DART 프록시 환경 변수와 비밀값 경계 정리

### Sprint 10.18

- Daily 08:00 시장군별 관심 후보 도입
- 업비트·바이낸스·코스피·코스닥·미국주식별 최대 5개
- 메인 UX가 단타/스윙/장기 우선에서 시장군 우선으로 변경
- Simple Mode에서 기간 선택을 제거하고 Expert Mode 상세 기준으로 이동

## 5. 현재 아키텍처 요약

```text
React route/page
  ├─ UI components
  ├─ typed domain models
  ├─ deterministic candidate / decision services
  ├─ provider-independent catalog and news boundaries
  └─ versioned local snapshot storage

Browser
  ├─ existing public market provider layer
  ├─ optional local news proxy
  └─ optional local DART proxy
        └─ DART_API_KEY: server process only
```

- 화면은 공급자 원본 응답이 아니라 정규화된 타입을 사용합니다.
- 후보 엔진은 결정론적 규칙 기반이며 실제 AI 호출을 하지 않습니다.
- 일일 후보 선택기는 기존 엔진 결과를 시장군별로 필터링하고 최대 5개만 유지합니다. 새 점수 계산을 하지 않습니다.
- 스냅샷은 브라우저 Local Storage에만 저장되며 계정·기기 간 동기화가 없습니다.
- 08:00 생성은 로컬 프런트 모델입니다. 서버 예약 생성은 없습니다.
- DART 키는 브라우저 번들에 포함되지 않습니다.

## 6. 핵심 코드 파일 목록

### AI Analysis

- `frontend/src/pages/AiAnalysis/AiAnalysisPage.tsx`
- `frontend/src/components/candidates/CandidateSnapshotPanel/CandidateSnapshotPanel.tsx`
- `frontend/src/components/candidates/MarketBucketSelector/MarketBucketSelector.tsx`

### Daily candidates

- `frontend/src/types/marketBucket.ts`
- `frontend/src/services/candidateSnapshot/dailyBasisTime.ts`
- `frontend/src/services/candidateSnapshot/dailyBucketSnapshot.ts`
- `frontend/src/services/candidateSnapshot/dailyBucketSnapshotStorage.ts`
- `frontend/src/services/candidateSnapshot/dailyBucketCandidateSelector.ts`

### Practical decision

- `frontend/src/types/practicalDecision.ts`
- `frontend/src/services/practicalDecision/practicalDecisionModel.ts`
- `frontend/src/services/practicalDecision/reviewRangeModel.ts`
- `frontend/src/components/practicalDecision/PracticalDecisionCard/PracticalDecisionCard.tsx`
- `frontend/src/components/practicalDecision/ReviewRangePanel/ReviewRangePanel.tsx`

### My Analysis

- `frontend/src/pages/MyAnalysis/MyAnalysisPage.tsx`
- `frontend/src/components/my-analysis/MyAnalysisReportSummary/MyAnalysisReportSummary.tsx`
- `frontend/src/components/my-analysis/PositionReviewPanel/PositionReviewPanel.tsx`

### DART

- `frontend/src/services/dart/dartClient.ts`
- `frontend/src/services/dart/dartClassifier.ts`
- `frontend/src/services/dart/dartDisclosureReview.ts`
- `frontend/src/components/my-analysis/DartDisclosurePanel/DartDisclosurePanel.tsx`
- `frontend/src/components/my-analysis/DartDisclosureReviewCard/DartDisclosureReviewCard.tsx`

### Beta / deployment

- `frontend/src/config/runtimeConfig.ts`
- `frontend/src/services/health/dependencyHealth.ts`
- `frontend/src/components/demo/BetaSystemStatusPanel/BetaSystemStatusPanel.tsx`
- `docs/deployment-foundation.md`
- `docs/beta-share-checklist.md`

## 7. 검토 요청 사항

- 타입·날짜·만료·Local Storage 검증이 구현 의도와 일치하는지 확인해 주세요.
- 일일 스냅샷이 가격 변화만으로 자동 재정렬되지 않는지 확인해 주세요.
- 시장군별 필터가 공급자·거래소·시장 구분을 정확히 유지하는지 확인해 주세요.
- Practical Decision과 Review Ranges가 데이터 품질 및 만료 상태를 충분히 보수적으로 처리하는지 확인해 주세요.
- My Analysis 전달 과정에서 오늘/이전 기록과 사용자 입력값이 섞이지 않는지 확인해 주세요.
- DART·뉴스·Runtime Config 경계에서 비밀값, 실제 공급자 상태 또는 Mock 상태가 잘못 표현될 가능성을 찾아 주세요.
- 베타 사용자가 한 화면에서 너무 많은 개념을 접하지 않는지 평가해 주세요.

## 8. 특히 봐야 할 리스크

1. 프런트 로컬 시간 기반 08:00이 KST 서버 기준처럼 오해될 위험
2. 일일 후보가 투자 추천 또는 성과 예측으로 읽힐 위험
3. Review Ranges가 주문 가격처럼 해석될 위험
4. “판단 가능”, “접근 가능” 같은 문구가 행동 유도로 느껴질 위험
5. 모의 주식 데이터가 실제 데이터처럼 보일 위험
6. Local Storage 삭제·다른 브라우저 origin·기기 변경에 따른 기록 소실
7. 선택형 평균 가격이 개인화된 투자자문처럼 보일 위험
8. DART 공시 유형 분류가 공시의 긍정·부정을 해석하는 것처럼 보일 위험
9. 뉴스 연결이 인과관계 또는 종목별 근거로 과대해석될 위험
10. 정적 프런트와 선택형 프록시의 운영 준비 수준이 실제 배포 수준으로 오해될 위험

## 9. 제품성 관점 질문

아래 질문에 번호를 유지해 답변해 주세요.

1. 현재 제품 방향이 “투자 판단 보조”로 충분히 명확한가?
2. Daily 08:00 시장군별 후보 5개 구조가 베타 사용자에게 직관적인가?
3. 단타/스윙/장기보다 시장군별 Daily Five가 더 나은 메인 UX인지?
4. Practical Decision Card의 표현이 너무 약하거나 너무 강하지 않은가?
5. Review Ranges가 주문가/손절가/익절가처럼 보일 위험이 있는가?
6. 법적 리스크를 낮추면서 더 직관적으로 만들 표현이 있는가?
7. 후보 스냅샷이 “추천”이 아니라 “기준 기록”으로 잘 보이는가?
8. 보유자 관점에서 평균가격 입력 후 흐름이 실사용에 도움이 되는가?
9. DART 공시 점검은 지금 수준이 적절한가, 아니면 너무 약한가?
10. 출시 전 반드시 고쳐야 할 코드 정확도 문제가 있는가?
11. 베타 출시 전에 제거해야 할 복잡한 기능이나 문구가 있는가?
12. 다음 Sprint로 가장 가치 있는 기능 3개는 무엇인가?

## 10. 다음 기능 후보

구현 우선순위는 아직 확정하지 않았습니다. 다음 범주를 비교해 주세요.

- 제한된 비공개 베타 배포
- 일일 후보의 빈 상태·설명·시장군 요약 개선
- 로컬 전용 보유/관찰 목록과 사용자 기록 가격 검토
- DART 고유번호 범위 및 원문 링크 개선
- 뉴스 출처와 관련 뉴스 매칭 개선
- 예산·안전 경계가 있는 실제 AI 요약 설계
- 투자자문·유료 서비스·개인화에 대한 법률 및 컴플라이언스 검토

각 후보에 대해 사용자 가치, 법적·기술적 위험, 지금 해야 하는 이유 또는 미뤄야 하는 이유를 평가해 주세요.

## 11. 리뷰 결과로 받고 싶은 형식

아래 형식을 그대로 사용해 주세요.

1. 전체 평가
2. Merge/출시 전 Blocker
3. 중요한 개선사항
4. 제품성 개선 아이디어
5. 법적/안전성 표현 리스크
6. 코드 구조 리스크
7. UX 리스크
8. 다음 Sprint 우선순위
9. 유지해야 할 방향
10. 버려도 되는 방향

각 항목에는 가능하면 심각도, 근거 파일, 사용자 영향, 최소 수정안과 장기 수정안을 포함해 주세요. 코드에서 확인되지 않은 가정은 사실처럼 단정하지 말아 주세요.
