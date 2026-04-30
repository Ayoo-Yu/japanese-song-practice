import type { ReactNode } from 'react'
import { useState } from 'react'

interface RegenerateFeedback {
  tone: 'success' | 'error' | 'info'
  text: string
}

interface SongToolbarProps {
  showFurigana: boolean
  showRomaji: boolean
  showTranslation: boolean
  showKTV: boolean
  isRegenerating: boolean
  isEditing: boolean
  hasAnyMediumConfidence: boolean
  ignoreAllMediumHints: boolean
  regenerateFeedback: RegenerateFeedback | null
  onToggleFurigana: () => void
  onToggleRomaji: () => void
  onToggleTranslation: () => void
  onToggleKTV: () => void
  onUseBeginnerPreset: () => void
  onUseChallengePreset: () => void
  onRegenerateFurigana: () => void
  onToggleIgnoreMediumHints: () => void
  onToggleEditing: () => void
}

export function SongToolbar({
  showFurigana,
  showRomaji,
  showTranslation,
  showKTV,
  isRegenerating,
  isEditing,
  hasAnyMediumConfidence,
  ignoreAllMediumHints,
  regenerateFeedback,
  onToggleFurigana,
  onToggleRomaji,
  onToggleTranslation,
  onToggleKTV,
  onUseBeginnerPreset,
  onUseChallengePreset,
  onRegenerateFurigana,
  onToggleIgnoreMediumHints,
  onToggleEditing,
}: SongToolbarProps) {
  const [showDisplay, setShowDisplay] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-semibold text-text-muted">练习模式</p>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <PresetButton
              active={showFurigana && showRomaji && showTranslation && showKTV}
              onClick={onUseBeginnerPreset}
            >
              新手
            </PresetButton>
            <PresetButton
              active={!showFurigana && !showRomaji && !showTranslation && showKTV}
              onClick={onUseChallengePreset}
            >
              挑战
            </PresetButton>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
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
        <div className="rounded-lg border border-border/70 bg-surface/76 p-3">
          <p className="mb-2 text-[11px] font-semibold text-text-muted">高级校准</p>
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

function PresetButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-accent bg-accent-bg text-accent'
          : 'border-border bg-surface-alt text-text-secondary hover:border-accent'
      }`}
    >
      {children}
    </button>
  )
}
