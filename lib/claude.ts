import type { StockAnalysis, AIReasoning } from './types'
import { bollingerPosition, rsiLabel, macdSignal } from './indicators'
import { formatPrice } from './stocks'

export interface AIPrediction {
  change_percent: number   // 양수=상승, 음수=하락
  confidence: number       // 60~90
  brief: string
  reasoning: AIReasoning
  mode: 'claude' | 'rule-based'
}

// ─── Rule-based fallback ─────────────────────────────────────
function ruleBasedPrediction(analysis: StockAnalysis): AIPrediction {
  const { quote, rsi14, macd, bollinger, ma20, ma50 } = analysis
  let score = 0
  const signals: string[] = []

  // RSI
  if (rsi14 < 30) { score += 2; signals.push(`RSI ${rsi14} 과매도 → 반등 기대`) }
  else if (rsi14 > 70) { score -= 2; signals.push(`RSI ${rsi14} 과매수 → 조정 경계`) }
  else if (rsi14 > 55) { score += 1; signals.push(`RSI ${rsi14} 강세 유지`) }
  else { signals.push(`RSI ${rsi14} 중립`) }

  // MACD
  if (macd.histogram > 0) { score += 1; signals.push('MACD 히스토그램 양전 → 매수 신호') }
  else { score -= 1; signals.push('MACD 히스토그램 음전 → 매도 신호') }

  // 볼린저
  const bPos = bollingerPosition(quote.price, bollinger)
  if (quote.price <= bollinger.lower) { score += 2; signals.push(`볼린저 하단 이탈 → ${bPos}`) }
  else if (quote.price >= bollinger.upper) { score -= 1; signals.push(`볼린저 상단 돌파 → ${bPos}`) }
  else { signals.push(`볼린저 ${bPos}`) }

  // MA
  if (quote.price > ma20 && ma20 > ma50) { score += 1; signals.push('가격 > MA20 > MA50 정배열') }
  else if (quote.price < ma20 && ma20 < ma50) { score -= 1; signals.push('가격 < MA20 < MA50 역배열') }

  // 전일 등락
  if (quote.changePercent < -3) { score += 1; signals.push(`전일 ${quote.changePercent.toFixed(1)}% 급락 → 단기 반등`) }
  else if (quote.changePercent > 3) { score -= 1; signals.push(`전일 +${quote.changePercent.toFixed(1)}% 급등 → 숨고르기`) }

  const direction = score >= 0 ? 1 : -1
  const magnitude = Math.min(8, Math.max(1, Math.abs(score) * 1.2))
  const change_percent = parseFloat((direction * magnitude).toFixed(1))
  const confidence = Math.min(80, Math.max(60, 62 + Math.abs(score) * 3))

  return {
    change_percent,
    confidence,
    brief: `${change_percent >= 0 ? '▲' : '▼'} ${Math.abs(change_percent)}% 예측 — ${signals[0]}`,
    reasoning: {
      technical: signals.slice(0, 3).join('. '),
      sentiment: analysis.fearGreedValue != null
        ? `공포탐욕지수 ${analysis.fearGreedValue} (${analysis.fearGreedLabel})`
        : '시장 심리 데이터 없음',
      risk: '룰베이스 모드 — API 키 미설정 시 적용',
      conclusion: signals.join('. '),
    },
    mode: 'rule-based',
  }
}

