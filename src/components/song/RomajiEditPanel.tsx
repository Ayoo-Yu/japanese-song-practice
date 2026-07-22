import type { Dispatch, SetStateAction } from 'react'
import { confirmFuriganaToken, ensureSongPersisted, updateLyrics } from '../../services/song-service'
import { computeDictionaryRomaji } from '../../lib/furigana-service'
import type { Song } from '../../types'
import type { FuriganaHint, LyricsStageLine, RomajiEditState } from './lyrics-types'

interface RomajiEditPanelProps {
  line: LyricsStageLine
  lineIndex: number
  lineHint: FuriganaHint
  romajiEdit: RomajiEditState
  song: Song
  isPreview: boolean
  isEditing: boolean
  setSong: Dispatch<SetStateAction<Song | null>>
  setEditSong: Dispatch<SetStateAction<Song | null>>
  setFuriganaHint: Dispatch<SetStateAction<FuriganaHint | null>>
  setRomajiEdit: Dispatch<SetStateAction<RomajiEditState | null>>
}

export function RomajiEditPanel({
  line,
  lineIndex: i,
  lineHint,
  romajiEdit,
  song,
  isPreview,
  isEditing,
  setSong,
  setEditSong,
  setFuriganaHint,
  setRomajiEdit,
}: RomajiEditPanelProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-950/35 p-3 ring-1 ring-white/8">
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
          Romaji
        </label>
        <input
          type="text"
          value={romajiEdit.value}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            setRomajiEdit((prev) => prev && prev.lineIndex === i
              ? { ...prev, value: e.target.value, feedback: undefined }
              : prev)
          }
          className="w-full rounded-lg border border-slate-500 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400"
          placeholder="修正这句罗马音"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={romajiEdit.isSuggesting}
          onClick={async (e) => {
            e.stopPropagation()
            setRomajiEdit((prev) => prev && prev.lineIndex === i
              ? { ...prev, isSuggesting: true, feedback: undefined }
              : prev)
            try {
              const suggestion = await computeDictionaryRomaji(line.original)
              setRomajiEdit((prev) => prev && prev.lineIndex === i
                ? suggestion
                  ? {
                    ...prev,
                    suggestion,
                    isSuggesting: false,
                  }
                  : {
                    ...prev,
                    isSuggesting: false,
                    feedback: { tone: 'error', text: '这句暂时没有可用的词典参考。' },
                  }
                : prev)
            } catch {
              setRomajiEdit((prev) => prev && prev.lineIndex === i
                ? {
                  ...prev,
                  isSuggesting: false,
                  feedback: { tone: 'error', text: '词典参考获取失败，请稍后再试。' },
                }
                : prev)
            }
          }}
          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-900 hover:bg-slate-100"
        >
          {romajiEdit.isSuggesting ? '参考生成中...' : '词典参考'}
        </button>
        {romajiEdit.suggestion && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setRomajiEdit((prev) => prev && prev.lineIndex === i
                ? {
                  ...prev,
                  value: prev.suggestion ?? prev.value,
                  feedback: {
                    tone: 'success',
                    text: '已带入词典参考，你可以再微调后保存。',
                  },
                }
                : prev)
            }}
            className="rounded-full bg-cyan-400/18 px-3 py-1.5 text-[11px] font-medium text-cyan-200"
          >
            带入推荐
          </button>
        )}
      </div>
      {romajiEdit.suggestion && (
        <div className="rounded-xl bg-slate-800/80 px-3 py-2 text-[12px] text-slate-200 ring-1 ring-slate-700">
          <span className="text-slate-400">词典参考</span>
          <span className="ml-2">{romajiEdit.suggestion}</span>
        </div>
      )}
      {romajiEdit.feedback && (
        <div
          className={`rounded-xl px-3 py-2 text-[12px] ${
            romajiEdit.feedback.tone === 'success'
              ? 'bg-emerald-500/18 text-emerald-200'
              : 'bg-red-500/18 text-red-200'
          }`}
        >
          {romajiEdit.feedback.text}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
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
          className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium text-slate-100"
        >
          确认这个标注
        </button>
        <button
          type="button"
          disabled={romajiEdit.isSaving}
          onClick={async (e) => {
            e.stopPropagation()
            const value = romajiEdit.value.trim()
            if (!value) {
              setRomajiEdit((prev) => prev && prev.lineIndex === i
                ? {
                  ...prev,
                  feedback: { tone: 'error', text: '请先输入这句的罗马音。' },
                }
                : prev)
              return
            }
            setRomajiEdit((prev) => prev && prev.lineIndex === i
              ? { ...prev, isSaving: true, feedback: undefined }
              : prev)
            try {
              if (isPreview) {
                const persisted = await ensureSongPersisted(song)
                setSong(persisted)
                if (isEditing) setEditSong(persisted)
              }
              const updated = await updateLyrics(song.neteaseId, [
                { timeMs: line.timeMs, romaji: value },
              ])
              if (updated) {
                setSong(updated)
                if (isEditing) setEditSong(updated)
                setRomajiEdit((prev) => prev && prev.lineIndex === i
                  ? {
                    ...prev,
                    value,
                    isSaving: false,
                    feedback: { tone: 'success', text: '已保存，并已按新的罗马音重算这句注音。' },
                  }
                  : prev)
              } else {
                setRomajiEdit((prev) => prev && prev.lineIndex === i
                  ? {
                    ...prev,
                    isSaving: false,
                    feedback: { tone: 'error', text: '保存失败，这首歌的本地数据没有更新。' },
                  }
                  : prev)
              }
            } catch {
              setRomajiEdit((prev) => prev && prev.lineIndex === i
                ? {
                  ...prev,
                  isSaving: false,
                  feedback: { tone: 'error', text: '保存失败，请再试一次。' },
                }
                : prev)
            } finally {
              setRomajiEdit((prev) => prev && prev.lineIndex === i && prev.isSaving
                ? { ...prev, isSaving: false }
                : prev)
            }
          }}
          className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"
        >
          {romajiEdit.isSaving ? '保存中...' : '保存并重算注音'}
        </button>
        <button
          type="button"
          disabled={romajiEdit.isSaving}
          onClick={(e) => {
            e.stopPropagation()
            setRomajiEdit(null)
          }}
          className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium text-slate-100"
        >
          取消
        </button>
      </div>
    </div>
  )
}
