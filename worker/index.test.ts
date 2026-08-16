import { describe, expect, it } from 'vitest'
import worker, { type WorkerEnv, weapiEncrypt } from './index'

function env(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ASSETS: {
      fetch: async () => new Response('asset response', { status: 200 }),
    },
    ...overrides,
  }
}

describe('Cloudflare worker', () => {
  it('returns an application health response', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/health'), env())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('passes non-API requests to the static asset binding', async () => {
    const response = await worker.fetch(new Request('https://example.com/song/123'), env())

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe('asset response')
  })

  it('reports whether a server-managed NetEase cookie exists', async () => {
    const missing = await worker.fetch(
      new Request('https://example.com/api/qr-login/status'),
      env(),
    )
    const configured = await worker.fetch(
      new Request('https://example.com/api/qr-login/status'),
      env({ NETEASE_MUSIC_U: 'valid-cookie-value' }),
    )

    await expect(missing.json()).resolves.toEqual({ configured: false, writable: false })
    await expect(configured.json()).resolves.toEqual({ configured: true, writable: false })
  })

  it('does not accept credential writes in a public deployment', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/qr-login/save', { method: 'POST' }),
      env(),
    )

    expect(response.status).toBe(403)
  })

  it('rejects an untrusted audio proxy target without fetching it', async () => {
    const response = await worker.fetch(
      new Request('https://example.com/api/audio-proxy?url=https%3A%2F%2Fexample.com%2Fa.mp3'),
      env(),
    )

    expect(response.status).toBe(403)
  })

  it('returns JSON for unknown API routes', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/missing'), env())

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'API route not found' })
  })

  it('creates NetEase weapi parameters using Worker-compatible crypto', async () => {
    const encrypted = await weapiEncrypt({ ids: '[123]', level: 'standard' })

    expect(encrypted.params).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(encrypted.encSecKey).toMatch(/^[0-9a-f]{256}$/)
  })
})
