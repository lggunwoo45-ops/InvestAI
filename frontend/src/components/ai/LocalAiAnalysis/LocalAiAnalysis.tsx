import { useEffect, useRef, useState } from 'react'
import type { AiAnalysisInput } from '@/types/aiAnalysis'
import { buildLocalAiRequest, localAiCall, LocalAiError, parseEstimate, parseLocalAiResult } from '@/services/ai/localAiClient'
import type { LocalAiEstimate, LocalAiRequest, LocalAiResult } from '@/services/ai/localAiClient'
import styles from './LocalAiAnalysis.module.css'

export function LocalAiAnalysis({ input, language }: { input: AiAnalysisInput; language: 'ko' | 'en' }) {
  const ko = language === 'ko'
  const local = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  const [prepared, setPrepared] = useState<{ request: LocalAiRequest; estimate: LocalAiEstimate } | null>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LocalAiResult | null>(null)
  const controller = useRef<AbortController | null>(null)
  const active = useRef(false)
  useEffect(() => () => controller.current?.abort(), [])
  const messages: Record<string, string> = ko ? {
    ai_disabled: '실제 AI가 서버에서 비활성화되어 있습니다.', local_ai_disabled: '로컬 AI 연결이 꺼져 있습니다. 운영자의 승인 후 설정이 필요합니다.',
    budget_exhausted: '서버 예산 한도에 도달했습니다. 요청을 보내지 않았습니다.', rate_limited: '요청 간격 제한입니다. 잠시 뒤 직접 다시 실행해 주세요.',
    cost_limit_changed: '비용 한도가 변경되었습니다. 자료를 다시 준비하고 동의해 주세요.', budget_locked: '예산 장부를 사용 중이거나 점검이 필요합니다.',
  } : {
    ai_disabled: 'Real AI is disabled on the server.', local_ai_disabled: 'Local AI connection is disabled. Operator approval and configuration are required.',
    budget_exhausted: 'Server budget exhausted. No provider request was sent.', rate_limited: 'Rate limited. Wait before manually trying again.',
    cost_limit_changed: 'Cost limit changed. Prepare the evidence and consent again.', budget_locked: 'Budget ledger is busy or requires review.',
  }
  const perform = async (execute: boolean) => {
    if (active.current || !local || (execute && (!prepared || !consent))) return
    active.current = true
    setBusy(true); setError(null); setResult(null)
    const current = new AbortController(); controller.current = current
    try {
      if (execute && prepared) {
        setConsent(false)
        const response = parseLocalAiResult(await localAiCall('analyze', { ...prepared.request, maxCostUsd: prepared.estimate.reservedUsd }, current.signal))
        if (!current.signal.aborted) setResult(response)
      } else {
        setPrepared(null); setConsent(false)
        const request = buildLocalAiRequest(input, language)
        if (new TextEncoder().encode(request.evidence).length > 4000) throw new LocalAiError('invalid_input')
        const estimate = parseEstimate(await localAiCall('estimate', request, current.signal))
        if (!current.signal.aborted) setPrepared({ request, estimate })
      }
    } catch (cause) {
      if (!current.signal.aborted) setError(messages[cause instanceof LocalAiError ? cause.code : ''] ?? (ko ? '요청을 완료하지 못했습니다. 재시도는 자동으로 하지 않습니다. 실행 중 발생한 오류는 예산 예약이 남을 수 있습니다.' : 'Request could not complete. No automatic retry. Failed or interrupted execution may retain its budget reservation.'))
    } finally { active.current = false; if (!current.signal.aborted) setBusy(false) }
  }
  return <section className={styles.panel} aria-label={ko ? '실제 AI 설명' : 'Real AI explanation'}>
    <strong>{ko ? '실제 AI 설명 · 직접 실행' : 'Real AI explanation · manual only'}</strong>
    <p>{ko ? '선택 종목의 시세·출처·최대 3개 뉴스 제목만 전송합니다. 보유 내역·메모는 포함하지 않습니다. 자료 준비에는 AI 호출 비용이 없습니다.' : 'Sends the selected quote, provenance and up to three news headlines. Holdings and notes are excluded. Preparing evidence does not call the AI provider.'}</p>
    {!local && <p>{ko ? '공개 사이트에서는 비활성화되어 있습니다. 승인된 로컬 환경에서만 연결할 수 있습니다.' : 'Disabled on the public site. Requires an approved local environment.'}</p>}
    <button type="button" disabled={!local || busy} onClick={() => void perform(false)}>{ko ? '자료·비용 한도 준비' : 'Prepare evidence and cost limit'}</button>
    {prepared && <>
      <details open><summary>{ko ? '전송할 자료 확인' : 'Review frozen evidence'}</summary><pre>{prepared.request.evidence}</pre></details>
      <p>{ko ? '이 요청의 예산 예약 상한' : 'Budget reservation ceiling for this request'}: <strong>USD {prepared.estimate.reservedUsd.toFixed(6)}</strong> · {ko ? '출력 최대' : 'Output max'} {prepared.estimate.outputTokenCeiling} tokens</p>
      <small>{ko ? '요금은 서버에 설정된 상한 단가 기준이며 실제 청구액 보장이 아닙니다. 실패·중단 시에도 예약이 유지될 수 있습니다. 최신 시세로 바꾸려면 다시 준비하세요.' : 'Uses server-configured upper prices, not an invoice guarantee. Failures or cancellation may retain the reservation. Prepare again to refresh the frozen quote.'}</small>
      <label><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />{ko ? '위 자료를 OpenAI에 전송하고 표시된 한도 내 유료 요청 1회를 실행하는 데 동의합니다.' : 'I consent to sending this evidence to OpenAI and making one paid request within the displayed limit.'}</label>
      <button type="button" disabled={!consent || busy} onClick={() => void perform(true)}>{busy ? (ko ? '처리 중…' : 'Working…') : (ko ? 'AI 설명 1회 요청' : 'Request one AI explanation')}</button>
    </>}
    {busy && <p role="status">{ko ? '요청을 처리하고 있습니다.' : 'Request in progress.'}</p>}
    {error && <p role="alert">{error}</p>}
    {result && <section aria-label={ko ? '검증되지 않은 AI 결과' : 'Unverified AI result'}>
      <strong>{ko ? '검증되지 않은 AI 설명' : 'Unverified AI explanation'}</strong>
      <p>{result.explanation.summary}</p><h4>{ko ? '위험·불확실성' : 'Risks and uncertainty'}</h4><p>{result.explanation.risks}</p>
      <h4>{ko ? '부족한 자료' : 'Missing evidence'}</h4><p>{result.explanation.missingEvidence}</p>
      <p>{ko ? '투자 조언이나 매매 신호가 아닙니다. 사실 확인이 필요합니다.' : 'Not investment advice or a trading signal. Verify all claims.'}</p>
    </section>}
  </section>
}
