import type { Language } from '@/i18n/translations'
import { uiText } from '@/i18n/translations'
import type { AiAnalysisInput, AiAnalysisResult } from '@/types/aiAnalysis'
import styles from './AiNewsEvidence.module.css'

interface AiNewsEvidenceProps {
  news: AiAnalysisInput['newsContext']
  summary: AiAnalysisResult['newsEvidenceSummary']
  language: Language
}

/** Shows provenance and scope without interpreting a headline as a price signal. */
export function AiNewsEvidence({ news, summary, language }: AiNewsEvidenceProps) {
  const text = uiText[language].copilot.analysisFoundation
  const source = news.evidenceLabel === 'local-proxy-rss' ? text.localProxyRss
    : news.evidenceLabel === 'browser-rss' ? text.browserRss
      : news.isDemoOnly ? text.demoOnly : text.noNewsEvidence
  const scope = news.evidenceScope === 'instrument-specific' ? text.instrumentSpecificNews
    : news.evidenceScope === 'market-level' ? text.marketLevelNews
      : news.evidenceScope === 'demo-only' ? text.demoOnly : text.noNewsEvidence
  const headlines = news.relatedHeadlines.length ? news.relatedHeadlines : news.marketLevelHeadlines
  const note = news.evidenceLabel === 'local-proxy-rss' ? `${text.localProxyExperimental} ${text.localProxyTransport} ${text.realAiInterpretation}`
    : news.isDemoOnly ? text.demoIllustrative
      : news.evidenceLabel === 'browser-rss' ? text.realAiInterpretation : text.noNewsEvidence

  return <section className={styles.panel} aria-label={text.newsEvidence}>
    <header><strong>{text.newsEvidence}</strong><span>{text.newsEvidenceOnly}</span></header>
    <dl><div><dt>{text.evidenceSource}</dt><dd>{source}</dd></div><div><dt>{text.evidenceScope}</dt><dd>{scope}</dd></div></dl>
    {headlines.length > 0 && <div className={styles.headlines}><h4>{text.headlinesConsidered}</h4><ul>{headlines.slice(0, 3).map((headline) => <li key={headline}>{headline}</li>)}</ul></div>}
    <p>{summary}</p>
    <small>{note} {text.productionBackendMissing}</small>
  </section>
}
