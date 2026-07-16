import { defineConfig, type Connect, type Plugin, type ProxyOptions, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { neteaseQRLogin } from './src/lib/netease-qr-login'
import { getAllowedAudioUrl } from './src/lib/proxy-security'

const require = createRequire(import.meta.url)
const kuromojiDictDir = path.join(path.dirname(require.resolve('kuromoji')), '..', 'dict')
const kuromojiBrowserFile = path.join(path.dirname(require.resolve('kuromoji')), '..', 'build', 'kuromoji.js')
const zlibBrowserFile = path.join(path.dirname(require.resolve('zlibjs')), '..', 'bin', 'zlib.min.js')

function audioProxy(): Plugin {
  const install = (middlewares: Connect.Server) => {
    middlewares.use('/api/audio-proxy', (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET')
        res.end('Method not allowed')
        return
      }

      const value = new URL(req.url ?? '', 'http://localhost').searchParams.get('url')
      const target = value ? getAllowedAudioUrl(value) : null
      if (!target) {
        res.statusCode = 400
        res.end('Audio URL is missing or not allowed')
        return
      }

      const lib = target.protocol === 'https:' ? https : http
      const proxyReq = lib.get(target, {
        headers: {
          Referer: 'https://music.163.com/',
          Accept: 'audio/*,*/*;q=0.8',
          ...(req.headers.range ? { Range: req.headers.range } : {}),
        },
      }, (proxyRes) => {
        if ([301, 302, 307, 308].includes(proxyRes.statusCode ?? 0)) {
          const redirect = proxyRes.headers.location
            ? getAllowedAudioUrl(proxyRes.headers.location, target)
            : null
          proxyRes.resume()
          if (!redirect) {
            res.statusCode = 502
            res.end('Upstream redirect was not allowed')
            return
          }
          res.writeHead(302, {
            Location: `/api/audio-proxy?url=${encodeURIComponent(redirect.href)}`,
            'Cache-Control': 'no-store',
          })
          res.end()
          return
        }

        const headers = { ...proxyRes.headers }
        delete headers['set-cookie']
        delete headers['access-control-allow-origin']
        delete headers.location
        res.writeHead(proxyRes.statusCode ?? 502, headers)
        proxyRes.pipe(res)
      })

      proxyReq.setTimeout(15_000, () => proxyReq.destroy(new Error('Upstream audio request timed out')))
      proxyReq.on('error', (error) => {
        if (res.headersSent) return
        res.statusCode = 502
        res.end(`Audio proxy error: ${error.message}`)
      })
    })
  }

  return {
    name: 'audio-proxy',
    configureServer(server) {
      install(server.middlewares)
    },
    configurePreviewServer(server) {
      install(server.middlewares)
    },
  }
}

function ttsProxy(): Plugin {
  const install = (middlewares: Connect.Server) => {
    middlewares.use('/api/tts', (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET')
        res.end('Method not allowed')
        return
      }
      const params = new URL(req.url ?? '', 'http://localhost').searchParams
      const text = params.get('q')?.trim() ?? ''
      if (!text || text.length > 300) {
        res.statusCode = 400
        res.end('q must contain 1 to 300 characters')
        return
      }

      const requestedSpeed = params.get('spd') ?? '2'
      const speed = ['1', '2', '3', '4', '5'].includes(requestedSpeed) ? requestedSpeed : '2'
      const baiduUrl = `https://fanyi.baidu.com/gettts?lan=jp&text=${encodeURIComponent(text)}&spd=${speed}&source=web`
      const proxyReq = https.get(baiduUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://fanyi.baidu.com/',
          Accept: 'audio/*,*/*;q=0.8',
          'Accept-Encoding': 'identity',
        },
      }, (proxyRes) => {
        res.setHeader('Content-Type', proxyRes.headers['content-type'] ?? 'audio/mpeg')
        res.setHeader('Cache-Control', 'private, max-age=300')
        res.writeHead(proxyRes.statusCode ?? 502)
        proxyRes.pipe(res)
      })
      proxyReq.setTimeout(15_000, () => proxyReq.destroy(new Error('TTS request timed out')))
      proxyReq.on('error', () => {
        if (res.headersSent) return
        res.statusCode = 502
        res.end('TTS proxy error')
      })
    })
  }

  return {
    name: 'tts-proxy',
    configureServer(server) {
      install(server.middlewares)
    },
    configurePreviewServer(server) {
      install(server.middlewares)
    },
  }
}

function healthCheck(): Plugin {
  const install = (middlewares: Connect.Server) => {
    middlewares.use('/api/health', (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET, HEAD')
        res.end()
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok' }))
    })
  }

  return {
    name: 'health-check',
    configureServer(server) {
      install(server.middlewares)
    },
    configurePreviewServer(server) {
      install(server.middlewares)
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
  const musicCookieValue = process.env.NETEASE_MUSIC_U?.trim() || env.NETEASE_MUSIC_U?.trim()
  const musicCookie = musicCookieValue ? `MUSIC_U=${musicCookieValue}` : ''
  const appHost = process.env.HOST?.trim() || env.HOST?.trim() || '127.0.0.1'
  const appPort = Number(process.env.PORT || env.PORT || 4173)
  const apiProxy: Record<string, ProxyOptions> = {
    '/api/netease': {
      target: 'https://music.163.com',
      changeOrigin: true,
      rewrite: (requestPath) => requestPath.replace(/^\/api\/netease/, '/api'),
      headers: musicCookie ? { Cookie: musicCookie } : {},
    },
    '/api/local': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (requestPath) => requestPath.replace(/^\/api\/local/, ''),
      headers: musicCookie ? { Cookie: musicCookie } : {},
    },
  }

  return {
    plugins: [react(), tailwindcss(), healthCheck(), audioProxy(), ttsProxy(), kuromojiDictPlugin(), neteaseQRLogin()],
    server: {
      host: appHost,
      port: Number.isFinite(appPort) ? appPort : 4173,
      proxy: apiProxy,
    },
    preview: {
      host: appHost,
      port: Number.isFinite(appPort) ? appPort : 4173,
      proxy: apiProxy,
    },
  }
})
