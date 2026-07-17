export type BattleMarket = 'KR' | 'US'

const MARKET_SCHEDULE: Record<BattleMarket, { timeZone: string; hour: number; minute: number }> = {
  KR: { timeZone: 'Asia/Seoul', hour: 15, minute: 45 },
  US: { timeZone: 'America/New_York', hour: 16, minute: 15 },
}

function zonedDateTimeToUtc(
  date: string,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const [year, month, day] = date.split('-').map(Number)
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(utcGuess)

  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value ?? 0)
  const renderedAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )
  const offset = renderedAsUtc - utcGuess.getTime()
  return new Date(utcGuess.getTime() - offset)
}

export function getBattleSettlementAt(endDate: string, market: string): Date {
  const normalizedMarket: BattleMarket = market === 'KR' ? 'KR' : 'US'
  const schedule = MARKET_SCHEDULE[normalizedMarket]
  return zonedDateTimeToUtc(endDate, schedule.hour, schedule.minute, schedule.timeZone)
}

export function canResolveBattle(endDate: string, market: string, now = new Date()): boolean {
  return now.getTime() >= getBattleSettlementAt(endDate, market).getTime()
}

export function settlementTimeLabel(endDate: string, market: string, locale: 'ko' | 'en'): string {
  const settlementAt = getBattleSettlementAt(endDate, market)
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(settlementAt)
}
