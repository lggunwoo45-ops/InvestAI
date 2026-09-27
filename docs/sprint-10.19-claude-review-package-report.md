# Sprint 10.19 — Claude Review Package and Product Direction Audit Prep

## 생성 결과

Sprint 10.19는 제품 코드나 동작을 변경하지 않고 외부 Claude 검토에 필요한 문서 패키지만 만들었습니다. 검토자가 현재 제품 목표, Sprint 10.14–10.18 변화, 핵심 코드 위치, 코드 정확도·UX·법률/안전성 리스크와 다음 기능 선택지를 한 번에 이해할 수 있도록 구성했습니다.

## 검토 요청 이유

Market Copilot은 후보 생성, 시점 고정 기록, 현재 판단 문구, 검토 범위, 사용자 기록 가격, DART와 뉴스 근거처럼 서로 다른 안전 경계를 결합하고 있습니다. 제한된 베타 전에 내부 구현 의도와 실제 사용자 인상이 일치하는지, 추천·주문 지시·개인화 자문으로 오해될 여지가 없는지, 반드시 수정할 코드 정확도 문제가 있는지 독립적으로 확인할 필요가 있습니다.

## 생성 문서

- `claude-review-sprint-10.19-request.md`
  - 프로젝트 목적과 제품 방향
  - 구현 범위 및 명시적 미구현 범위
  - Sprint 10.14–10.18 요약
  - 아키텍처와 핵심 코드 맵
  - 12개 필수 제품 질문
  - 요청 리뷰 결과 형식
- `claude-review-sprint-10.19-checklist.md`
  - 스냅샷 고정, 시장군별 최대 5개, 안전 문구, Decision/Range, My Analysis, DART 키, Runtime Config와 베타 제한 검토 항목
- `next-feature-candidates-after-10.18.md`
  - 배포, Daily UX, 보유 검토, DART, 뉴스, 실제 AI 설계, 컴플라이언스 후보의 가치·위험·시점·권장 크기 비교
- `sprint-10.19-claude-review-package-report.md`
  - 본 Sprint 범위와 검증 결과 기록

## 핵심 제품 질문

검토 요청서는 다음을 직접 묻습니다.

- 투자 판단 보조 방향의 명확성
- Daily Five 시장군 UX의 직관성
- horizon-first 대비 market-bucket-first UX의 적절성
- Practical Decision 표현 강도
- Review Ranges의 주문 가격 오해 가능성
- 법적 위험을 낮추는 더 명확한 표현
- 스냅샷의 기준 기록 인식
- 평균 가격 입력의 실사용 가치
- DART 검토 깊이
- 출시 전 코드 Blocker와 제거할 복잡성
- 다음 Sprint에서 가장 가치 있는 기능 3개

## 다음 기능 후보 요약

다음 구현을 승인하지 않고 비교 자료만 만들었습니다. 공개 배포와 실제 AI는 가장 큰 운영·법률·보안 검토가 필요합니다. Daily Candidate UX는 상대적으로 작고 현재 핵심 흐름에 직접 가치가 있습니다. DART/뉴스 확대는 출처 정확성과 운영 경계가 선행되어야 합니다. 보유 흐름은 개인정보 및 개인화 자문 경계를 먼저 정리해야 합니다. 컴플라이언스 검토는 공개 베타·유료화·실제 AI보다 앞선 게이트로 제안합니다.

## 검증

문서만 추가했지만 기존 제품 기준선을 확인하기 위해 전체 검증을 수행했습니다.

- `npm run test:proxy`: 통과, 10/10
- `npm run lint`: 통과, 기존 Market Explorer React Compiler 호환성 경고 1건 유지
- `npm run typecheck`: 통과
- `npm run test -- --maxWorkers=1`: 통과, 86개 파일 / 374개 테스트
- `npm run build`: 통과, 293개 모듈 변환
- `git diff --check`: 통과

테스트는 실제 DART, RSS, AI, 거래, 계정, 결제 또는 백엔드 서비스를 호출하지 않습니다.

## 남은 작업

- 실제 Claude 검토 수행
- Claude 리뷰 결과에 따른 코드 또는 문서 수정
- 베타 배포
- 실제 AI
- 실제 주식 공급자
- 거래 및 주문 실행
- 백엔드, 인증, 결제, 데이터베이스
- 유료 출시

이 문서 패키지는 위 작업을 승인하거나 구현한 것으로 간주하지 않습니다.
