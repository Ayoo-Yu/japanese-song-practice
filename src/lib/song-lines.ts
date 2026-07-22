export function isCreditLineText(text: string): boolean {
  const normalized = text.trim()
  if (!normalized) return false
  return /^(作词|作詞|作曲|编曲|編曲|制作人|制作|Composer|Lyricist|Arranger)\s*[:：]/i.test(normalized)
}
