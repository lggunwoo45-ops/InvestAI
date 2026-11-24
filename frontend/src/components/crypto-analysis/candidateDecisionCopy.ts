import type { CandidateVerdict } from '@/services/cryptoAnalysis/candidateAction'

export function decisionLabel(verdict: CandidateVerdict, ko: boolean) {
  const labels = ko ? {ready:'지금 진입 검토', price:'진입 가격 대기', close:'1시간봉 마감 대기', volume:'거래량 대기', recovery:'반등 회복 대기', context:'체결 흐름 대기', excluded:'진입 제외'}
    : {ready:'Entry conditions met', price:'Waiting for entry price', close:'Waiting for hourly close', volume:'Waiting for volume', recovery:'Waiting for recovery', context:'Waiting for trade flow', excluded:'Entry excluded'}
  return labels[verdict.action]
}

