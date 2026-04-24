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

        res.setHeader('Access-Control-Allow-Origin', '*')

        const parsedUrl = new URL(url)
        const lib = parsedUrl.protocol === 'https:' ? https : http

        const proxyReq = lib.get(url, {
          headers: {
            'Referer': 'https://music.163.com/',
            'Accept': '*/*',
            ...(req.headers.range ? { 'Range': req.headers.range } : {}),
          },
        }, (proxyRes) => {
          if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
            // Follow redirect manually
            const location = proxyRes.headers.location
            if (location) {
              res.writeHead(302, { Location: `/api/audio-proxy?url=${encodeURIComponent(location)}` })
              res.end()
              return
            }
          }
          res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
          proxyRes.pipe(res)
        })

        proxyReq.on('error', (err) => {
          res.statusCode = 502
          res.end(`Proxy error: ${err.message}`)
        })
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
