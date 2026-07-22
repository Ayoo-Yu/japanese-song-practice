import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  buildBilibiliEmbedUrl,
  buildBilibiliPageUrl,
  resolveBilibiliVideoInput,
} from '../../lib/bilibili'
import type { BilibiliMv } from '../../types'

interface BilibiliMvStageProps {
  mv: BilibiliMv
  songTitle: string
  onEdit: () => void
  onUseAudio: () => void
}

export function BilibiliMvStage({ mv, songTitle, onEdit, onUseAudio }: BilibiliMvStageProps) {
  return (
    <section className="mx-3 mt-4 overflow-hidden rounded-xl border border-black/15 bg-[#111318] shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-white">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#fb7299] shadow-[0_0_12px_rgba(251,114,153,0.8)]" />
            <p className="text-sm font-bold">B站 MV 剧场</p>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-white/55">
            {mv.bvid}{mv.page > 1 ? ` · 第 ${mv.page} P` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={buildBilibiliPageUrl(mv)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/15"
          >
            打开 B 站
          </a>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/15"
          >
            更换
          </button>
          <button
            type="button"
            onClick={onUseAudio}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#20242b] hover:bg-white/90"
          >
            返回原曲
          </button>
        </div>
      </div>

      <div className="aspect-video w-full bg-black">
        <iframe
          key={`${mv.bvid}:${mv.page}:${mv.startAtSeconds ?? 0}`}
          src={buildBilibiliEmbedUrl(mv)}
          title={`${songTitle} 的 B站 MV`}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[11px] leading-5 text-white/55">
        <p>原曲音频已暂停；播放、进度和全屏请直接使用视频内控件。</p>
        <p>若站外播放受限，可打开 B 站或更换视频。</p>
      </div>
    </section>
  )
}

interface BilibiliMvDialogProps {
  mv?: BilibiliMv
  onClose: () => void
  onSave: (mv: BilibiliMv) => Promise<void>
  onRemove: () => Promise<void>
}

export function BilibiliMvDialog({ mv, onClose, onSave, onRemove }: BilibiliMvDialogProps) {
  const [input, setInput] = useState(mv?.sourceUrl ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSaving, onClose])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const resolvedMv = await resolveBilibiliVideoInput(input)
      await onSave(resolvedMv)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'MV 保存失败，请稍后再试。')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await onRemove()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'MV 移除失败，请稍后再试。')
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mv-dialog-title"
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#fb7299]">KTV · MV</p>
            <h2 id="mv-dialog-title" className="mt-1 text-xl font-bold text-text">
              {mv ? '更换指定 MV' : '指定 B站 MV'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="关闭"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-lg text-text-secondary disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form className="mt-5" onSubmit={handleSubmit}>
          <label htmlFor="bilibili-mv-url" className="text-sm font-semibold text-text">
            视频链接或 BV 号
          </label>
          <input
            id="bilibili-mv-url"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例如：https://www.bilibili.com/video/BV..."
            autoFocus
            disabled={isSaving}
            className="mt-2 w-full rounded-lg border border-border bg-surface-alt px-3 py-3 text-sm text-text placeholder:text-text-muted disabled:opacity-60"
          />
          <p className="mt-2 text-xs leading-5 text-text-muted">
            支持完整链接、b23.tv 短链接、分 P 链接和单独的 BV 号。这里保存视频编号并使用 B 站官方播放器，不会把视频文件上传到本站。
          </p>

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              {mv && (
                <button
                  type="button"
                  onClick={() => { void handleRemove() }}
                  disabled={isSaving}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                >
                  移除指定
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-lg bg-surface-alt px-4 py-2 text-sm font-semibold text-text-secondary disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving || !input.trim()}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {isSaving ? '正在保存…' : '保存并进入 MV'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
