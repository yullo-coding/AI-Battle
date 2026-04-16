import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Battle — 인간 vs AI 투자 배틀',
  description: '당신의 투자 직관이 AI를 이길 수 있을까? 실시간 주식 예측으로 Claude AI와 승부를 겨루세요.',
  openGraph: {
    title: 'AI Battle — 인간 vs AI 투자 배틀',
    description: '당신의 투자 직관이 AI를 이길 수 있을까?',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
