export interface ExtractedColors {
  dominant: string
  palette: string[]
  dark: string
  light: string
}

export function extractColorsFromImage(
  img: HTMLImageElement,
  sampleSize = 50,
): ExtractedColors {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return fallback()

  const w = Math.min(img.naturalWidth || img.width, sampleSize)
  const h = Math.min(img.naturalHeight || img.height, sampleSize)
  if (w <= 0 || h <= 0) return fallback()

  canvas.width = w
  canvas.height = h
  ctx.drawImage(img, 0, 0, w, h)

  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, w, h).data
  } catch {
    return fallback()
  }

  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 128) continue

    const qr = Math.round(r / 32) * 32
    const qg = Math.round(g / 32) * 32
    const qb = Math.round(b / 32) * 32
    const key = `${qr},${qg},${qb}`

    const existing = buckets.get(key)
    if (existing) {
      existing.r += r
      existing.g += g
      existing.b += b
      existing.count += 1
    } else {
      buckets.set(key, { r, g, b, count: 1 })
    }
  }

  const sorted = [...buckets.values()]
    .map((b) => ({
      r: Math.round(b.r / b.count),
      g: Math.round(b.g / b.count),
      b: Math.round(b.b / b.count),
      count: b.count,
      lum: relativeLuminance({ r: b.r / b.count, g: b.g / b.count, b: b.b / b.count }),
    }))
    .sort((a, b) => b.count - a.count)

  if (sorted.length === 0) return fallback()

  const dominant = pickVibrant(sorted) ?? sorted[0]
  const palette = buildPalette(sorted, dominant)
  // Always force dark enough for light text: mix album color with near-black
  const dark = mixWithBlack(dominant, 0.82)
  const light = lighten(dominant, 0.3)

  return {
    dominant: rgbToHex(dominant),
    palette: palette.map(rgbToHex),
    dark: rgbToHex(dark),
    light: rgbToHex(light),
  }
}

function pickVibrant(
  colors: { r: number; g: number; b: number; count: number; lum: number }[],
): { r: number; g: number; b: number } | null {
  for (const c of colors) {
    if (c.lum > 0.08 && c.lum < 0.85) {
      const max = Math.max(c.r, c.g, c.b)
      const min = Math.min(c.r, c.g, c.b)
      const sat = max === 0 ? 0 : (max - min) / max
      if (sat > 0.15) return c
    }
  }
  return null
}

function buildPalette(
  sorted: { r: number; g: number; b: number; lum: number }[],
  dominant: { r: number; g: number; b: number },
): { r: number; g: number; b: number }[] {
  const result: { r: number; g: number; b: number }[] = [dominant]
  const domHue = rgbToHsl(dominant).h

  for (const c of sorted) {
    if (result.length >= 4) break
    const hue = rgbToHsl(c).h
    const hueDiff = Math.abs(hue - domHue)
    const minHueDiff = Math.min(hueDiff, 360 - hueDiff)
    if (minHueDiff > 30 && c.lum > 0.05 && c.lum < 0.9) {
      result.push(c)
    }
  }

  while (result.length < 4) {
    result.push(dominant)
  }

  return result
}

function fallback(): ExtractedColors {
  return {
    dominant: '#6c5ce7',
    palette: ['#6c5ce7', '#a29bfe', '#2d1b69', '#1a1a2e'],
    dark: '#1a1a2e',
    light: '#a29bfe',
  }
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channels = [r, g, b].map((v) => {
    const n = v / 255
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b]
    .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
    .join('')}`
}

// Mix album color toward near-black — guarantees background is always dark
function mixWithBlack(c: { r: number; g: number; b: number }, blackRatio: number): { r: number; g: number; b: number } {
  return {
    r: c.r * (1 - blackRatio) + 12 * blackRatio,
    g: c.g * (1 - blackRatio) + 12 * blackRatio,
    b: c.b * (1 - blackRatio) + 18 * blackRatio,
  }
}

function lighten(c: { r: number; g: number; b: number }, amount: number): { r: number; g: number; b: number } {
  return {
    r: c.r + (255 - c.r) * amount,
    g: c.g + (255 - c.g) * amount,
    b: c.b + (255 - c.b) * amount,
  }
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h: h * 360, s, l }
}

const colorCache = new Map<string, ExtractedColors>()

export function extractColorsCached(imageUrl: string): Promise<ExtractedColors> {
  const cached = colorCache.get(imageUrl)
  if (cached) return Promise.resolve(cached)

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const colors = extractColorsFromImage(img)
      colorCache.set(imageUrl, colors)
      resolve(colors)
    }
    img.onerror = () => resolve(fallback())
    img.src = imageUrl
  })
}
