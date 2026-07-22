import { describe, expect, it } from 'vitest'
import { getAllowedAudioUrl, getAudioUrlCandidates } from './proxy-security'

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

  it('prefers working HTTPS CDN aliases and retains fallbacks', () => {
    const candidates = getAudioUrlCandidates('http://m804.music.126.net:80/file.m4a?token=abc')

    expect(candidates[0]).toBe('https://m801.music.126.net/file.m4a?token=abc')
    expect(candidates).toContain('https://m804.music.126.net/file.m4a?token=abc')
    expect(new Set(candidates).size).toBe(candidates.length)
  })

  it('does not rewrite other trusted NetEase hosts', () => {
    expect(getAudioUrlCandidates('http://music.163.com/file.mp3')).toEqual([
      'https://music.163.com/file.mp3',
    ])
  })

  it('does not produce candidates for an unsafe URL', () => {
    expect(getAudioUrlCandidates('https://music.126.net.evil.example/file.mp3')).toEqual([])
  })
})
