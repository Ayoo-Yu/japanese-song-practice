import CryptoJS from 'crypto-js'
import forge from 'node-forge'
import fs from 'fs'
import path from 'path'
import type { Plugin } from 'vite'

const PRESET_KEY = '0CoJUm6Qyw8W8jud'
const IV = '0102030405060708'
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`

const forgePubKey = forge.pki.publicKeyFromPem(PUBLIC_KEY)

function aesCbcEncrypt(text: string, key: string): string {
  return CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(text),
    CryptoJS.enc.Utf8.parse(key),
    {
      iv: CryptoJS.enc.Utf8.parse(IV),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  ).toString()
}

function weapiEncrypt(data: Record<string, unknown>): { params: string; encSecKey: string } {
  const text = JSON.stringify(data)
  let secretKey = ''
  for (let i = 0; i < 16; i++) {
    secretKey += BASE62.charAt(Math.floor(Math.random() * 62))
  }
  const params = aesCbcEncrypt(aesCbcEncrypt(text, PRESET_KEY), secretKey)
  const reversed = secretKey.split('').reverse().join('')
  const encrypted = forgePubKey.encrypt(reversed, 'NONE')
  const encSecKey = forge.util.bytesToHex(encrypted)
  return { params, encSecKey }
}

function writeEnvCookie(cookieValue: string) {
  const envPath = path.resolve(process.cwd(), '.env')
  let content = ''
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8')
  }
  const lines = content.split('\n').filter((l) => !l.startsWith('NETEASE_MUSIC_U='))
  lines.push(`NETEASE_MUSIC_U=${cookieValue}`)
  fs.writeFileSync(envPath, lines.join('\n') + '\n')
}

function getEnvCookie(): string {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return ''
  const content = fs.readFileSync(envPath, 'utf-8')
  return content.match(/^NETEASE_MUSIC_U=(.+)$/m)?.[1]?.trim() ?? ''
}

export function neteaseQRLogin(): Plugin {
  // Cookie jar maintained across requests for this session
  let cookieJar = ''

  async function postWeapi(url: string, data: Record<string, unknown>) {
    const { params, encSecKey } = weapiEncrypt(data)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com/',
        Origin: 'https://music.163.com',
        ...(cookieJar ? { Cookie: cookieJar } : {}),
      },
      body: `params=${encodeURIComponent(params)}&encSecKey=${encodeURIComponent(encSecKey)}`,
    })

    // Maintain cookies
    const setCookies = res.headers.getSetCookie?.() ?? []
    for (const c of setCookies) {
      const name = c.split('=')[0]
      cookieJar = cookieJar
        .split('; ')
        .filter((s) => !s.startsWith(name + '='))
        .join('; ')
      const value = c.split(';')[0]
      cookieJar = cookieJar ? cookieJar + '; ' + value : value
    }

    return res
  }

  return {
    name: 'netease-qr-login',
    configureServer(server) {
      server.middlewares.use('/api/qr-login', (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')

        if (url.pathname === '/status') {
          const cookie = getEnvCookie()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ loggedIn: cookie.length > 10 }))
          return
        }

        if (url.pathname === '/key') {
          postWeapi('https://music.163.com/weapi/login/qrcode/unikey', { type: 3 })
            .then(async (apiRes) => {
              const json = (await apiRes.json()) as { unikey?: string }
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  unikey: json.unikey ?? null,
                  qrUrl: json.unikey
                    ? `https://music.163.com/login?codekey=${json.unikey}`
                    : null,
                }),
              )
            })
            .catch((err) => {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            })
          return
        }

        if (url.pathname === '/check') {
          const key = url.searchParams.get('key')
          if (!key) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing key parameter' }))
            return
          }

          postWeapi('https://music.163.com/weapi/login/qrcode/client/login', {
            key,
            type: 3,
          })
            .then(async (apiRes) => {
              const text = await apiRes.text()
              const json = text ? JSON.parse(text) : { code: 0 }

              if (json.code === 803) {
                const setCookies = apiRes.headers.getSetCookie?.() ?? []
                let musicU = ''
                for (const c of setCookies) {
                  const match = c.match(/MUSIC_U=([^;]+)/)
                  if (match) musicU = match[1]
                }
                if (musicU) {
                  writeEnvCookie(musicU)
                }
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ code: json.code, message: json.message ?? '' }))
            })
            .catch((err) => {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            })
          return
        }

        if (url.pathname === '/save') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const { cookie } = JSON.parse(body) as { cookie?: string }
              if (!cookie || cookie.length < 10) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: false, error: 'Cookie 值无效' }))
                return
              }
              writeEnvCookie(cookie)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: '请求格式错误' }))
            }
          })
          return
        }

        if (url.pathname === '/song-url') {
          const id = url.searchParams.get('id')
          if (!id) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing id' }))
            return
          }

          const envCookie = getEnvCookie()
          if (envCookie) {
            cookieJar = cookieJar
              .split('; ')
              .filter((s) => !s.startsWith('MUSIC_U='))
              .join('; ')
            cookieJar = cookieJar ? cookieJar + '; MUSIC_U=' + envCookie : 'MUSIC_U=' + envCookie
          }

          postWeapi('https://music.163.com/weapi/song/enhance/player/url/v1', {
            ids: `[${id}]`,
            level: 'exhigh',
            encodeType: 'aac',
          })
            .then(async (apiRes) => {
              const json = await apiRes.text()
              res.setHeader('Content-Type', 'application/json')
              res.end(json)
            })
            .catch((err) => {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            })
          return
        }

        next()
      })
    },
  }
}
