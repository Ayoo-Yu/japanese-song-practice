const ALLOWED_AUDIO_HOST_SUFFIXES = ['music.126.net', 'music.163.com']

// NetEase signs the media path rather than a single CDN hostname. Some edge
// groups occasionally reject an otherwise valid URL, so keep a short list of
// equivalent hosts that the player can try without asking for a new token.
const NETEASE_AUDIO_CDN_HOSTS = [
  'm801.music.126.net',
  'm802.music.126.net',
  'm803.music.126.net',
  'm701.music.126.net',
  'm702.music.126.net',
  'm703.music.126.net',
  'm804.music.126.net',
  'm704.music.126.net',
]

export function getAllowedAudioUrl(value: string, base?: URL): URL | null {
  let url: URL
  try {
    url = base ? new URL(value, base) : new URL(value)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password) return null
  if (url.port && url.port !== '80' && url.port !== '443') return null

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  const allowed = ALLOWED_AUDIO_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  )
  return allowed ? url : null
}

export function getAudioUrlCandidates(value: string): string[] {
  const directUrl = getAllowedAudioUrl(value)
  if (!directUrl) return []

  directUrl.protocol = 'https:'
  if (directUrl.port === '80') directUrl.port = ''

  const hostname = directUrl.hostname.toLowerCase().replace(/\.$/, '')
  if (hostname !== 'music.126.net' && !hostname.endsWith('.music.126.net')) {
    return [directUrl.href]
  }

  const hosts = [...NETEASE_AUDIO_CDN_HOSTS, hostname]
  return [...new Set(hosts)].map((host) => {
    const candidate = new URL(directUrl)
    candidate.hostname = host
    return candidate.href
  })
}