// ─── Claude API 예측 ─────────────────────────────────────────
async function claudePrediction(analysis: StockAnalysis): Promise<AIPrediction> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { quote, rsi14, macd, bollinger, ma20, ma50,
    analystTargetPrice, analystRecommendation, analystCount,
    analystBuyCount, analystHoldCount, analystSellCount,
    fearGreedValue, fearGreedLabel, recentNews } = analysis

  const pricePos = quote.high52 > 0
    ? Math.round(((quote.price - quote.low52) / (quote.high52 - quote.low52)) * 100)
    : 50

  const newsText = recentNews.length > 0
    ? recentNews.map(n => `• ${n.headline}`).join('\n')
    : '뉴스 없음'

  const analystText = analystTargetPrice
    ? `목표가 ${formatPrice(analystTargetPrice, quote.market)} (현재 대비 ${(((analystTargetPrice - quote.price) / quote.price) * 100).toFixed(1)}%), 추천 ${analystRecommendation}, 의견 ${analystCount}명 (매수 ${analystBuyCount} / 중립 ${analystHoldCount} / 매도 ${analystSellCount})`
    : '애널리스트 데이터 없음'

  const prompt = `당신은 퀀트 트레이더입니다. 아래 데이터를 분석해 주식의 단기 등락률을 예측하세요.

종목: ${quote.name} (${quote.symbol})
현재가: ${formatPrice(quote.price, quote.market)}
전일 대비: ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%
시가/고가/저가: ${formatPrice(quote.open, quote.market)} / ${formatPrice(quote.high, quote.market)} / ${formatPrice(quote.low, quote.market)}
52주 고/저: ${formatPrice(quote.high52, quote.market)} / ${formatPrice(quote.low52, quote.market)} (현재 위치 ${pricePos}%)
거래량: ${(quote.volume / 1_000_000).toFixed(1)}M (평균 대비 ${quote.avgVolume > 0 ? ((quote.volume / quote.avgVolume) * 100).toFixed(0) : '?'}%)

[기술적 지표]
RSI(14): ${rsi14} → ${rsiLabel(rsi14)}
MACD 히스토그램: ${macd.histogram.toFixed(3)} → ${macdSignal(macd.histogram)}
볼린저 밴드: 상단 ${formatPrice(bollinger.upper, quote.market)} / 중간 ${formatPrice(bollinger.middle, quote.market)} / 하단 ${formatPrice(bollinger.lower, quote.market)}
볼린저 위치: ${bollingerPosition(quote.price, bollinger)}
MA20: ${formatPrice(ma20, quote.market)} (${quote.price > ma20 ? '현재가 위' : '현재가 아래'})
MA50: ${formatPrice(ma50, quote.market)} (${quote.price > ma50 ? '현재가 위' : '현재가 아래'})

[전문가 분석]
${analystText}

[시장 심리]
공포탐욕지수: ${fearGreedValue ?? '?'} (${fearGreedLabel ?? '데이터 없음'})

[최근 뉴스]
${newsText}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "change_percent": 단기 예상 등락률 숫자 (예: 3.2 = +3.2%, -1.5 = -1.5%, 소수점 1자리),
  "confidence": 60~90 사이 정수,
  "brief": "한 줄 요약 (20자 이내)",
  "reasoning": {
    "technical": "기술적 지표 해석 2~3문장",
    "sentiment": "시장 심리 해석 1~2문장",
    "risk": "주요 리스크 요인 1~2문장",
    "conclusion": "종합 결론 2문장"
  }
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  const parsed = JSON.parse(text)

  return {
    change_percent: parseFloat(parseFloat(parsed.change_percent).toFixed(1)),
    confidence: Math.min(90, Math.max(60, parseInt(parsed.confidence))),
    brief: parsed.brief ?? '',
    reasoning: {
      technical: parsed.reasoning?.technical ?? '',
      sentiment: parsed.reasoning?.sentiment ?? '',
      risk: parsed.reasoning?.risk ?? '',
      conclusion: parsed.reasoning?.conclusion ?? '',
    },
    mode: 'claude',
  }
}

// ─── 진입점 ──────────────────────────────────────────────────
export async function generateAIPrediction(analysis: StockAnalysis): Promise<AIPrediction> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[ai] API 키 없음 → 룰베이스 모드')
    return ruleBasedPrediction(analysis)
  }
  try {
    return await claudePrediction(analysis)
  } catch (err) {
    console.error('[ai] Claude API 실패, 룰베이스 폴백:', err)
    return ruleBasedPrediction(analysis)
  }
}
