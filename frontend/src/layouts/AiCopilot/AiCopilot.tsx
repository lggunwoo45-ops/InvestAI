import { EmptyState } from '@/components/EmptyState/EmptyState'
import { Icon } from '@/components/Icon/Icon'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useUiStore } from '@/hooks/useUiStore'
import { uiText } from '@/i18n/translations'
import { useLanguage } from '@/i18n/useLanguage'
import { formatMarketChange, formatMarketPrice } from '@/utils/formatMarketValue'
import styles from './AiCopilot.module.css'

export function AiCopilot() {
  const { toggleAiCopilot } = useUiStore()
  const { selectedInstrument, selectedTimeframe, activeMarketState } = useMarketWorkspace()
  const { language } = useLanguage()
  const text = uiText[language].copilot
  const liveInstrument = activeMarketState?.snapshot?.instrument
  const displayedInstrument = selectedInstrument && liveInstrument?.id === selectedInstrument.id
    ? liveInstrument : selectedInstrument
  const isStock = displayedInstrument?.marketId === 'korea-stock' || displayedInstrument?.marketId === 'us-stock'
  const mockConfidence = selectedInstrument
    ? 72 + ((selectedInstrument.symbol.length + selectedTimeframe.length) % 12)
    : null

  return (
    <aside className={`${styles.copilot} ${isStock ? styles.stockContext : ''}`} aria-label="AI Copilot">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.aiIcon}><Icon name="sparkles" size={15} /></span>
          <div><strong>{text.title}</strong><span>{isStock ? text.company : text.scenario}</span></div>
        </div>
        <button type="button" onClick={toggleAiCopilot} aria-label="Close AI Copilot">×</button>
      </div>

      <div className={styles.contextBar}>
        <span>{text.context}</span>
        <strong>{displayedInstrument ? `${displayedInstrument.symbol} · ${displayedInstrument.marketId}` : text.none}</strong>
      </div>

      <div className={styles.content}>
        {selectedInstrument ? (
          <div className={styles.analysis}>
            <div className={styles.instrumentHeader}>
              <span>{displayedInstrument!.marketId.replace('-', ' ')}</span>
              <h2>{displayedInstrument!.symbol}</h2>
              <p>{displayedInstrument!.name}</p>
            </div>

            <dl className={styles.marketFacts}>
              <div><dt>{uiText[language].detail.market}</dt><dd>{displayedInstrument!.marketId.replace('-', ' ')}</dd></div>
              <div><dt>{text.timeframe}</dt><dd>{selectedTimeframe}</dd></div>
              <div><dt>{text.price}</dt><dd>{formatMarketPrice(displayedInstrument!)}</dd></div>
              <div>
                <dt>{text.change}</dt>
                <dd className={displayedInstrument!.change24hPercent >= 0 ? styles.positive : styles.negative}>
                  {formatMarketChange(displayedInstrument!.change24hPercent)}
                </dd>
              </div>
            </dl>

            <section className={styles.confidence}>
              <div><span>{text.confidence}</span><strong>{mockConfidence}%</strong></div>
              <p>{text.mockConfidence}</p>
              <div className={styles.confidenceTrack}><span style={{ width: `${mockConfidence}%` }} /></div>
            </section>

            <section className={styles.why} aria-label="Recommendation explanation">
              <div><strong>{text.why}</strong><span>{text.placeholder}</span></div>
              <ul>
                <li>{text.trend}</li>
                <li>{text.volume}</li>
                <li>{text.momentum}</li>
              </ul>
            </section>

            <div className={styles.boundaryNote}>
              <Icon name="sparkles" size={13} />
              <p>{text.boundary}</p>
            </div>
          </div>
        ) : (
          <EmptyState
            title={text.ready}
            description={text.readyDescription}
          />
        )}
      </div>

      <div className={styles.composer}>
        <div className={styles.composerInput}>
          <span>{text.noModels}</span>
          <button type="button" disabled aria-label="Send message"><Icon name="arrowUpRight" size={15} /></button>
        </div>
        <p>{text.judgment}</p>
      </div>
    </aside>
  )
}
