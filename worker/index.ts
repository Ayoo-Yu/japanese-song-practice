import {
  getBilibiliShortUrl,
  isAllowedBilibiliRedirect,
  parseBilibiliVideoInput,
} from '../src/lib/bilibili'
import { getAllowedAudioUrl } from '../src/lib/proxy-security'

export interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
  NETEASE_MUSIC_U?: string
}

const PRESET_KEY = '0CoJUm6Qyw8W8jud'
const AES_IV = '0102030405060708'
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const RSA_MODULUS = BigInt(
  '0xe0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7',
)
const RSA_EXPONENT = 0x10001n
const NETEASE_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const worker = {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url)

    try {
      if (url.pathname === '/api/health') return handleHealth(request)
      if (url.pathname === '/api/audio-proxy') return await handleAudioProxy(request, url)
      if (url.pathname === '/api/tts') return await handleTts(request, url)
      if (url.pathname === '/api/bilibili-resolve') return await handleBilibiliResolve(request, url)
      if (url.pathname.startsWith('/api/qr-login/')) return await handleQrLogin(request, url, env)
      if (url.pathname === '/api/netease' || url.pathname.startsWith('/api/netease/')) {
        return await handleNeteaseProxy(request, url, env)
      }
      if (url.pathname.startsWith('/api/')) return jsonResponse({ error: 'API route not found' }, 404)

      return env.ASSETS.fetch(request)
    } catch {
      return jsonResponse({ error: 'Upstream service is temporarily unavailable' }, 502)
    }
  },
}

export default worker

function handleHealth(request: Request): Response {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET, HEAD')
  }

  return new Response(request.method === 'HEAD' ? null : JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

async function handleNeteaseProxy(
  request: Request,
  url: URL,
  env: WorkerEnv,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed('GET, HEAD')
  }

  const suffix = url.pathname.slice('/api/netease'.length)
  const target = new URL(`/api${suffix || '/'}`, 'https://music.163.com')
  target.search = url.search

  const upstream = await fetch(target, {
    method: request.method,
    headers: neteaseHeaders(getMusicCookie(env)),
    redirect: 'follow',
  })
  return sanitizedUpstreamResponse(upstream)
}

async function handleAudioProxy(request: Request, url: URL): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed('GET')

  const value = url.searchParams.get('url')
  const initialTarget = value ? getAllowedAudioUrl(value) : null
  if (!value) return textResponse('Missing url param', 400)
  if (!initialTarget) return textResponse('Audio host is not allowed', 403)

  let target = initialTarget
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const headers = new Headers({
      Referer: 'https://music.163.com/',
      Accept: 'audio/*,*/*;q=0.8',
      'Accept-Encoding': 'identity',
    })
    const range = request.headers.get('range')
    if (range) headers.set('Range', range)

    const upstream = await fetch(target, { headers, redirect: 'manual' })
    const location = upstream.headers.get('location')
    if (location && isRedirectStatus(upstream.status)) {
      if (redirectCount === 5) return textResponse('Too many audio redirects', 502)
      const redirect = getAllowedAudioUrl(location, target)
      if (!redirect) return textResponse('Upstream redirect was not allowed', 502)
      target = redirect
      continue
    }

    const responseHeaders = copyHeaders(upstream.headers, [
      'accept-ranges',
      'cache-control',
      'content-disposition',
      'content-length',
      'content-range',
      'content-type',
      'etag',
      'last-modified',
    ])
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set(
      'Access-Control-Expose-Headers',
      'Accept-Ranges, Content-Length, Content-Range',
    )
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  }

  return textResponse('Audio proxy failed', 502)
}

async function handleTts(request: Request, url: URL): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed('GET')

  const text = url.searchParams.get('q')?.trim() ?? ''
  if (!text || text.length > 300) return textResponse('q must contain 1 to 300 characters', 400)

  const requestedSpeed = url.searchParams.get('spd') ?? '2'
  const speed = ['1', '2', '3', '4', '5'].includes(requestedSpeed) ? requestedSpeed : '2'
  const target = new URL('https://fanyi.baidu.com/gettts')
  target.search = new URLSearchParams({ lan: 'jp', text, spd: speed, source: 'web' }).toString()

  const upstream = await fetch(target, {
    headers: {
      'User-Agent': NETEASE_USER_AGENT,
      Referer: 'https://fanyi.baidu.com/',
      Accept: 'audio/*,*/*;q=0.8',
      'Accept-Encoding': 'identity',
    },
  })
  const headers = copyHeaders(upstream.headers, ['content-length', 'content-type'])
  if (!headers.has('content-type')) headers.set('Content-Type', 'audio/mpeg')
  headers.set('Cache-Control', 'private, max-age=300')
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}

async function handleBilibiliResolve(request: Request, url: URL): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed('GET')

  const value = url.searchParams.get('url')?.trim() ?? ''
  const shortUrl = value.length <= 2_048 ? getBilibiliShortUrl(value) : null
  if (!shortUrl) return textResponse('A valid HTTPS b23.tv URL is required', 400)

  let target = shortUrl
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const parsedTarget = parseBilibiliVideoInput(target.toString())
    if (parsedTarget && target.hostname.toLowerCase() !== 'b23.tv') {
      return jsonResponse({ url: parsedTarget.sourceUrl }, 200, { 'Cache-Control': 'private, max-age=300' })
    }

    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JapaneseSongPractice/1.0)',
        Accept: 'text/html,*/*;q=0.8',
      },
      redirect: 'manual',
    })
    const location = upstream.headers.get('location')
    if (!location || !isRedirectStatus(upstream.status)) {
      return textResponse('Unable to resolve this Bilibili short link', 422)
    }
    if (redirectCount === 5) return textResponse('Unable to resolve this Bilibili short link', 422)

    const redirect = new URL(location, target)
    if (!isAllowedBilibiliRedirect(redirect)) {
      return textResponse('Unable to resolve this Bilibili short link', 422)
    }
    target = redirect
  }

  return textResponse('Unable to resolve this Bilibili short link', 422)
}

