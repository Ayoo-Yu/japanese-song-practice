import type { FuriganaToken } from '../../types'

interface FuriganaTextProps {
  tokens: FuriganaToken[]
  showFurigana: boolean
  savedWordIds: Set<string>
  onWordToggle: (token: FuriganaToken) => boolean | Promise<boolean>
  wordIdForToken: (token: FuriganaToken) => string
}

export function FuriganaText({
  tokens,
  showFurigana,
  savedWordIds,
  onWordToggle,
  wordIdForToken,
}: FuriganaTextProps) {
  return (
    <div className="text-line">
      {tokens.map((token, i) => {
        if (token.isKanji && token.reading) {
          const saved = savedWordIds.has(wordIdForToken(token))
          const confidenceClass = token.confidence === 'low'
            ? 'furigana-low'
            : token.confidence === 'medium'
              ? 'furigana-medium'
              : ''
          if (showFurigana) {
            return (
              <button
                key={i}
                type="button"
                title={token.confidence === 'low' ? '注音可信度较低' : token.confidence === 'medium' ? '注音可信度中等' : '收藏这个单词'}
                onClick={(e) => {
                  e.stopPropagation()
                  void onWordToggle(token)
                }}
                className={`inline-flex items-end rounded-sm px-0.5 align-baseline ${confidenceClass} ${saved ? 'furigana-saved' : ''}`}
              >
                <ruby>{token.surface}<rp>(</rp><rt>{token.reading}</rt><rp>)</rp></ruby>
              </button>
            )
          }
          return (
            <button
              key={i}
              type="button"
              title={token.confidence === 'low' ? '注音可信度较低' : token.confidence === 'medium' ? '注音可信度中等' : '收藏这个单词'}
              onClick={(e) => {
                e.stopPropagation()
                void onWordToggle(token)
              }}
              className={`inline-flex items-end rounded-sm px-0.5 ${confidenceClass} ${saved ? 'furigana-saved' : ''}`}
            >
              <span>{token.surface}</span>
            </button>
          )
        }
        return <span key={i}>{token.surface}</span>
      })}
    </div>
  )
}
