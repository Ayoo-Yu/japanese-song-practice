import { describe, expect, it } from 'vitest'
import {
  buildBilibiliEmbedUrl,
  buildBilibiliPageUrl,
  getBilibiliShortUrl,
  isAllowedBilibiliRedirect,
  parseBilibiliVideoInput,
} from './bilibili'

describe('Bilibili MV links', () => {
  it('accepts a raw BV id', () => {
    expect(parseBilibiliVideoInput('BV1B7411m7LV')).toEqual({
      provider: 'bilibili',
      bvid: 'BV1B7411m7LV',
      page: 1,
      sourceUrl: 'https://www.bilibili.com/video/BV1B7411m7LV',
    })
  })

  it('keeps the selected page and start time from a full link', () => {
    expect(parseBilibiliVideoInput(
      'https://www.bilibili.com/video/BV1B7411m7LV/?p=3&t=12.8',
    )).toEqual({
      provider: 'bilibili',
      bvid: 'BV1B7411m7LV',
      page: 3,
      sourceUrl: 'https://www.bilibili.com/video/BV1B7411m7LV?p=3&t=12',
      startAtSeconds: 12,
    })
  })

  it('extracts a video from copied share text', () => {
    const parsed = parseBilibiliVideoInput(
      '分享视频：https://www.bilibili.com/video/BV1B7411m7LV/，一起唱歌',
    )
    expect(parsed?.bvid).toBe('BV1B7411m7LV')
  })

  it('rejects input without a complete BV id', () => {
    expect(parseBilibiliVideoInput('https://example.com/video/BV123')).toBeNull()
  })

  it('builds an official player URL without using the pasted URL as iframe source', () => {
    const mv = parseBilibiliVideoInput('BV1B7411m7LV')!
    const url = new URL(buildBilibiliEmbedUrl(mv))
    expect(url.origin).toBe('https://player.bilibili.com')
    expect(url.searchParams.get('bvid')).toBe('BV1B7411m7LV')
    expect(url.searchParams.get('autoplay')).toBe('0')
    expect(url.searchParams.get('danmaku')).toBe('0')
    expect(new URL(buildBilibiliPageUrl({ ...mv, sourceUrl: 'javascript:alert(1)' })).origin)
      .toBe('https://www.bilibili.com')
  })

  it('only recognizes HTTPS b23.tv short links', () => {
    expect(getBilibiliShortUrl('https://b23.tv/AbCd123')?.hostname).toBe('b23.tv')
    expect(getBilibiliShortUrl('http://b23.tv/AbCd123')).toBeNull()
    expect(getBilibiliShortUrl('https://example.com/AbCd123')).toBeNull()
  })

  it('only allows redirects within Bilibili HTTPS hosts', () => {
    expect(isAllowedBilibiliRedirect(new URL('https://www.bilibili.com/video/BV1B7411m7LV'))).toBe(true)
    expect(isAllowedBilibiliRedirect(new URL('https://evil.example/video/BV1B7411m7LV'))).toBe(false)
    expect(isAllowedBilibiliRedirect(new URL('http://www.bilibili.com/video/BV1B7411m7LV'))).toBe(false)
  })
})
