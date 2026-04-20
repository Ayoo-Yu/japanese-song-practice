declare module 'kuroshiro' {
  class Kuroshiro {
    init(analyzer: unknown): Promise<void>
    convert(str: string, options?: { to?: string; mode?: string }): Promise<string>
  }
  export default Kuroshiro
}

declare module 'kuroshiro-analyzer-kuromoji' {
  class KuromojiAnalyzer {
    constructor(options: { dictPath: string })
    init(): Promise<void>
  }
  export default KuromojiAnalyzer
}
