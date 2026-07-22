import type { ReactNode } from 'react'
import { useState } from 'react'
import type { PracticeStage } from '../../types'
import { StageSelector } from './StageSelector'

interface RegenerateFeedback {
  tone: 'success' | 'error' | 'info'
  text: string
}

interface SongToolbarProps {
  currentStage: PracticeStage
  showFurigana: boolean
  showRomaji: boolean
  showTranslation: boolean
  showKTV: boolean
  isRegenerating: boolean
  isEditing: boolean
  hasAnyMediumConfidence: boolean
  ignoreAllMediumHints: boolean
  timingOffsetMs: number
  hasMv: boolean
  isMvMode: boolean
  regenerateFeedback: RegenerateFeedback | null
  onToggleFurigana: () => void
  onToggleRomaji: () => void
  onToggleTranslation: () => void
  onToggleKTV: () => void
  onTimingOffsetChange: (value: number) => void
  onMvClick: () => void
  onStageChange: (stage: PracticeStage) => void
  onRegenerateFurigana: () => void
  onToggleIgnoreMediumHints: () => void
  onToggleEditing: () => void
}

export function SongToolbar({
  currentStage,
  showFurigana,
  showRomaji,
  showTranslation,
  showKTV,
  isRegenerating,
  isEditing,
  hasAnyMediumConfidence,
  ignoreAllMediumHints,
  timingOffsetMs,
  hasMv,
  isMvMode,
  regenerateFeedback,
  onToggleFurigana,
  onToggleRomaji,
  onToggleTranslation,
  onToggleKTV,
  onTimingOffsetChange,
  onMvClick,
  onStageChange,
  onRegenerateFurigana,
  onToggleIgnoreMediumHints,
  onToggleEditing,
}: SongToolbarProps) {
  const [showDisplay, setShowDisplay] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-semibold text-text-muted">练习模式</p>
          <StageSelector currentStage={currentStage} onStageChange={onStageChange} />
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto sm:shrink-0">
          <button
            type="button"
            onClick={onMvClick}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              isMvMode
                ? 'bg-[#fb7299] text-white'
                : hasMv
                  ? 'bg-[#fb7299]/10 text-[#d94f7c] hover:bg-[#fb7299]/15'
                  : 'bg-surface-alt text-text-secondary hover:bg-surface-muted'
            }`}
          >
            {isMvMode ? '退出 MV' : hasMv ? '进入 MV' : '指定 MV'}
          </button>
          <button
            type="button"
            onClick={() => setShowDisplay((value) => !value)}
            className="rounded-lg bg-surface-alt px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-muted"
          >
            显示
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="rounded-lg bg-surface-alt px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-muted"
          >
            {showAdvanced ? '收起' : '更多'}
          </button>
          <button
            onClick={onToggleEditing}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              isEditing
                ? 'bg-accent text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-surface-muted'
            }`}
          >
            {isEditing ? '完成' : '编辑'}
          </button>
        </div>
      </div>

      {showDisplay && (
        <div className="rounded-lg border border-border/70 bg-surface/76 p-3">
          <p className="mb-2 text-[11px] font-semibold text-text-muted">歌词辅助</p>
          <div className="flex flex-wrap gap-2">
            <TogglePill active={showFurigana} onClick={onToggleFurigana}>
              假名
            </TogglePill>
            <TogglePill active={showRomaji} onClick={onToggleRomaji}>
              Romaji
            </TogglePill>
            <TogglePill active={showTranslation} onClick={onToggleTranslation}>
              中文
            </TogglePill>
            <TogglePill active={showKTV} onClick={onToggleKTV}>
              高亮
            </TogglePill>
          </div>
        </div>
      )}

      {showAdvanced && (
        <div className="space-y-3 rounded-lg border border-border/70 bg-surface/76 p-3">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-text-muted">整首歌词同步</p>
              <span className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold tabular-nums text-text-secondary">
                {formatTimingOffset(timingOffsetMs)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onTimingOffsetChange(timingOffsetMs - 100)}
                className="rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-medium text-text-secondary hover:border-accent"
              >
                歌词早 0.1 秒
              </button>
              <button
                type="button"
                onClick={() => onTimingOffsetChange(timingOffsetMs + 100)}
                className="rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-medium text-text-secondary hover:border-accent"
              >
                歌词晚 0.1 秒
              </button>
              <button
                type="button"
                disabled={timingOffsetMs === 0}
                onClick={() => onTimingOffsetChange(0)}
                className="rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-medium text-text-muted hover:border-accent disabled:opacity-40"
              >
                重置
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-text-muted">
              高光比人声快就点“歌词晚”，比人声慢就点“歌词早”。个别句仍不准时，点“编辑”后校准该句。
            </p>
          </div>
          <div className="border-t border-border/60 pt-3">
            <p className="mb-2 text-[11px] font-semibold text-text-muted">注音维护</p>
            <div className="flex flex-wrap gap-2">
            <button
              onClick={onRegenerateFurigana}
              disabled={isRegenerating}
              className="rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-medium text-text-secondary hover:border-accent disabled:opacity-60"
            >
              {isRegenerating ? '重建中...' : '重生成注音'}
            </button>
            {hasAnyMediumConfidence && (
              <button
                onClick={onToggleIgnoreMediumHints}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  ignoreAllMediumHints
                    ? 'bg-cyan-400/12 text-cyan-700 border-cyan-400/30'
                    : 'bg-surface-alt text-text-secondary border-border hover:border-accent'
                }`}
              >
                {ignoreAllMediumHints ? '已忽略中等提示' : '忽略中等提示'}
              </button>
            )}
            </div>
          </div>
        </div>
      )}
      {regenerateFeedback && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            regenerateFeedback.tone === 'success'
              ? 'bg-emerald-500/12 text-emerald-700'
              : regenerateFeedback.tone === 'error'
                ? 'bg-red-500/10 text-red-600'
                : 'bg-surface-alt text-text-secondary'
          }`}
        >
          {regenerateFeedback.text}
        </div>
      )}
    </div>
  )
}

function formatTimingOffset(value: number): string {
  if (value === 0) return '原始时间'
  return `${value > 0 ? '晚 ' : '早 '}${(Math.abs(value) / 1000).toFixed(1)} 秒`
}

function TogglePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
        active
          ? 'bg-accent text-white border border-accent'
          : 'bg-surface-alt text-text-muted border border-transparent hover:text-text-secondary'
      }`}
    >
      {children}
    </button>
  )
}
