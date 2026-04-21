import { defineConfig, type Plugin, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import http from 'http'
import https from 'https'
import { neteaseQRLogin } from './src/lib/netease-qr-login'

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const musicCookie = env.NETEASE_MUSIC_U ? `MUSIC_U=${env.NETEASE_MUSIC_U}` : ''

  return {
    plugins: [react(), tailwindcss(), audioProxy(), neteaseQRLogin()],
    server: {
      host: '127.0.0.1',
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
