export function generateDistractors(
  correct: string,
  pool: string[],
  count: number = 3,
): string[] {
  const filtered = pool.filter((s) => s !== correct)
  const unique = [...new Set(filtered)]

  if (unique.length >= count) {
    return shuffle(unique).slice(0, count)
  }

  const results = [...unique]
  while (results.length < count) {
    results.push(shuffleSyllables(correct))
  }
  return results.slice(0, count)
}

function shuffle(arr: string[]): string[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleSyllables(text: string): string {
  if (text.length <= 1) return text + 'あ'
  const chars = [...text]
  const i = Math.floor(Math.random() * chars.length)
  const hiragana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
  chars[i] = hiragana[Math.floor(Math.random() * hiragana.length)]
  return chars.join('')
}
