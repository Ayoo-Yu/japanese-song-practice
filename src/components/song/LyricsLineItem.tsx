import { memo, type Dispatch, type SetStateAction } from 'react'
import { confirmFuriganaToken, ignoreMediumConfidenceLine } from '../../services/song-service'
import { toggleSavedLine, toggleSavedWord } from '../../services/collections-service'
import { FuriganaText } from './FuriganaText'
import { KTVLine } from './KTVLine'
import { RomajiEditPanel } from './RomajiEditPanel'
import type { FuriganaHint, LyricsStageLine, RomajiEditState } from './lyrics-types'
import type { Song, FuriganaToken } from '../../types'

interface LyricsLineItemProps {
  song: Song
  line: LyricsStageLine
  index: number
  fLine: { lineIndex: number; words: FuriganaToken[] } | undefined
  lineProgress: number
  isActive: boolean
  isPlayed: boolean
  isCreditLine: boolean
  lineSaved: boolean
  mediumIgnored: boolean
  ignoreAllMediumHints: boolean
  lineHint: FuriganaHint | null
  isEditingRomaji: boolean
  romajiEdit: RomajiEditState | null
  savedWordIds: Set<string>
  showFurigana: boolean
  showRomaji: boolean
  showTranslation: boolean
  speakingLineIndex: number | null
  isPreview: boolean
  isEditing: boolean
  onJumpToLine: (lineIndex: number) => void
  speak: (text: string) => void
  stopSpeech: () => void
  setSong: Dispatch<SetStateAction<Song | null>>
  setEditSong: Dispatch<SetStateAction<Song | null>>
  setSavedLineIds: Dispatch<SetStateAction<Set<string>>>
  setSavedWordIds: Dispatch<SetStateAction<Set<string>>>
  setFuriganaHint: Dispatch<SetStateAction<FuriganaHint | null>>
  setRomajiEdit: Dispatch<SetStateAction<RomajiEditState | null>>
  setSpeakingLineIndex: Dispatch<SetStateAction<number | null>>
}

