import { Hono } from 'hono'

type MarketMetricId = 'realYield10Y' | 'usdBroad' | 'highYieldSpread' | 'gldHoldingsTonnes'
type MarketTrend = 'up' | 'down' | 'flat' | 'na'

interface MarketPoint {
  date: string
  value: number
}

interface MarketMetric {
  id: MarketMetricId
  name: string
  unit: string
  source: string
  sourceUrl: string
  latestValue: number | null
  latestDate: string | null
  previousValue: number | null
  previousDate: string | null
  change: number | null
  changePct: number | null
  trend: MarketTrend
  goldImpact: string
  history: MarketPoint[]
}

interface MarketMonitorPayload {
  generatedAt: string
  periodDays: number
  metrics: MarketMetric[]
  warnings: string[]
}

interface MetricConfig {
  id: MarketMetricId
  name: string
  unit: string
  source: string
  sourceUrl: string
  fetchSeries: (days: number, signal: AbortSignal) => Promise<MarketPoint[]>
  goldImpactByChange: (change: number | null) => string
}

interface CacheEntry {
  days: number
  expiresAt: number
  payload: MarketMonitorPayload
}

const marketMonitor = new Hono()
const DEFAULT_DAYS = 90
const MIN_DAYS = 30
const MAX_DAYS = 365
const CACHE_TTL_MS = 30 * 60 * 1000
const FETCH_TIMEOUT_MS = 12_000
let cache: CacheEntry | null = null

const METRIC_CONFIGS: MetricConfig[] = [
  {
    id: 'realYield10Y',
    name: '美国10年实际利率 (DFII10)',
    unit: '%',
    source: 'FRED',
    sourceUrl: 'https://fred.stlouisfed.org/series/DFII10',
    fetchSeries: (days, signal) => fetchFredSeries('DFII10', days, signal),
    goldImpactByChange: (change) => {
      if (change === null) return '数据不足'
      if (change > 0) return '利率上行，偏空黄金'
      if (change < 0) return '利率下行，偏多黄金'
      return '中性'
    },
  },
  {
    id: 'usdBroad',
    name: '美元广义指数 (DTWEXBGS)',
    unit: 'index',
    source: 'FRED',
    sourceUrl: 'https://fred.stlouisfed.org/series/DTWEXBGS',
    fetchSeries: (days, signal) => fetchFredSeries('DTWEXBGS', days, signal),
    goldImpactByChange: (change) => {
      if (change === null) return '数据不足'
      if (change > 0) return '美元走强，偏空黄金'
      if (change < 0) return '美元走弱，偏多黄金'
      return '中性'
    },
  },
  {
    id: 'highYieldSpread',
    name: '美高收益债利差 (BAMLH0A0HYM2)',
    unit: 'pct',
    source: 'FRED',
    sourceUrl: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2',
    fetchSeries: (days, signal) => fetchFredSeries('BAMLH0A0HYM2', days, signal),
    goldImpactByChange: (change) => {
      if (change === null) return '数据不足'
      if (change > 0) return '信用压力升温，避险偏多黄金'
      if (change < 0) return '信用压力缓和，避险需求回落'
      return '中性'
    },
  },
  {
    id: 'gldHoldingsTonnes',
    name: 'GLD 吨位持仓 (ETF 代理)',
    unit: 'tonnes',
    source: 'SPDR Gold Shares',
    sourceUrl: 'https://www.spdrgoldshares.com/usa/historical-data',
    fetchSeries: fetchGldHoldingsSeries,
    goldImpactByChange: (change) => {
      if (change === null) return '数据不足'
      if (change > 0) return 'ETF 持仓上升，偏多黄金'
      if (change < 0) return 'ETF 持仓下降，偏空黄金'
      return '中性'
    },
  },
]

marketMonitor.get('/', async (c) => {
  const days = parseDays(c.req.query('days'))
  const now = Date.now()

  if (cache && cache.days === days && cache.expiresAt > now) {
    return c.json({ code: 0, data: cache.payload, message: 'ok' })
  }

  const warnings: string[] = []
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const metrics = await Promise.all(
      METRIC_CONFIGS.map(async (config) => {
        try {
          const history = await config.fetchSeries(days, controller.signal)
          return buildMetric(config, history)
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          warnings.push(`${config.name} 拉取失败: ${message}`)
          return buildMetric(config, [])
        }
      })
    )

    const payload: MarketMonitorPayload = {
      generatedAt: new Date().toISOString(),
      periodDays: days,
      metrics,
      warnings,
    }

    cache = {
      days,
      expiresAt: now + CACHE_TTL_MS,
      payload,
    }

    return c.json({ code: 0, data: payload, message: 'ok' })
  } finally {
    clearTimeout(timeout)
  }
})

function parseDays(input: string | undefined): number {
  if (!input) return DEFAULT_DAYS
  const value = Number.parseInt(input, 10)
  if (!Number.isFinite(value)) return DEFAULT_DAYS
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, value))
}

