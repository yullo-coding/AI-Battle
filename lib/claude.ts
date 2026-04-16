import Anthropic from '@anthropic-ai/sdk'
import type { Direction, StockQuote } from './types'

export interface AIPrediction {
  prediction: Direction
  confidence: number
  reasoning: string
}

export async function generateAIPrediction(quote: StockQuote): Promise<AIPrediction> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const pricePosition = quote.high52 > 0
    ? Math.round(((quote.price - quote.low52) / (quote.high52 - quote.low52)) * 100)
    : 50

  const prompt = `당신은 퀀트 트레이딩 AI입니다. 다음 주식 데이터를 분석하고 단기 방향을 예측하세요.

종목: ${quote.name} (${quote.symbol})
현재가: ${quote.price.toLocaleString()} ${quote.market === 'KR' ? 'KRW' : 'USD'}
전일 대비: ${quote.change >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%
52주 고가: ${quote.high52.toLocaleString()}
52주 저가: ${quote.low52.toLocaleString()}
52주 위치: 저가 대비 ${pricePosition}% 위치
거래량: ${(quote.volume / 1000000).toFixed(2)}M

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "prediction": "UP" 또는 "DOWN",
  "confidence": 65~90 사이의 정수,
  "reasoning": "3~4문장으로 한국어 분석. 구체적인 수치 근거 포함."
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const parsed = JSON.parse(text.trim()) as AIPrediction
    return {
      prediction: parsed.prediction === 'UP' ? 'UP' : 'DOWN',
      confidence: Math.min(90, Math.max(65, parsed.confidence)),
      reasoning: parsed.reasoning,
    }
  } catch {
    // Fallback if JSON parsing fails
    return {
      prediction: quote.changePercent >= 0 ? 'UP' : 'DOWN',
      confidence: 70,
      reasoning: `${quote.name}의 현재 시장 데이터를 분석한 결과입니다.`,
    }
  }
}
