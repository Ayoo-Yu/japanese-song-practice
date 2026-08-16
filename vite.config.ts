import { defineConfig, type Connect, type Plugin, type ProxyOptions, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import http, { type IncomingMessage, type ServerResponse } from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { neteaseQRLogin } from './src/lib/netease-qr-login'
import { getAllowedAudioUrl } from './src/lib/proxy-security'
import {
  getBilibiliShortUrl,
  isAllowedBilibiliRedirect,
  parseBilibiliVideoInput,
} from './src/lib/bilibili'

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
      if (!value) {
        res.statusCode = 400
        res.end('Missing url param')
        return
      }

      const initialTarget = getAllowedAudioUrl(value)
      if (!initialTarget) {
        res.statusCode = 403
        res.end('Audio host is not allowed')
        return
      }

      const proxyRequest = (target: URL, redirectCount = 0) => {
        const lib = target.protocol === 'https:' ? https : http
        const proxyReq = lib.get(target, {
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
            const redirect = getAllowedAudioUrl(location, target)
            if (!redirect) {
              res.statusCode = 502
              res.end('Upstream redirect was not allowed')
              return
            }
            proxyRequest(redirect, redirectCount + 1)
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
            const headerValue = proxyRes.headers[header]
            if (headerValue !== undefined) res.setHeader(header, headerValue)
          }
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range')
          res.writeHead(proxyRes.statusCode ?? 502)
          proxyRes.pipe(res)
        })

        proxyReq.setTimeout(15_000, () => proxyReq.destroy(new Error('Upstream audio request timed out')))
        proxyReq.on('error', (error) => {
          if (res.headersSent) {
            res.destroy(error)
            return
          }
          res.statusCode = 502
          res.end(`Audio proxy error: ${error.message}`)
        })
      }

      proxyRequest(initialTarget)
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

