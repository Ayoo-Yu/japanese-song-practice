import CryptoJS from 'crypto-js'
import forge from 'node-forge'
import fs from 'fs'
import path from 'path'
import qrcode from 'qrcode-terminal'
import type { Plugin } from 'vite'

const PRESET_KEY = '0CoJUm6Qyw8W8jud'
const IV = '0102030405060708'
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`

const forgePubKey = forge.pki.publicKeyFromPem(PUBLIC_KEY)

function aesEncrypt(text: string, key: string): string {
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

function weapi(data: Record<string, unknown>): { params: string; encSecKey: string } {
  const text = JSON.stringify(data)
  let secretKey = ''
  for (let i = 0; i < 16; i++) {
    secretKey += BASE62.charAt(Math.floor(Math.random() * 62))
  }
  const params = aesEncrypt(aesEncrypt(text, PRESET_KEY), secretKey)
  const reversed = secretKey.split('').reverse().join('')
  const encrypted = forgePubKey.encrypt(reversed, 'NONE')
  const encSecKey = forge.util.bytesToHex(encrypted)
  return { params, encSecKey }
}

async function postWeapi(url: string, data: Record<string, unknown>) {
  const { params, encSecKey } = weapi(data)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://music.163.com/',
      'Origin': 'https://music.163.com',
    },
    body: `params=${encodeURIComponent(params)}&encSecKey=${encodeURIComponent(encSecKey)}`,
  })
  return res
}

function renderTerminalQR(text: string): Promise<void> {
  return new Promise((resolve) => {
    qrcode.generate(text, { small: true }, (output: string) => {
      console.log(output)
      resolve()
    })
  })
}

async function pollQRCheck(
  key: string,
  onStatus: (code: number, message: string) => void,
): Promise<string | null> {
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    try {
      const res = await postWeapi(
        'https://music.163.com/weapi/login/qrcode/client/login',
        { key, type: 3 },
      )
      const text = await res.text()
      if (!text) continue
      const json = JSON.parse(text) as { code: number; message?: string }
      onStatus(json.code, json.message ?? '')

      if (json.code === 803) {
        const setCookies = res.headers.getSetCookie?.() ?? []
        for (const c of setCookies) {
          const match = c.match(/MUSIC_U=([^;]+)/)
          if (match) return match[1]
        }
        return null
      }
      if (json.code === 800) return null
    } catch {
      // Network error, retry
    }
  }
  return null
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

export function neteaseQRLogin(): Plugin {
  return {
    name: 'netease-qr-login',
    configureServer(server) {
      const envPath = path.resolve(process.cwd(), '.env')
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8')
        const existing = envContent.match(/^NETEASE_MUSIC_U=(.+)$/m)?.[1]?.trim()
        if (existing && existing.length > 10) {
          server.httpServer?.once('listening', () => {
            console.log('\n  \x1b[32m✓ NETEASE_MUSIC_U already configured\x1b[0m\n')
          })
          return
        }
      }

      server.httpServer?.once('listening', async () => {
        console.log('\n  \x1b[36m╔══════════════════════════════════════╗\x1b[0m')
        console.log('  \x1b[36m║   NetEase Cloud Music QR Login      ║\x1b[0m')
        console.log('  \x1b[36m╚══════════════════════════════════════╝\x1b[0m\n')
        console.log('  打开网易云音乐 APP 扫描二维码登录\n')

        try {
          const keyRes = await postWeapi(
            'https://music.163.com/weapi/login/qrcode/unikey',
            { type: 3 },
          )
          const keyJson = (await keyRes.json()) as { unikey?: string; code?: number }
          if (!keyJson.unikey) {
            console.log('  \x1b[31m✗ 获取二维码失败\x1b[0m\n')
            return
          }

          const qrUrl = `https://music.163.com/login?codekey=${keyJson.unikey}`
          await renderTerminalQR(qrUrl)
          console.log(`  或在浏览器打开: ${qrUrl}\n`)

          const cookie = await pollQRCheck(keyJson.unikey, (code) => {
            if (code === 801)
              process.stdout.write('\r  \x1b[33m⏳ 等待扫码...\x1b[0m        ')
            if (code === 802)
              process.stdout.write('\r  \x1b[33m⏳ 已扫码，请在手机确认...\x1b[0m')
          })

          if (cookie) {
            writeEnvCookie(cookie)
            console.log('\n\n  \x1b[32m✓ 登录成功！Cookie 已保存到 .env\x1b[0m')
            console.log('  \x1b[32m✓ 重启开发服务器后生效。\x1b[0m\n')
          } else {
            console.log('\n\n  \x1b[31m✗ 二维码已过期，请重启开发服务器重试。\x1b[0m\n')
          }
        } catch (err) {
          console.log('  \x1b[31m✗ 扫码登录失败:\x1b[0m', err, '\n')
        }
      })
    },
  }
}
