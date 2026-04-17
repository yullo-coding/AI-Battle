import type { Direction, StockQuote } from './types'

export interface AIPrediction {
  prediction: Direction
  confidence: number
  reasoning: string
  mode: 'claude' | 'rule-based'
}

// ─── 룰베이스 예측 (로컬 / API 키 없을 때) ───────────────────────
function ruleBasedPrediction(quote: StockQuote): AIPrediction {
  const pricePosition = quote.high52 > 0
    ? (quote.price - quote.low52) / (quote.high52 - quote.low52)
    : 0.5

  const signals: string[] = []
  let score = 0 // 양수 = UP, 음수 = DOWN

  // 52주 위치: 저점 근처면 반등 기대, 고점 근처면 조정 경계
  if (pricePosition < 0.25) {
    score += 2
    signals.push(`52주 저점 근처 (${Math.round(pricePosition * 100)}%) — 반등 기대`)
  } else if (pricePosition > 0.80) {
    score -= 1
    signals.push(`52주 고점 근처 (${Math.round(pricePosition * 100)}%) — 조정 경계`)
  } else {
    signals.push(`52주 중간 위치 (${Math.round(pricePosition * 100)}%)`)
  }

  // 전일 등락: 과도한 하락은 반등, 과도한 상승은 숨고르기
  if (quote.changePercent < -5) {
    score += 2
    signals.push(`전일 급락 ${quote.changePercent.toFixed(1)}% — 단기 반등 가능`)
  } else if (quote.changePercent > 5) {
    score -= 1
    signals.push(`전일 급등 +${quote.changePercent.toFixed(1)}% — 단기 숨고르기 가능`)
  } else if (quote.changePercent > 0) {
    score += 1
    signals.push(`전일 소폭 상승 +${quote.changePercent.toFixed(1)}% — 모멘텀 유지`)
  } else {
    score -= 1
    signals.push(`전일 소폭 하락 ${quote.changePercent.toFixed(1)}% — 약세 흐름`)
  }

  // 거래량 (100만 이상이면 관심 증가로 판단)
  if (quote.volume > 10_000_000) {
    score += score > 0 ? 1 : -1 // 방향 강화
    signals.push(`거래량 ${(quote.volume / 1_000_000).toFixed(0)}M — 높은 관심`)
  }

  const prediction: Direction = score >= 0 ? 'UP' : 'DOWN'
  const confidence = Math.min(82, Math.max(62, 65 + Math.abs(score) * 4))

  return {
    prediction,
    confidence,
    reasoning: signals.join('. ') + '. (룰베이스 테스트 모드)',
    mode: 'rule-based',
  }
}

// ─── Claude API 예측 (프로덕션) ──────────────────────────────────
async function claudePrediction(quote: StockQuote): Promise<AIPrediction> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
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

  const parsed = JSON.parse(text.trim())
  return {
    prediction: parsed.prediction === 'UP' ? 'UP' : 'DOWN',
    confidence: Math.min(90, Math.max(65, parsed.confidence)),
    reasoning: parsed.reasoning,
    mode: 'claude',
  }
}

// ─── 진입점: API 키 있으면 Claude, 없으면 룰베이스 ────────────────
export async function generateAIPrediction(quote: StockQuote): Promise<AIPrediction> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[ai-predict] ANTHROPIC_API_KEY 없음 → 룰베이스 모드')
    return ruleBasedPrediction(quote)
  }

  try {
    return await claudePrediction(quote)
  } catch (err) {
    console.error('[ai-predict] Claude API 실패, 룰베이스로 폴백:', err)
    return ruleBasedPrediction(quote)
  }
}
