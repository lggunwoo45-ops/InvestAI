import { PagePlaceholder } from '@/components/PagePlaceholder/PagePlaceholder'

export function MarketPage() {
  return (
    <PagePlaceholder
      title="Market"
      description="The primary InvestAI workspace for understanding markets before making decisions."
      icon="markets"
      capabilities={[
        'Cross-market intelligence',
        'AI-assisted market context',
        'Explainable confidence signals',
      ]}
    />
  )
}
