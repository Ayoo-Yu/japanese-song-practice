type KuroshiroInstance = {
  convert: (str: string, options?: { to?: string; mode?: string }) => Promise<string>
}

let instance: KuroshiroInstance | null = null
let initPromise: Promise<KuroshiroInstance> | null = null

function patchXhrForDatFiles() {
  const OrigXHR = window.XMLHttpRequest
  window.XMLHttpRequest = class PatchedXHR extends OrigXHR {
    open(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
      if (typeof url === 'string' && url.endsWith('.dat.gz')) {
        url = url.replace(/\.dat\.gz$/, '.dat')
      }
      // @ts-expect-error XHR open overload signatures
      super.open(method, url, async ?? true, username, password)
    }
  } as unknown as typeof XMLHttpRequest
}

async function loadKuroshiro(): Promise<KuroshiroInstance> {
  patchXhrForDatFiles()

  const Kuroshiro = (await import('kuroshiro')).default
  const KuromojiAnalyzer = (await import('kuroshiro-analyzer-kuromoji')).default
  const kuroshiro = new Kuroshiro()
  await kuroshiro.init(new KuromojiAnalyzer({ dictPath: '/kuromoji-dict/' }))
  return kuroshiro
}

async function getInstance(): Promise<KuroshiroInstance> {
  if (instance) return instance
  if (initPromise) return initPromise

  initPromise = loadKuroshiro()
  instance = await initPromise
  return instance
}

export async function initKuroshiro(): Promise<void> {
  await getInstance()
}

export async function toFurigana(text: string): Promise<string> {
  const k = await getInstance()
  return k.convert(text, { to: 'hiragana', mode: 'furigana' })
}

export async function toHiragana(text: string): Promise<string> {
  const k = await getInstance()
  return k.convert(text, { to: 'hiragana', mode: 'normal' })
}

export async function toRomaji(text: string): Promise<string> {
  const k = await getInstance()
  return k.convert(text, { to: 'romaji', mode: 'spaced' })
}

export function isKuroshiroReady(): boolean {
  return instance !== null
}
