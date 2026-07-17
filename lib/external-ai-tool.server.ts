import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { randomUUID } from 'node:crypto'
import type { AIPrediction } from './claude'
import type { StockAnalysis } from './types'

export const AI_TOOL_API_VERSION = '1.0'

interface ExternalToolConnection {
  endpointUrl: string
  authToken?: string | null
}

interface PredictionContext {
  symbol: string
  stockName: string
  market: 'US' | 'KR'
  endDate: string
  analysis: StockAnalysis
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase()
  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true

  const ipv4 = normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized
  const parts = ipv4.split('.').map(Number)
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || a >= 224
}

export async function validatePublicApiUrl(rawUrl: string): Promise<string> {
  let url: URL
  try { url = new URL(rawUrl) } catch { throw new Error('올바른 API 주소를 입력해주세요.') }

  if (url.protocol !== 'https:') throw new Error('예측 API는 HTTPS 주소만 연결할 수 있습니다.')
  if (url.username || url.password) throw new Error('API 주소에 아이디나 비밀번호를 포함할 수 없습니다.')
  if (url.port && url.port !== '443') throw new Error('안전을 위해 HTTPS 기본 포트(443)만 사용할 수 있습니다.')
  if (!url.hostname || url.hostname === 'localhost' || url.hostname.endsWith('.local') || isIP(url.hostname)) {
    throw new Error('공개 도메인으로 연결된 API 주소가 필요합니다.')
  }

  let addresses: Array<{ address: string }>
  try {
    addresses = await lookup(url.hostname, { all: true })
  } catch {
    throw new Error('API 도메인을 찾을 수 없습니다.')
  }
  if (!addresses.length || addresses.some(item => isPrivateIp(item.address))) {
    throw new Error('내부 네트워크 주소는 API로 등록할 수 없습니다.')
  }

  url.hash = ''
  return url.toString()
}

function publicAnalysis(analysis: StockAnalysis) {
  return {
    quote: {
      symbol: analysis.quote.symbol,
      name: analysis.quote.name,
      market: analysis.quote.market,
      price: analysis.quote.price,
      change_percent: analysis.quote.changePercent,
      open: analysis.quote.open,
      high: analysis.quote.high,
      low: analysis.quote.low,
      volume: analysis.quote.volume,
      average_volume: analysis.quote.avgVolume,
      fifty_two_week_high: analysis.quote.high52,
      fifty_two_week_low: analysis.quote.low52,
    },
    indicators: {
      rsi_14: analysis.rsi14,
      macd: analysis.macd,
      bollinger_bands: analysis.bollinger,
      moving_average_20: analysis.ma20,
      moving_average_50: analysis.ma50,
    },
    analyst: {
      target_price: analysis.analystTargetPrice,
      recommendation: analysis.analystRecommendation,
      analyst_count: analysis.analystCount,
      buy_count: analysis.analystBuyCount,
      hold_count: analysis.analystHoldCount,
      sell_count: analysis.analystSellCount,
    },
    sentiment: {
      fear_greed_value: analysis.fearGreedValue,
      fear_greed_label: analysis.fearGreedLabel,
      recent_news: analysis.recentNews,
    },
  }
}

function testAnalysis(): StockAnalysis {
  return {
    quote: { symbol: 'NVDA', name: 'NVIDIA', market: 'US', price: 100, change: 1.2, changePercent: 1.2, open: 99, high: 102, low: 98, high52: 130, low52: 70, volume: 50_000_000, avgVolume: 45_000_000 },
    rsi14: 56.2,
    macd: { macd: 1.4, signal: 1.1, histogram: 0.3 },
    bollinger: { upper: 106, middle: 98, lower: 90 },
    ma20: 98,
    ma50: 94,
    analystTargetPrice: 112,
    analystRecommendation: 'buy',
    analystCount: 20,
    analystBuyCount: 14,
    analystHoldCount: 5,
    analystSellCount: 1,
    usdKrwRate: 1350,
    fearGreedValue: 52,
    fearGreedLabel: '중립',
    recentNews: [{ headline: 'AI Battle API 연결 테스트용 데이터', date: '2026-01-01', sentiment: 'Neutral' }],
  }
}

