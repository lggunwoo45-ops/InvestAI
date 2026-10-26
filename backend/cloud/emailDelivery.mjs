import { createHash } from 'node:crypto'
import { normalizedEmail } from './emailAccounts.mjs'

export function createEmailDelivery({ env = process.env, fetcher = fetch } = {}) {
  const from = normalizedEmail(env.INVESTAI_MAIL_FROM), key = env.INVESTAI_MAIL_API_KEY
  const available = env.INVESTAI_MAIL_PROVIDER === 'resend' && !!from && !from.endsWith('@resend.dev') && typeof key === 'string' && /^re_[A-Za-z0-9_-]{16,}$/.test(key)
  return {
    available,
    async send({ address, code, purpose, challenge }) {
      if (!available) throw new Error('email_not_configured')
      if (!normalizedEmail(address) || !/^\d{8}$/.test(code) || !['signup', 'link', 'reset'].includes(purpose)) throw new Error('invalid_email_request')
      const label = purpose === 'reset' ? '비밀번호 재설정' : '이메일 인증'
      const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `investai-${createHash('sha256').update(challenge).digest('hex')}` },
        body: JSON.stringify({ from: `InvestAI <${from}>`, to: [address], subject: `[InvestAI] ${label} 번호`, text: `InvestAI ${label} 번호: ${code}\n\n요청한 화면에서 10분 안에 입력해주세요. 인증번호는 다른 사람에게 알려주지 마세요.\n직접 요청하지 않았다면 이 메일을 무시해주세요. 계정이나 비밀번호는 이 메일만으로 변경되지 않습니다.` }),
      })
      if (!response.ok) throw new Error('email_delivery_failed')
      const text = await response.text()
      if (text.length > 10_000) throw new Error('email_delivery_failed')
      const result = JSON.parse(text)
      if (typeof result.id !== 'string' || !result.id || result.id.length > 200) throw new Error('email_delivery_failed')
    },
  }
}