function buildMetric(config: MetricConfig, history: MarketPoint[]): MarketMetric {
  const latest = history.at(-1) ?? null
  const previous = history.length > 1 ? history[history.length - 2] : null
  const change = latest && previous ? round(latest.value - previous.value, 4) : null
  const changePct =
    latest && previous && previous.value !== 0
      ? round((change! / previous.value) * 100, 4)
      : null

  return {
    id: config.id,
    name: config.name,
    unit: config.unit,
    source: config.source,
    sourceUrl: config.sourceUrl,
    latestValue: latest?.value ?? null,
    latestDate: latest?.date ?? null,
    previousValue: previous?.value ?? null,
    previousDate: previous?.date ?? null,
    change,
    changePct,
    trend: getTrend(change),
    goldImpact: config.goldImpactByChange(change),
    history,
  }
}

function getTrend(change: number | null): MarketTrend {
  if (change === null) return 'na'
  if (Math.abs(change) < 0.0001) return 'flat'
  return change > 0 ? 'up' : 'down'
}

async function fetchFredSeries(seriesId: string, days: number, signal: AbortSignal): Promise<MarketPoint[]> {
  const startDate = daysAgo(days + 10)
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}&cosd=${startDate}`
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'text/csv' },
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const csv = await res.text()
  const rows = parseCsv(csv)
  if (rows.length < 2) return []

  const points: MarketPoint[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    const date = parseFlexibleDate(row[0] ?? '')
    const value = parseNumeric(row[1] ?? '')
    if (!date || value === null) continue
    if (date.getTime() < daysAgoMs(days)) continue

    points.push({ date: toIsoDate(date), value })
  }

  return sortPoints(points)
}

async function fetchGldHoldingsSeries(days: number, signal: AbortSignal): Promise<MarketPoint[]> {
  const url = 'https://www.spdrgoldshares.com/assets/dynamic/GLD/GLD_US_archive_EN.csv'
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'text/csv' },
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const csv = await res.text()
  const rows = parseCsv(csv)
  if (rows.length === 0) return []

  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeCell)
    return normalized.some((cell) => cell === 'date') &&
      normalized.some((cell) => cell.includes('tonnes') && cell.includes('trust'))
  })

  if (headerIndex < 0) {
    throw new Error('未识别到 GLD 数据表头')
  }

  const header = rows[headerIndex]
  if (!header) return []
  const normalizedHeader = header.map(normalizeCell)
  const dateIndex = normalizedHeader.findIndex((cell) => cell === 'date')
  const tonnesIndex = normalizedHeader.findIndex(
    (cell) => cell.includes('tonnes') && cell.includes('trust')
  )

  if (dateIndex < 0 || tonnesIndex < 0) {
    throw new Error('GLD 表头缺少 date/tonnes 列')
  }

  const points: MarketPoint[] = []
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    const date = parseFlexibleDate(row[dateIndex] ?? '')
    const value = parseNumeric(row[tonnesIndex] ?? '')
    if (!date || value === null) continue
    if (date.getTime() < daysAgoMs(days)) continue

    points.push({ date: toIsoDate(date), value })
  }

  return sortPoints(points)
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const text = input.replace(/^\uFEFF/, '')

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(cell.trim())
      cell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell.trim())
      cell = ''
      if (row.some((part) => part.length > 0)) rows.push(row)
      row = []
      continue
    }

    cell += char
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim())
    if (row.some((part) => part.length > 0)) rows.push(row)
  }

  return rows
}

function normalizeCell(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function parseNumeric(value: string): number | null {
  const normalized = value
    .replace(/,/g, '')
    .replace(/\$/g, '')
    .replace(/%/g, '')
    .trim()

  if (!normalized || normalized === '.' || normalized === '-') return null
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseFlexibleDate(value: string): Date | null {
  const input = value.trim()
  if (!input) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map((part) => Number.parseInt(part, 10))
    return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1))
  }

  const slashMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const month = Number.parseInt(slashMatch[1] ?? '', 10)
    const day = Number.parseInt(slashMatch[2] ?? '', 10)
    const year = Number.parseInt(slashMatch[3] ?? '', 10)
    return new Date(Date.UTC(year, month - 1, day))
  }

  const dashMonthMatch = input.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/)
  if (dashMonthMatch) {
    const day = Number.parseInt(dashMonthMatch[1] ?? '', 10)
    const month = monthToIndex(dashMonthMatch[2] ?? '')
    const rawYear = Number.parseInt(dashMonthMatch[3] ?? '', 10)
    const year = rawYear < 100 ? 2000 + rawYear : rawYear
    if (month >= 0) return new Date(Date.UTC(year, month, day))
  }

  const ts = Date.parse(input)
  if (!Number.isNaN(ts)) return new Date(ts)

  return null
}

function monthToIndex(mon: string): number {
  const map: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  }
  return map[mon.toLowerCase()] ?? -1
}

function daysAgo(days: number): string {
  return toIsoDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
}

function daysAgoMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function sortPoints(points: MarketPoint[]): MarketPoint[] {
  const byDate = new Map<string, number>()
  for (const point of points) {
    byDate.set(point.date, point.value)
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export { marketMonitor }
