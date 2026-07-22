import type { BilibiliMv } from '../types'

const BVID_PATTERN = /(?:^|[^0-9a-z])(BV[0-9a-z]{10})(?=$|[^0-9a-z])/i
const TRAILING_SHARE_PUNCTUATION = /[),.\]}>，。；;！？!?]+$/u

interface BilibiliResolveResponse {
  url?: unknown
}

export function parseBilibiliVideoInput(input: string): BilibiliMv | null {
  const trimmed = input.trim()
  const match = trimmed.match(BVID_PATTERN)
  if (!match) return null

  const bvid = `BV${match[1].slice(2)}`
  const parsedUrl = getFirstUrl(trimmed)
  const page = getPositiveInteger(parsedUrl?.searchParams.get('p')) ?? 1
  const startAtSeconds = getStartAtSeconds(parsedUrl?.searchParams.get('t'))

  const canonicalUrl = new URL(`https://www.bilibili.com/video/${bvid}`)
  if (page > 1) canonicalUrl.searchParams.set('p', String(page))
  if (startAtSeconds !== undefined) canonicalUrl.searchParams.set('t', String(startAtSeconds))

  return {
    provider: 'bilibili',
    bvid,
    page,
    sourceUrl: canonicalUrl.toString(),
    ...(startAtSeconds !== undefined ? { startAtSeconds } : {}),
  }
}

export function getBilibiliShortUrl(input: string): URL | null {
  const parsedUrl = getFirstUrl(input.trim())
  if (!parsedUrl || parsedUrl.protocol !== 'https:') return null
  return parsedUrl.hostname.toLowerCase() === 'b23.tv' ? parsedUrl : null
}

export function isAllowedBilibiliRedirect(url: URL): boolean {
  if (url.protocol !== 'https:') return false
  const hostname = url.hostname.toLowerCase()
  return hostname === 'b23.tv' || hostname === 'bilibili.com' || hostname.endsWith('.bilibili.com')
}

export async function resolveBilibiliVideoInput(input: string): Promise<BilibiliMv> {
  const direct = parseBilibiliVideoInput(input)
  if (direct) return direct

  const shortUrl = getBilibiliShortUrl(input)
  if (!shortUrl) {
    throw new Error('请输入 B 站视频链接、b23.tv 短链接或 BV 号。')
  }

  const response = await fetch(`/api/bilibili-resolve?url=${encodeURIComponent(shortUrl.toString())}`)
  if (!response.ok) {
    throw new Error('短链接解析失败，请在 B 站打开后复制包含 BV 号的完整链接。')
  }

  const data = await response.json() as BilibiliResolveResponse
  const resolved = typeof data.url === 'string' ? parseBilibiliVideoInput(data.url) : null
  if (!resolved) {
    throw new Error('这个链接里没有找到可播放的 BV 号。')
  }
  return resolved
}

export function buildBilibiliEmbedUrl(mv: BilibiliMv): string {
  const embedUrl = new URL('https://player.bilibili.com/player.html')
  embedUrl.searchParams.set('bvid', mv.bvid)
  embedUrl.searchParams.set('p', String(Math.max(1, Math.trunc(mv.page) || 1)))
  embedUrl.searchParams.set('autoplay', '0')
  embedUrl.searchParams.set('danmaku', '0')
  if (mv.startAtSeconds !== undefined) {
    embedUrl.searchParams.set('t', String(Math.max(0, Math.trunc(mv.startAtSeconds))))
  }
  return embedUrl.toString()
}

export function buildBilibiliPageUrl(mv: BilibiliMv): string {
  const pageUrl = new URL(`https://www.bilibili.com/video/${encodeURIComponent(mv.bvid)}`)
  if (mv.page > 1) pageUrl.searchParams.set('p', String(Math.trunc(mv.page)))
  if (mv.startAtSeconds !== undefined) {
    pageUrl.searchParams.set('t', String(Math.max(0, Math.trunc(mv.startAtSeconds))))
  }
  return pageUrl.toString()
}

function getFirstUrl(input: string): URL | null {
  const candidate = input.match(/https?:\/\/[^\s]+/iu)?.[0]?.replace(TRAILING_SHARE_PUNCTUATION, '')
  if (!candidate) return null
  try {
    return new URL(candidate)
  } catch {
    return null
  }
}

function getPositiveInteger(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 999) return undefined
  return parsed
}

function getStartAtSeconds(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 86_400) return undefined
  return Math.trunc(parsed)
}
