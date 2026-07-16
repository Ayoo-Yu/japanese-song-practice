import { describe, expect, it } from 'vitest'
import { getAllowedAudioUrl } from './proxy-security'

describe('audio proxy allowlist', () => {
  it('accepts NetEase audio CDN hosts', () => {
    expect(getAllowedAudioUrl('https://m801.music.126.net/file.mp3')?.hostname).toBe('m801.music.126.net')
  })

  it.each([
    'http://127.0.0.1:4173/',
    'http://localhost/',
    'file:///etc/passwd',
    'https://music.126.net.evil.example/file.mp3',
    'https://user:pass@m801.music.126.net/file.mp3',
    'https://m801.music.126.net:8443/file.mp3',
  ])('rejects unsafe target %s', (target) => {
    expect(getAllowedAudioUrl(target)).toBeNull()
  })

  it('validates redirects against the same allowlist', () => {
    const base = new URL('https://m801.music.126.net/path/file.mp3')
    expect(getAllowedAudioUrl('/next.mp3', base)?.href).toBe('https://m801.music.126.net/next.mp3')
    expect(getAllowedAudioUrl('http://127.0.0.1/private', base)).toBeNull()
  })
})
