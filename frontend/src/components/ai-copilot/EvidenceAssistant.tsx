import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import { inspectInstrument, type ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import { classifyQuestion, evidenceAnswer } from '@/services/aiCopilot/evidenceAnswer'
import type { MarketInstrument } from '@/types/market'
import styles from './EvidenceAssistant.module.css'

export function EvidenceAssistant({ instrument, live }: { instrument: MarketInstrument; live: boolean }) {
  const { language } = useLanguage()
  return <AssistantSession key={`${instrument.id}:${live}:${language}`} instrument={instrument} live={live} />
}
function AssistantSession({ instrument, live }: { instrument: MarketInstrument; live: boolean }) {
  const { language } = useLanguage(), { result: news } = useNewsProviderMode()
  const ko = language === 'ko'
  const [question, setQuestion] = useState(''), [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<{ question: string; answer: string; at: number }[]>([])
  const controller = useRef<AbortController | null>(null), evidence = useRef<ScanResult | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const ask = useCallback(async (text: string) => {
    if (!text.trim() || busy) return
    const kind = classifyQuestion(text)
    const current = new AbortController()
    controller.current?.abort(); controller.current = current
    setBusy(true); setQuestion('')
    try {
      if (live && kind !== 'news' && kind !== 'unsupported' && (!evidence.current || Date.now() > evidence.current.expiresAt)) {
        evidence.current = await inspectInstrument(instrument, current.signal)
      }
      if (current.signal.aborted) return
      const at = Date.now()
      const answer = evidenceAnswer(kind, instrument, live ? evidence.current : null, news, language, at)
      setMessages(previous => [...previous, { question: text.trim().slice(0, 300), answer, at }].slice(-6))
    } catch {
      const at = Date.now()
      if (!current.signal.aborted) setMessages(previous => [...previous, { question: text.trim().slice(0, 300), answer: ko ? '자료를 확인하지 못했습니다. 잠시 후 다시 질문해주세요.' : 'Evidence unavailable. Please try again.', at }].slice(-6))
    } finally { if (!current.signal.aborted) setBusy(false) }
  }, [busy, instrument, ko, language, live, news])
  return <section className={styles.assistant} aria-label={ko ? '데이터 설명 도우미' : 'Evidence assistant'}>
    <header><strong>{ko ? '데이터 설명 도우미' : 'Evidence assistant'}</strong><small>{ko ? '규칙 기반 · 모델 사용료 없음' : 'Rule based · no model fee'}</small></header>
    <p>{ko ? '현재 자료로 답합니다. 자유 대화형 AI 모델은 아직 연결되지 않았습니다.' : 'Answers use inspected data. A free-form AI model is not connected.'}</p>
    <div className={styles.messages} role="log" aria-live="polite">{messages.map((message, index) => <article key={index}><strong>{message.question}</strong><p>{message.answer}</p><time dateTime={new Date(message.at).toISOString()}>{new Date(message.at).toLocaleTimeString(ko ? 'ko-KR' : 'en-US')} {ko ? '답변 시점 기준' : 'answer snapshot'}</time></article>)}</div>
    <div className={styles.questions}>{(ko ? ['방향 요약', '가격 구간', '위험 기준', '관련 뉴스'] : ['Trend summary', 'Price zones', 'Risk criteria', 'Related news']).map(text => <button key={text} type="button" disabled={busy} onClick={() => { void ask(text) }}>{text}</button>)}</div>
    <form onSubmit={event => { event.preventDefault(); void ask(question) }}><label><span className={styles.label}>{ko ? '선택 종목 질문' : 'Question about selected asset'}</span><input value={question} maxLength={300} onChange={event => setQuestion(event.target.value)} placeholder={ko ? '이 가격 구간은 무슨 뜻이야?' : 'What do these price zones mean?'} /></label><button type="submit" disabled={busy || !question.trim()}>{ko ? '질문' : 'Ask'}</button></form>
    {busy && <div role="status">{ko ? '현재 시세·완료 봉 확인 중…' : 'Checking quotes and closed bars…'} <button type="button" onClick={() => { controller.current?.abort(); setBusy(false) }}>{ko ? '중지' : 'Stop'}</button></div>}
    <Link to="/news">{ko ? '뉴스 센터에서 원문 보기' : 'Open original headlines in News Center'} →</Link>
  </section>
}