function createPayload(context: PredictionContext) {
  return {
    version: AI_TOOL_API_VERSION,
    action: 'predict',
    request_id: randomUUID(),
    battle: {
      symbol: context.symbol,
      stock_name: context.stockName,
      market: context.market,
      start_price: context.analysis.quote.price,
      target_date: context.endDate,
    },
    analysis: publicAnalysis(context.analysis),
  }
}

async function readJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader()
  if (!reader) return response.json()

  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 64 * 1024) {
      await reader.cancel()
      throw new Error('API 응답이 64KB를 초과했습니다.')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  chunks.forEach(chunk => { bytes.set(chunk, offset); offset += chunk.byteLength })
  try { return JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new Error('API가 올바른 JSON을 반환하지 않았습니다.') }
}

function normalizePrediction(raw: unknown): AIPrediction {
  if (!raw || typeof raw !== 'object') throw new Error('API 응답이 JSON 객체가 아닙니다.')
  const data = raw as Record<string, unknown>
  const reasoning = data.reasoning as Record<string, unknown> | undefined
  const changePercent = Number(data.change_percent)
  const confidence = Number(data.confidence)

  if (!Number.isFinite(changePercent) || changePercent < -100 || changePercent > 1000) {
    throw new Error('change_percent는 -100~1000 사이 숫자여야 합니다.')
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    throw new Error('confidence는 0~100 사이 숫자여야 합니다.')
  }
  if (!reasoning || ['technical', 'sentiment', 'risk', 'conclusion'].some(key => typeof reasoning[key] !== 'string' || !String(reasoning[key]).trim())) {
    throw new Error('reasoning에 technical, sentiment, risk, conclusion 설명이 모두 필요합니다.')
  }

  return {
    change_percent: Number(changePercent.toFixed(2)),
    confidence: Math.round(confidence),
    brief: typeof data.brief === 'string' && data.brief.trim() ? data.brief.trim().slice(0, 120) : '제작자 AI 예측이 도착했습니다.',
    reasoning: {
      technical: String(reasoning.technical).slice(0, 1000),
      sentiment: String(reasoning.sentiment).slice(0, 1000),
      risk: String(reasoning.risk).slice(0, 1000),
      conclusion: String(reasoning.conclusion).slice(0, 1000),
    },
    mode: 'external',
  }
}

async function requestPrediction(connection: ExternalToolConnection, payload: ReturnType<typeof createPayload>): Promise<AIPrediction> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(connection.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AI-Battle/1.0',
        'X-AI-Battle-Version': AI_TOOL_API_VERSION,
        'X-AI-Battle-Request-ID': payload.request_id,
        ...(connection.authToken ? { Authorization: `Bearer ${connection.authToken}` } : {}),
      },
      body: JSON.stringify(payload),
      redirect: 'error',
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`API가 HTTP ${response.status}로 응답했습니다.`)
    return normalizePrediction(await readJson(response))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('API가 12초 안에 응답하지 않았습니다.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function verifyExternalTool(connection: ExternalToolConnection): Promise<AIPrediction> {
  const endpointUrl = await validatePublicApiUrl(connection.endpointUrl)
  return requestPrediction({ ...connection, endpointUrl }, createPayload({
    symbol: 'NVDA', stockName: 'NVIDIA', market: 'US', endDate: '2026-01-08', analysis: testAnalysis(),
  }))
}

export async function callExternalTool(connection: ExternalToolConnection, context: PredictionContext): Promise<AIPrediction> {
  const endpointUrl = await validatePublicApiUrl(connection.endpointUrl)
  return requestPrediction({ ...connection, endpointUrl }, createPayload(context))
}
