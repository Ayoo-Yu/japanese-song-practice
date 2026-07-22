import { defineConfig, type Plugin, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { neteaseQRLogin } from './src/lib/netease-qr-login'

const require = createRequire(import.meta.url)
const kuromojiDictDir = path.join(path.dirname(require.resolve('kuromoji')), '..', 'dict')
const kuromojiBrowserFile = path.join(path.dirname(require.resolve('kuromoji')), '..', 'build', 'kuromoji.js')
const zlibBrowserFile = path.join(path.dirname(require.resolve('zlibjs')), '..', 'bin', 'zlib.min.js')

function audioProxy(): Plugin {
  const allowedAudioHost = (hostname: string) => (
    hostname === 'music.163.com'
    || hostname.endsWith('.music.163.com')
    || hostname === 'music.126.net'
    || hostname.endsWith('.music.126.net')
  )

  return {
    name: 'audio-proxy',
    configureServer(server) {
      server.middlewares.use('/api/audio-proxy', (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost').searchParams.get('url')
        if (!url) {
          res.statusCode = 400
          res.end('Missing url param')
          return
        }

        const proxyRequest = (sourceUrl: string, redirectCount = 0) => {
          let parsedUrl: URL
          try {
            parsedUrl = new URL(sourceUrl)
          } catch {
            res.statusCode = 400
            res.end('Invalid audio URL')
            return
          }

          if (!['http:', 'https:'].includes(parsedUrl.protocol) || !allowedAudioHost(parsedUrl.hostname)) {
            res.statusCode = 403
            res.end('Audio host is not allowed')
            return
          }

          const lib = parsedUrl.protocol === 'https:' ? https : http
          const proxyReq = lib.get(parsedUrl, {
            headers: {
              Referer: 'https://music.163.com/',
              Accept: 'audio/*,*/*;q=0.8',
              'Accept-Encoding': 'identity',
              ...(req.headers.range ? { Range: req.headers.range } : {}),
            },
          }, (proxyRes) => {
            const redirectCodes = new Set([301, 302, 303, 307, 308])
            const location = proxyRes.headers.location
            if (location && redirectCodes.has(proxyRes.statusCode ?? 0)) {
              proxyRes.resume()
              if (redirectCount >= 5) {
                res.statusCode = 502
                res.end('Too many audio redirects')
                return
              }
              proxyRequest(new URL(location, parsedUrl).toString(), redirectCount + 1)
              return
            }

            const forwardedHeaders = [
              'accept-ranges',
              'cache-control',
              'content-disposition',
              'content-length',
              'content-range',
              'content-type',
              'etag',
              'last-modified',
            ] as const
            for (const header of forwardedHeaders) {
              const value = proxyRes.headers[header]
              if (value !== undefined) res.setHeader(header, value)
            }
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range')
            res.writeHead(proxyRes.statusCode ?? 502)
            proxyRes.pipe(res)
          })

          proxyReq.setTimeout(15000, () => proxyReq.destroy(new Error('Audio request timed out')))
          proxyReq.on('error', (err) => {
            if (res.headersSent) {
              res.destroy(err)
              return
            }
            res.statusCode = 502
            res.end(`Proxy error: ${err.message}`)
          })
        }

        proxyRequest(url)
      })
    },
  }
}

function ttsProxy(): Plugin {
  return {
    name: 'tts-proxy',
    configureServer(server) {
      server.middlewares.use('/api/tts', (req, res) => {
        const params = new URL(req.url ?? '', 'http://localhost').searchParams
        const text = params.get('q') ?? ''
        if (!text) {
          res.statusCode = 400
          res.end('Missing q param')
          return
        }

        const spd = params.get('spd') ?? '2'
        const baiduUrl = `https://fanyi.baidu.com/gettts?lan=jp&text=${encodeURIComponent(text)}&spd=${spd}&source=web`
        https.get(baiduUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://fanyi.baidu.com/',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
          },
        }, (proxyRes) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', proxyRes.headers['content-type'] ?? 'audio/mpeg')
          res.writeHead(proxyRes.statusCode ?? 502)
          proxyRes.pipe(res)
        }).on('error', () => {
          res.statusCode = 502
          res.end('TTS proxy error')
        })
      })
    },
  }
}

function kuromojiDictPlugin(): Plugin {
  return {
    name: 'kuromoji-dict',
    configureServer(server) {
      server.middlewares.use('/kuromoji-dict', (req, res) => {
        const reqPath = (req.url ?? '/').split('?')[0].replace(/^\/+/, '')
        const filePath = path.join(kuromojiDictDir, reqPath)
        if (!filePath.startsWith(kuromojiDictDir) || !fs.existsSync(filePath)) {
          res.statusCode = 404
          res.end('Dictionary file not found')
          return
        }

        res.setHeader('Content-Type', 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })

      server.middlewares.use('/vendor/kuromoji.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript')
        fs.createReadStream(kuromojiBrowserFile).pipe(res)
      })

      server.middlewares.use('/vendor/zlib.min.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript')
        fs.createReadStream(zlibBrowserFile).pipe(res)
      })
    },
    generateBundle() {
      for (const filename of fs.readdirSync(kuromojiDictDir)) {
        const filePath = path.join(kuromojiDictDir, filename)
        this.emitFile({
          type: 'asset',
          fileName: `kuromoji-dict/${filename}`,
          source: fs.readFileSync(filePath),
        })
      }

      this.emitFile({
        type: 'asset',
        fileName: 'vendor/kuromoji.js',
        source: fs.readFileSync(kuromojiBrowserFile),
      })

      this.emitFile({
        type: 'asset',
        fileName: 'vendor/zlib.min.js',
        source: fs.readFileSync(zlibBrowserFile),
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const musicCookie = env.NETEASE_MUSIC_U ? `MUSIC_U=${env.NETEASE_MUSIC_U}` : ''
  const devPort = Number(env.PORT || 4173)

  return {
    plugins: [react(), tailwindcss(), audioProxy(), ttsProxy(), kuromojiDictPlugin(), neteaseQRLogin()],
    server: {
      host: '127.0.0.1',
      port: Number.isFinite(devPort) ? devPort : 4173,
      proxy: {
        '/api/netease': {
          target: 'https://music.163.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/netease/, '/api'),
          headers: musicCookie ? { Cookie: musicCookie } : {},
        },
        '/api/local': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/local/, ''),
          headers: musicCookie ? { Cookie: musicCookie } : {},
        },
      },
    },
  }
})
