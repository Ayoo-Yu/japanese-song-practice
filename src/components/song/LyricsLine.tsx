import type { FuriganaToken, PracticeStage } from '../../types'
import { filterByStage } from '../../lib/furigana'

interface LyricsLineProps {
  tokens: FuriganaToken[]
  romaji?: string
  translation?: string
  isActive: boolean
  stage: PracticeStage
}

export function LyricsLine({ tokens, romaji, translation, isActive, stage }: LyricsLineProps) {
  const filtered = filterByStage(tokens, stage)
  const showRomaji = stage === 1
  const showTranslation = stage < 5

  return (
    <div
      className={`lyrics-line px-4 py-1.5 transition-colors duration-300 ${
        isActive ? 'active' : ''
      }`}
    >
      <div className="text-line">
        {filtered.map((token, i) => {
          if (token.isKanji && token.reading) {
            return (
              <ruby key={i}>
                {token.surface}
                <rp>(</rp>
                <rt>{token.reading}</rt>
                <rp>)</rp>
              </ruby>
            )
          }
          return <span key={i}>{token.surface}</span>
        })}
      </div>
      {showRomaji && romaji && <div className="romaji">{romaji}</div>}
      {showTranslation && translation && (
        <div className="translation">{translation}</div>
      )}
    </div>
  )
}
