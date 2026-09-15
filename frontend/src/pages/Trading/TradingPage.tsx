import { PagePlaceholder } from '@/components/PagePlaceholder/PagePlaceholder'

export function TradingPage() {
  return <PagePlaceholder title="Trading" description="Order planning and execution with explicit safety gates." icon="trading" capabilities={['Manual order planning', 'Semi-automatic approval', 'Automatic execution policies']} />
}
