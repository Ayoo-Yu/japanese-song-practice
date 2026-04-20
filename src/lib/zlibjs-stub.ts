// Stub for zlibjs — kuromoji's BrowserDictionaryLoader requires this.
// Since we pre-decompressed the dictionary files (.dat instead of .dat.gz),
// the Gunzip class just needs to pass data through.

export const Zlib = {
  Zlib: {
    Gunzip: class {
      private data: Uint8Array
      constructor(data: Uint8Array) {
        this.data = data
      }
      decompress(): Uint8Array {
        return this.data
      }
    }
  }
}
