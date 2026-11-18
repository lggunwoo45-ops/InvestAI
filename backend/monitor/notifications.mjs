import { boundedJson } from './quotes.mjs'
import { positionEventLabels } from '../research/positionRisk.mjs'

export function telegramChannel(env = process.env, fetcher = fetch) {
  const token = env.INVESTAI_TELEGRAM_BOT_TOKEN, chat = env.INVESTAI_TELEGRAM_CHAT_ID
  const configured = env.INVESTAI_TELEGRAM_ENABLED === 'true' && /^\d+:[A-Za-z0-9_-]+$/.test(token ?? '') && /^-?\d+$/.test(chat ?? '')
  return { configured, async send(rule, event) {
    if (!configured) throw new Error('알림 채널이 설정되지 않았습니다.')
    const labels = { 'price-above': '설정 가격 위로 통과', 'price-below': '설정 가격 아래로 통과', signal: '선택한 신호 조합 충족', entry: '진입 구간 관측', target: '목표 관측', stop: '손절 경계 관측', timeout: '관찰 기간 종료', expired: '진입 대기 만료', unresolved: '관측 공백·판정 불가', cancelled: '사용자 종료' }
    const evidence = event.kind === 'signal' && event.derivatives ? [
      '함께 충족한 파생 조건 · Bybit USDT 무기한',
      ...(event.derivatives.funding ? [`확정 펀딩률: ${(event.derivatives.funding.value * 100).toFixed(4)}%`] : []),
      ...(event.derivatives.openInterest ? [`미결제약정 24시간 변화: ${event.derivatives.openInterest.change24h.toFixed(2)}%`] : []),
      `판정 기준: ${new Date(event.derivatives.at).toISOString()} 봉 종료 전 저장 자료`,
    ] : []
    const message = event.kind === 'test'
      ? ['Market Copilot · 텔레그램 연결 테스트', '이 메시지가 보이면 휴대폰 알림 수신이 확인됐습니다.', '연결 확인용 테스트입니다. 실제 가격 도달이나 매매 신호가 아닙니다.', `시각: ${new Date(event.at).toISOString()}`].join('\n')
      : ['Market Copilot · ' + (labels[event.kind] ?? positionEventLabels[event.kind.replace('position-', '')]), `${rule.config.instrument.venue} ${rule.config.instrument.symbol} · ${rule.config.side}`, `가격: ${event.price ?? '판정 불가'} ${rule.config.instrument.quote}`, `시각: ${new Date(event.at).toISOString()}`, ...evidence, ...(event.kind.startsWith('price-') ? [`설정 가격: ${event.threshold} ${rule.config.instrument.quote}`, '가격 통과 알림입니다. 봉 마감·거래량 조건 충족이나 매매 신호를 뜻하지 않습니다.'] : []), ...(event.kind.startsWith('position-') ? [event.detail] : []), '주기적으로 수집한 관측이며 실제 주문·체결이 아닙니다.', `기록: ${event.id}`].join('\n')
    // Explicitly opted-in risk observations only; no user notes, labels, keys or account identifiers.
    try {
      const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: message }) })
      const body = await boundedJson(response)
      if (!response.ok || body.ok !== true) throw new Error('delivery')
    } catch { throw new Error('발송 확인에 실패했습니다.') }
  } }
}
