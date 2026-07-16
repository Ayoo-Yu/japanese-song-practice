const ALLOWED_AUDIO_HOST_SUFFIXES = ['music.126.net', 'music.163.com']

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