export const LyricsLineItem = memo(function LyricsLineItem({
  song,
  line,
  index: i,
  fLine,
  lineProgress,
  isActive,
  isPlayed,
  isCreditLine,
  lineSaved,
  mediumIgnored,
  ignoreAllMediumHints,
  lineHint,
  isEditingRomaji,
  romajiEdit,
  savedWordIds,
  showFurigana,
  showRomaji,
  showTranslation,
  speakingLineIndex,
  isPreview,
  isEditing,
  onJumpToLine,
  speak,
  stopSpeech,
  setSong,
  setEditSong,
  setSavedLineIds,
  setSavedWordIds,
  setFuriganaHint,
  setRomajiEdit,
  setSpeakingLineIndex,
}: LyricsLineItemProps) {
  const hasFurigana = fLine && fLine.words.some((w) => w.isKanji)
  const lineId = `${song.neteaseId}:${i}`
  const lineHasLowConfidence = !!fLine?.words.some((word) => word.confidence === 'low')
  const lineHasMediumConfidence = !!fLine?.words.some((word) => word.confidence === 'medium')

  if (isCreditLine) {
    return (
      <div
        className={`lyrics-line relative cursor-pointer px-4 py-1 text-center ${
          isActive ? 'active' : isPlayed ? 'played' : ''
        }`}
        onClick={() => onJumpToLine(i)}
      >
        <div className="lyrics-line-base" />
        <div className={`lyrics-line-bg ${isActive ? 'active' : ''}`} />
        <div className="relative z-10">
          <p className="text-[11px] font-semibold text-[var(--lyrics-muted-color)]">歌曲信息</p>
          <p className="mt-0.5 text-sm leading-6 text-[var(--lyrics-secondary-color)]">{line.original}</p>
          {showRomaji && line.romaji && (
            <p className="mt-0.5 text-xs leading-5 text-[var(--lyrics-muted-color)]">{line.romaji}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`lyrics-line relative px-4 py-1.5 ${
        isActive ? 'active' : isPlayed ? 'played' : ''
      } cursor-pointer`}
      onClick={() => onJumpToLine(i)}
    >
      <div className="lyrics-line-base" />
      <div className={`lyrics-line-bg ${isActive ? 'active' : ''}`} />
      <div className="absolute right-2 top-2 z-20 flex gap-1">
        <button
          onClick={async (e) => {
            e.stopPropagation()
            const saved = await toggleSavedLine({
              id: lineId,
              neteaseId: song.neteaseId,
              songTitle: song.title,
              artist: song.artist,
              lineIndex: i,
              lineText: line.original,
              romaji: line.romaji || undefined,
              translation: line.translation || undefined,
            })
            setSavedLineIds((prev) => {
              const next = new Set(prev)
              if (saved) next.add(lineId)
              else next.delete(lineId)
              return next
            })
          }}
          className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
            lineSaved
              ? 'bg-accent/20 text-accent ring-1 ring-accent/25'
              : 'bg-surface/82 text-text-secondary ring-1 ring-black/8 hover:bg-surface'
          }`}
        >
          {lineSaved ? '已收藏' : '收藏'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (speakingLineIndex === i) {
              stopSpeech()
              setSpeakingLineIndex(null)
            } else {
              stopSpeech()
              speak(line.original)
              setSpeakingLineIndex(i)
              setTimeout(() => setSpeakingLineIndex(null), 3000)
            }
          }}
          className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
            speakingLineIndex === i
              ? 'bg-accent/30 text-accent ring-1 ring-accent/25'
              : 'bg-surface/82 text-text-secondary ring-1 ring-black/8 hover:bg-surface'
          }`}
        >
          {speakingLineIndex === i ? '朗读中' : '朗读'}
        </button>
      </div>
      <div className="relative z-10">
        <KTVLine progress={lineProgress}>
          {hasFurigana ? (
            <FuriganaText
              tokens={fLine.words}
              showFurigana={showFurigana}
              savedWordIds={savedWordIds}
              onWordToggle={async (token) => {
                const wordId = `${song.neteaseId}:${i}:${token.surface}:${token.reading}`
                const saved = await toggleSavedWord({
                  id: wordId,
                  neteaseId: song.neteaseId,
                  songTitle: song.title,
                  artist: song.artist,
                  lineIndex: i,
                  lineText: line.original,
                  surface: token.surface,
                  reading: token.reading,
                })
                setSavedWordIds((prev) => {
                  const next = new Set(prev)
                  if (saved) next.add(wordId)
                  else next.delete(wordId)
                  return next
                })
                setFuriganaHint({
                  lineIndex: i,
                  tokenIndex: fLine.words.findIndex((word) =>
                    word.surface === token.surface && word.reading === token.reading && word.isKanji === token.isKanji,
                  ),
                  surface: token.surface,
                  reading: token.reading,
                  confidence: token.confidence ?? 'high',
                  source: token.source,
                  saved,
                })
                return saved
              }}
              wordIdForToken={(token) => `${song.neteaseId}:${i}:${token.surface}:${token.reading}`}
            />
          ) : (
            <div className="text-line">{line.original}</div>
          )}
        </KTVLine>
        {(lineHasLowConfidence || (lineHasMediumConfidence && !mediumIgnored && !ignoreAllMediumHints)) && (
          <div className="mt-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              lineHasLowConfidence
                ? 'bg-warning/12 text-warning'
                : 'bg-white/10 text-[var(--lyrics-muted-color)]'
            }`}>
              {lineHasLowConfidence ? '注音待确认' : '注音提示'}
            </span>
          </div>
        )}
        {lineHint && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`mt-2 rounded-xl border px-4 py-3 text-left text-sm shadow-lg ${
              lineHint.confidence === 'low'
                ? 'border-warning/45 bg-slate-900/88 text-slate-100'
                : 'border-cyan-400/35 bg-slate-900/88 text-slate-100'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <p className="font-semibold text-slate-50">
                    {lineHint.surface}
                  </p>
                  <span className="text-sm text-slate-300">{lineHint.reading}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {getConfidenceDescription(lineHint)}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {lineHint.saved ? '已加入生词本，后面可以在曲库页继续整理。' : '还没有加入生词本，再点一次这个词可以取消收藏。'}
                </p>
                <div className="mt-3">
                  {isEditingRomaji && romajiEdit ? (
                    <RomajiEditPanel
                      line={line}
                      lineIndex={i}
                      lineHint={lineHint}
                      romajiEdit={romajiEdit}
                      song={song}
                      isPreview={isPreview}
                      isEditing={isEditing}
                      setSong={setSong}
                      setEditSong={setEditSong}
                      setFuriganaHint={setFuriganaHint}
                      setRomajiEdit={setRomajiEdit}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRomajiEdit({
                            lineIndex: i,
                            value: line.romaji || '',
                            isSaving: false,
                            isSuggesting: false,
                          })
                        }}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-100"
                      >
                        修正这句罗马音
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (lineHint.tokenIndex === undefined) return
                          const updated = await confirmFuriganaToken(song.neteaseId, i, lineHint.tokenIndex)
                          if (updated) {
                            setSong(updated)
                            if (isEditing) setEditSong(updated)
                            setFuriganaHint(null)
                          }
                        }}
                        className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs font-medium text-slate-100"
                      >
                        确认这个标注
                      </button>
                      {lineHint.confidence === 'medium' && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const updated = await ignoreMediumConfidenceLine(song.neteaseId, i)
                            if (updated) {
                              setSong(updated)
                              if (isEditing) setEditSong(updated)
                              setFuriganaHint(null)
                            }
                          }}
                          className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200"
                        >
                          忽略这句中等提示
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFuriganaHint(null)
                  setRomajiEdit(null)
                }}
                className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-300 hover:bg-white/10"
              >
                关闭
              </button>
            </div>
          </div>
        )}
        {showRomaji && line.romaji && (
          <div className="romaji">
            <KTVLine progress={lineProgress}>
              {line.romaji}
            </KTVLine>
          </div>
        )}
        {showTranslation && line.translation && (
          <div className="translation">{line.translation}</div>
        )}
      </div>
    </div>
  )
})

function getConfidenceDescription(hint: FuriganaHint): string {
  if (hint.source === 'romaji_fallback') {
    return '这条注音是根据罗马音兜底推出来的，原始罗马音不完整或分词不稳时，准确率会下降。'
  }
  if (hint.source === 'romaji_strict') {
    return '这条注音是按罗马音严格对齐得到的。只要原始罗马音有省略或写法变化，就可能出现偏差。'
  }
  if (hint.source === 'tokenizer') {
    return hint.confidence === 'low'
      ? '分词器给出了不够稳定的读音，这里先保守展示，建议结合听感再核对。'
      : '这条注音来自分词器，但命中的是中等置信度结果，通常可用，个别歌词写法仍可能偏。'
  }
  return hint.confidence === 'low'
    ? '这条注音当前置信度偏低，建议结合音频或歌词上下文再看一眼。'
    : '这条注音当前是中等置信度，通常够用，但不是最稳的一档。'
}
