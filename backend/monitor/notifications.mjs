import { boundedJson } from './quotes.mjs'

export function telegramChannel(env = process.env, fetcher = fetch) {
  const token = env.INVESTAI_TELEGRAM_BOT_TOKEN, chat = env.INVESTAI_TELEGRAM_CHAT_ID
  const configured = env.INVESTAI_TELEGRAM_ENABLED === 'true' && /^\d+:[A-Za-z0-9_-]+$/.test(token ?? '') && /^-?\d+$/.test(chat ?? '')
  return { configured, async send(rule, event) {
    if (!configured) throw new Error('알림 채널이 설정되지 않았습니다.')
    const labels = { signal: '선택한 신호 조합 충족', entry: '진입 구간 관측', target: '목표 관측', stop: '손절 경계 관측', timeout: '관찰 기간 종료', expired: '진입 대기 만료', unresolved: '관측 공백·판정 불가', cancelled: '사용자 종료' }
    const message = ['InvestAI · ' + labels[event.kind], `${rule.config.instrument.venue} ${rule.config.instrument.symbol} · ${rule.config.side}`, `가격: ${event.price ?? '판정 불가'} ${rule.config.instrument.quote}`, `시각: ${new Date(event.at).toISOString()}`, '주기적으로 수집한 가격 관측이며 실제 주문·체결이 아닙니다.', `기록: ${event.id}`].join('\n')
    // No user notes, keys or account data in payloads or error strings.
    try {
      const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: message }) })
      const body = await boundedJson(response)
      if (!response.ok || body.ok !== true) throw new Error('delivery')
    } catch { throw new Error('발송 확인에 실패했습니다.') }
  } }
}
