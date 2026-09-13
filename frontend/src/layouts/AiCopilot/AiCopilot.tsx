import { EmptyState } from '@/components/EmptyState/EmptyState'
import { Icon } from '@/components/Icon/Icon'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { useUiStore } from '@/hooks/useUiStore'
import { formatMarketChange, formatMarketPrice } from '@/utils/formatMarketValue'
import styles from './AiCopilot.module.css'

export function AiCopilot() {
  const { toggleAiCopilot } = useUiStore()
  const { selectedInstrument, selectedTimeframe } = useMarketWorkspace()
  const mockConfidence = selectedInstrument
    ? 72 + ((selectedInstrument.symbol.length + selectedTimeframe.length) % 12)
    : null

  return (
    <aside className={styles.copilot} aria-label="AI Copilot">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.aiIcon}><Icon name="sparkles" size={15} /></span>
          <div><strong>AI Copilot</strong><span>Investment intelligence</span></div>
        </div>
        <button type="button" onClick={toggleAiCopilot} aria-label="Close AI Copilot">×</button>
      </div>

      <div className={styles.contextBar}>
        <span>Context</span>
        <strong>{selectedInstrument ? `${selectedInstrument.symbol} · ${selectedInstrument.marketId}` : 'No market selected'}</strong>
      </div>

      <div className={styles.content}>
        {selectedInstrument ? (
          <div className={styles.analysis}>
            <div className={styles.instrumentHeader}>
              <span>{selectedInstrument.marketId.replace('-', ' ')}</span>
              <h2>{selectedInstrument.symbol}</h2>
              <p>{selectedInstrument.name}</p>
            </div>

            <dl className={styles.marketFacts}>
              <div><dt>Market</dt><dd>{selectedInstrument.marketId.replace('-', ' ')}</dd></div>
              <div><dt>Timeframe</dt><dd>{selectedTimeframe}</dd></div>
              <div><dt>Current Price</dt><dd>{formatMarketPrice(selectedInstrument)}</dd></div>
              <div>
                <dt>24H Change</dt>
                <dd className={selectedInstrument.change24hPercent >= 0 ? styles.positive : styles.negative}>
                  {formatMarketChange(selectedInstrument.change24hPercent)}
                </dd>
              </div>
            </dl>

            <section className={styles.confidence}>
              <div><span>AI Confidence</span><strong>{mockConfidence}%</strong></div>
              <p>Mock confidence · no AI model</p>
              <div className={styles.confidenceTrack}><span style={{ width: `${mockConfidence}%` }} /></div>
            </section>

            <section className={styles.why} aria-label="Recommendation explanation">
              <div><strong>Why?</strong><span>Placeholder rationale</span></div>
              <ul>
                <li>Trend continuation</li>
                <li>Volume increasing</li>
                <li>Momentum positive</li>
              </ul>
            </section>

            <div className={styles.boundaryNote}>
              <Icon name="sparkles" size={13} />
              <p>Illustrative context only. Analysis remains disabled until an AI provider is configured.</p>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Your AI Copilot is ready"
            description="Select a market or asset to prepare an explainable investment context."
          />
        )}
      </div>

      <div className={styles.composer}>
        <div className={styles.composerInput}>
          <span>AI models are not configured</span>
          <button type="button" disabled aria-label="Send message"><Icon name="arrowUpRight" size={15} /></button>
        </div>
        <p>AI confidence and explanations require human judgment.</p>
      </div>
    </aside>
  )
}
