import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json() as { analysis?: { indicators?: { rsi_14?: number; macd?: { histogram?: number } } } }
  const rsi = Number(body.analysis?.indicators?.rsi_14 ?? 50)
  const histogram = Number(body.analysis?.indicators?.macd?.histogram ?? 0)
  const score = (rsi < 40 ? 1 : rsi > 65 ? -1 : 0) + (histogram >= 0 ? 1 : -1)
  const change = Number((score * 1.4).toFixed(1))

  return NextResponse.json({
    change_percent: change,
    confidence: 68,
    brief: `예시 API는 ${change >= 0 ? '상승' : '하락'} 가능성을 선택했습니다.`,
    reasoning: {
      technical: `RSI ${rsi.toFixed(1)}와 MACD 히스토그램 ${histogram.toFixed(2)}을 단순 점수화했습니다.`,
      sentiment: '예시 API이므로 별도의 뉴스 감성은 반영하지 않았습니다.',
      risk: '실제 투자용 모델이 아닌 API 연결 형식 확인용 예시입니다.',
      conclusion: `연결 테스트 결과 예상 등락률은 ${change >= 0 ? '+' : ''}${change}%입니다.`,
    },
  })
}
