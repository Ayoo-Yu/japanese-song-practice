export interface JapaneseToken {
  surface_form: string
  pos?: string
  pos_detail_1?: string
  pos_detail_2?: string
  pos_detail_3?: string
  conjugated_type?: string
  conjugated_form?: string
  basic_form?: string
  reading?: string
  pronunciation?: string
  word_type?: string
}

export interface JapaneseTokenizer {
  tokenize(text: string): JapaneseToken[]
}

interface KuromojiGlobal {
  builder(options: { dicPath: string }): {
    build(callback: (err: Error | null, tokenizer: JapaneseTokenizer) => void): void
  }
}

let tokenizerPromise: Promise<JapaneseTokenizer> | null = null
let scriptLoadPromise: Promise<void> | null = null

export function getJapaneseTokenizer(): Promise<JapaneseTokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = ensureKuromojiLoaded().then(
      () =>
        new Promise((resolve, reject) => {
          const kuromoji = (globalThis as typeof globalThis & { kuromoji?: KuromojiGlobal }).kuromoji
          if (!kuromoji) {
            reject(new Error('kuromoji browser bundle did not load'))
            tokenizerPromise = null
            return
          }

          kuromoji.builder({ dicPath: '/kuromoji-dict' }).build((err, tokenizer) => {
            if (err || !tokenizer) {
              reject(err ?? new Error('Failed to initialize Japanese tokenizer'))
              tokenizerPromise = null
              return
            }
            resolve(tokenizer)
          })
        })
    )
  }

  return tokenizerPromise
}

function ensureKuromojiLoaded(): Promise<void> {
  if (!scriptLoadPromise) {
    scriptLoadPromise = loadScript('/vendor/zlib.min.js')
      .then(() => loadScript('/vendor/kuromoji.js'))
  }
  return scriptLoadPromise
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.src = src
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    }, { once: true })
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
    document.head.appendChild(script)
  })
}