function bilibiliLinkResolver(): Plugin {
  const followRedirects = (target: URL, redirectCount = 0): Promise<URL> => {
    const parsedTarget = parseBilibiliVideoInput(target.toString())
    if (parsedTarget && target.hostname.toLowerCase() !== 'b23.tv') {
      return Promise.resolve(new URL(parsedTarget.sourceUrl))
    }
    if (redirectCount >= 5) return Promise.reject(new Error('Too many redirects'))

    return new Promise((resolve, reject) => {
      const request = https.get(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JapaneseSongPractice/1.0)',
          Accept: 'text/html,*/*;q=0.8',
        },
      }, (response) => {
        const redirectCodes = new Set([301, 302, 303, 307, 308])
        const location = response.headers.location
        response.resume()

        if (!location || !redirectCodes.has(response.statusCode ?? 0)) {
          reject(new Error('Short link did not redirect to a Bilibili video'))
          return
        }

        let redirect: URL
        try {
          redirect = new URL(location, target)
        } catch {
          reject(new Error('Invalid redirect URL'))
          return
        }

        if (!isAllowedBilibiliRedirect(redirect)) {
          reject(new Error('Redirect host is not allowed'))
          return
        }
        followRedirects(redirect, redirectCount + 1).then(resolve, reject)
      })

      request.setTimeout(10_000, () => request.destroy(new Error('Bilibili link timed out')))
      request.on('error', reject)
    })
  }

  const install = (middlewares: Connect.Server) => {
    middlewares.use('/api/bilibili-resolve', (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET')
        res.end('Method not allowed')
        return
      }

      const value = new URL(req.url ?? '', 'http://localhost').searchParams.get('url')?.trim() ?? ''
      const shortUrl = value.length <= 2_048 ? getBilibiliShortUrl(value) : null
      if (!shortUrl) {
        res.statusCode = 400
        res.end('A valid HTTPS b23.tv URL is required')
        return
      }

      followRedirects(shortUrl)
        .then((resolvedUrl) => {
          if (res.headersSent) return
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'private, max-age=300')
          res.end(JSON.stringify({ url: resolvedUrl.toString() }))
        })
        .catch(() => {
          if (res.headersSent) return
          res.statusCode = 422
          res.end('Unable to resolve this Bilibili short link')
        })
    })
  }

  return {
    name: 'bilibili-link-resolver',
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
  const serveFile = (
    req: IncomingMessage,
    res: ServerResponse,
    filePath: string,
    contentType: string,
  ) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.setHeader('Allow', 'GET, HEAD')
      res.end('Method not allowed')
      return
    }

    const stat = fs.statSync(filePath)
    res.statusCode = 200
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    if (req.method === 'HEAD') {
      res.end()
      return
    }

    fs.createReadStream(filePath).pipe(res)
  }

  const install = (middlewares: Connect.Server) => {
    middlewares.use('/kuromoji-dict', (req, res) => {
      let reqPath = ''
      try {
        reqPath = decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/^\/+/, '')
      } catch {
        res.statusCode = 400
        res.end('Invalid dictionary path')
        return
      }

      const dictRoot = path.resolve(kuromojiDictDir)
      const filePath = path.resolve(dictRoot, reqPath)
      if (
        !reqPath
        || !filePath.startsWith(`${dictRoot}${path.sep}`)
        || !fs.existsSync(filePath)
        || !fs.statSync(filePath).isFile()
      ) {
        res.statusCode = 404
        res.end('Dictionary file not found')
        return
      }

      // Vite preview otherwise marks *.gz assets as Content-Encoding: gzip.
      // Browsers transparently decompress them, while kuromoji expects the raw gzip bytes.
      serveFile(req, res, filePath, 'application/octet-stream')
    })

    middlewares.use('/vendor/kuromoji.js', (req, res) => {
      serveFile(req, res, kuromojiBrowserFile, 'application/javascript; charset=utf-8')
    })

    middlewares.use('/vendor/zlib.min.js', (req, res) => {
      serveFile(req, res, zlibBrowserFile, 'application/javascript; charset=utf-8')
    })
  }

  return {
    name: 'kuromoji-dict',
    configureServer(server) {
      install(server.middlewares)
    },
    configurePreviewServer(server) {
      install(server.middlewares)
    },
    generateBundle() {
      for (const filename of fs.readdirSync(kuromojiDictDir)) {
        // Cloudflare's temporary deployment flow caps uploaded assets at 5 MiB.
        // The Worker serves this byte-identical file from the official npm CDN.
        if (filename === 'tid_pos.dat.gz') continue
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
  const neteaseHeaders = {
    Referer: 'https://music.163.com/',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'X-Real-IP': '111.72.0.1',
    ...(musicCookie ? { Cookie: musicCookie } : {}),
  }
  const appHost = process.env.HOST?.trim() || env.HOST?.trim() || '127.0.0.1'
  const appPort = Number(process.env.PORT || env.PORT || 4173)
  const allowedHosts = [
    'healthcheck.railway.app',
    '.up.railway.app',
    '.railway.internal',
  ]
  const apiProxy: Record<string, ProxyOptions> = {
    '/api/netease': {
      target: 'https://music.163.com',
      changeOrigin: true,
      rewrite: (requestPath) => requestPath.replace(/^\/api\/netease/, '/api'),
      headers: neteaseHeaders,
    },
    '/api/local': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (requestPath) => requestPath.replace(/^\/api\/local/, ''),
      headers: neteaseHeaders,
    },
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      healthCheck(),
      audioProxy(),
      ttsProxy(),
      bilibiliLinkResolver(),
      kuromojiDictPlugin(),
      neteaseQRLogin(),
    ],
    server: {
      host: appHost,
      port: Number.isFinite(appPort) ? appPort : 4173,
      allowedHosts,
      proxy: apiProxy,
    },
    preview: {
      host: appHost,
      port: Number.isFinite(appPort) ? appPort : 4173,
      allowedHosts,
      proxy: apiProxy,
    },
  }
})
