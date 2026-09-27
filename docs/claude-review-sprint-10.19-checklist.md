# Sprint 10.19 Claude Review Checklist

## Candidate snapshot

- [ ] 후보 스냅샷이 가격 변화만으로 자동 재정렬되지 않는다.
- [ ] 후보 스냅샷은 수동 새로고침 전까지 항목과 순서를 유지한다.
- [ ] Daily candidates는 시장군별 최대 5개다.
- [ ] 업비트와 바이낸스 기록이 섞이지 않는다.
- [ ] 코스피와 코스닥 기록이 섞이지 않는다.
- [ ] Daily candidates에 buy/sell 또는 매매 지시 문구가 없다.
- [ ] 원시 점수를 AI Confidence처럼 표시하지 않는다.
- [ ] 후보 또는 분석 성과를 추적하거나 수익률을 주장하지 않는다.

## Decision support

- [ ] Practical Decision Card가 일반 사용자에게 이해 가능하다.
- [ ] Signal clarity가 수익 확률이나 AI 확신도로 읽히지 않는다.
- [ ] Review Ranges가 주문 가격이 아님을 명확히 설명한다.
- [ ] Review Ranges가 손절·익절·목표 가격처럼 보이지 않는다.
- [ ] 데이터 품질이 Mock/limited/unavailable일 때 결과가 보수적으로 제한된다.
- [ ] 만료된 기록이 현재 판단처럼 보이지 않는다.

## My Analysis

- [ ] Daily snapshot에서 My Analysis로 이동한 맥락이 명확하다.
- [ ] 오늘 기록과 이전 날짜 기록을 구분한다.
- [ ] 스냅샷과 사용자 평균 가격·메모·보유 상태가 섞이지 않는다.
- [ ] 사용자 입력값이 시장 근거나 개인화 추천으로 취급되지 않는다.

## Data and security boundaries

- [ ] DART API 키가 브라우저 코드, Vite 환경 변수 또는 정적 번들에 노출되지 않는다.
- [ ] Runtime config에는 공개 URL과 공개 환경 상태만 존재한다.
- [ ] 손상된 Local Storage가 앱을 영구적으로 중단시키지 않는다.
- [ ] 뉴스/DART 프록시가 없는 경우 앱이 안전한 제한 상태로 동작한다.
- [ ] 실제 AI, 거래, 결제, 백엔드, 인증, 데이터베이스가 연결된 것처럼 표시되지 않는다.

## Beta readiness

- [ ] Beta limitations가 주요 흐름에서 확인 가능하다.
- [ ] Simple Mode는 단타/스윙/장기를 필수 선택으로 요구하지 않는다.
- [ ] 한·영 핵심 안전 문구의 의미가 일치한다.
- [ ] Local 08:00 모델과 실제 서버 예약 생성의 차이가 문서화되어 있다.
- [ ] 배포 준비 문서가 실제 배포 완료로 오해되지 않는다.
- [ ] 출시 전 법률·컴플라이언스·개인정보·접근성 검토가 남아 있음을 명시한다.