async function handleQrLogin(request: Request, url: URL, env: WorkerEnv): Promise<Response> {
  const action = url.pathname.slice('/api/qr-login'.length)

  if (action === '/status') {
    if (request.method !== 'GET') return methodNotAllowed('GET')
    return jsonResponse({
      configured: Boolean(getMusicCookie(env)),
      writable: false,
    }, 200, { 'Cache-Control': 'no-store' })
  }

  if (action === '/key' || action === '/check' || action === '/save') {
    return jsonResponse({
      ok: false,
      error: '部署环境中的凭据由服务器管理员配置，不能从网页修改',
    }, 403, { 'Cache-Control': 'no-store' })
  }

  if (action !== '/song-url') return jsonResponse({ error: 'API route not found' }, 404)
  if (request.method !== 'GET') return methodNotAllowed('GET')

  const id = url.searchParams.get('id')
  if (!id || !/^\d{1,20}$/.test(id)) return jsonResponse({ error: 'Missing id' }, 400)

  const attempts = [
    { level: 'exhigh', encodeType: 'aac' },
    { level: 'exhigh', encodeType: 'mp3' },
    { level: 'higher', encodeType: 'mp3' },
    { level: 'standard', encodeType: 'mp3' },
  ]
  let lastPayload: Record<string, unknown> | null = null

  for (const attempt of attempts) {
    const upstream = await postWeapi(
      'https://music.163.com/weapi/song/enhance/player/url/v1',
      { ids: `[${id}]`, level: attempt.level, encodeType: attempt.encodeType },
      getMusicCookie(env),
    )
    const payload = await responseJsonRecord(upstream)
    lastPayload = payload
    const data = Array.isArray(payload.data) ? payload.data : []
    const first = data[0]
    if (isRecord(first) && typeof first.url === 'string' && first.url) {
      return jsonResponse(payload, 200, { 'Cache-Control': 'no-store' })
    }
  }

  return jsonResponse(lastPayload ?? { code: 502, data: [] }, 200, { 'Cache-Control': 'no-store' })
}

async function postWeapi(
  target: string,
  data: Record<string, unknown>,
  musicCookie: string,
): Promise<Response> {
  const { params, encSecKey } = await weapiEncrypt(data)
  return fetch(target, {
    method: 'POST',
    headers: neteaseHeaders(musicCookie, {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://music.163.com',
    }),
    body: new URLSearchParams({ params, encSecKey }).toString(),
  })
}

export async function weapiEncrypt(
  data: Record<string, unknown>,
): Promise<{ params: string; encSecKey: string }> {
  const secretKey = randomSecretKey()
  const firstPass = await aesCbcEncrypt(JSON.stringify(data), PRESET_KEY)
  const params = await aesCbcEncrypt(firstPass, secretKey)
  const encSecKey = rsaEncryptNoPadding([...secretKey].reverse().join(''))
  return { params, encSecKey }
}

async function aesCbcEncrypt(text: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'AES-CBC' },
    false,
    ['encrypt'],
  )
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: encoder.encode(AES_IV) },
    cryptoKey,
    encoder.encode(text),
  )
  return bytesToBase64(new Uint8Array(encrypted))
}

function rsaEncryptNoPadding(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const encrypted = modPow(BigInt(`0x${hex}`), RSA_EXPONENT, RSA_MODULUS)
  return encrypted.toString(16).padStart(256, '0')
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  let factor = base % modulus
  let power = exponent
  while (power > 0n) {
    if (power & 1n) result = (result * factor) % modulus
    power >>= 1n
    factor = (factor * factor) % modulus
  }
  return result
}

function randomSecretKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((byte) => BASE62[byte % BASE62.length]).join('')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function getMusicCookie(env: WorkerEnv): string {
  const value = env.NETEASE_MUSIC_U?.trim() ?? ''
  return isSafeMusicCookie(value) ? value : ''
}

function isSafeMusicCookie(value: string): boolean {
  return value.length >= 10 && value.length <= 4_096 && /^[A-Za-z0-9._~+/%=-]+$/.test(value)
}

function neteaseHeaders(musicCookie: string, extras: HeadersInit = {}): Headers {
  const headers = new Headers({
    Referer: 'https://music.163.com/',
    'User-Agent': NETEASE_USER_AGENT,
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'X-Real-IP': '111.72.0.1',
    ...extras,
  })
  if (musicCookie) headers.set('Cookie', `MUSIC_U=${musicCookie}`)
  return headers
}

function sanitizedUpstreamResponse(upstream: Response): Response {
  const headers = new Headers(upstream.headers)
  headers.delete('set-cookie')
  headers.delete('set-cookie2')
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}

function copyHeaders(source: Headers, names: string[]): Headers {
  const headers = new Headers()
  for (const name of names) {
    const value = source.get(name)
    if (value !== null) headers.set(name, value)
  }
  return headers
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function responseJsonRecord(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  if (!text) return {}
  const value: unknown = JSON.parse(text)
  return isRecord(value) ? value : {}
}

function methodNotAllowed(allow: string): Response {
  return new Response('Method not allowed', { status: 405, headers: { Allow: allow } })
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  })
}
