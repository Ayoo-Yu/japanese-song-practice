import { useState, useEffect } from 'react'
import { NetEaseLogin } from '../components/login/NetEaseLogin'
import { useUIStore } from '../stores/ui-store'
import type { AppearanceSettings } from '../stores/ui-store'

const appearancePresets: Array<{
  name: string
  description: string
  swatches: string[]
  patch: Partial<AppearanceSettings>
}> = [
  {
    name: '清爽',
    description: '白天练习，背景轻一点',
    swatches: ['#ffffff', '#247c7a', '#f27a62'],
    patch: {
      overlayOpacity: 0.48,
      blurPx: 0.4,
      saturation: 0.95,
      brightness: 1.06,
      lyricsPanelColor: '#102421',
      lyricsPanelOpacity: 0.78,
      lyricsLineOpacity: 0.1,
      lyricsTextColor: '#ffffff',
      lyricsAccentColor: '#78f0df',
      lyricsSubtextColor: '#dcefea',
    },
  },
  {
    name: '沉浸',
    description: '跟唱时更像歌词屏',
    swatches: ['#102421', '#78f0df', '#f7b267'],
    patch: {
      overlayOpacity: 0.36,
      blurPx: 1.4,
      saturation: 1.18,
      brightness: 0.9,
      lyricsPanelColor: '#071816',
      lyricsPanelOpacity: 0.88,
      lyricsLineOpacity: 0.16,
      lyricsTextColor: '#f7fffd',
      lyricsAccentColor: '#78f0df',
      lyricsSubtextColor: '#c6ddd8',
    },
  },
  {
    name: '夜练',
    description: '低亮度，适合晚上小声唱',
    swatches: ['#0f172a', '#9bd4ff', '#f2a65a'],
    patch: {
      overlayOpacity: 0.58,
      blurPx: 1.8,
      saturation: 0.82,
      brightness: 0.78,
      lyricsPanelColor: '#0f172a',
      lyricsPanelOpacity: 0.9,
      lyricsLineOpacity: 0.14,
      lyricsTextColor: '#f8fbff',
      lyricsAccentColor: '#9bd4ff',
      lyricsSubtextColor: '#d5e2f0',
    },
  },
]

export function SettingsPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const appearance = useUIStore((s) => s.appearance)
  const setAppearance = useUIStore((s) => s.setAppearance)
  const resetAppearance = useUIStore((s) => s.resetAppearance)

  useEffect(() => {
    fetch('/api/qr-login/status')
      .then((r) => r.json())
      .then((d) => setLoggedIn(d.loggedIn))
      .catch(() => setLoggedIn(false))
  }, [])

  return (
    <div className="page-shell px-4 py-6">
      <div className="learning-panel mb-5 px-5 py-5">
        <p className="mb-1 text-xs font-semibold uppercase text-accent">Preferences</p>
        <h2 className="text-2xl font-bold text-text">设置</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">登录音乐账号，调整背景和歌词区外观。</p>
      </div>

      <div className="learning-card mb-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text">网易云音乐</h3>
            <p className="text-sm text-text-secondary mt-1">
              {loggedIn === null
                ? '检查中...'
                : loggedIn
                  ? '已登录，可播放 VIP 歌曲'
                  : '未登录，VIP 歌曲无法播放'}
            </p>
          </div>
          <button
            onClick={() => setShowLogin(true)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium ${
              loggedIn
                ? 'border border-border text-text-secondary hover:border-accent'
                : 'bg-accent text-white hover:opacity-90'
            }`}
          >
            {loggedIn ? '重新登录' : '登录'}
          </button>
        </div>
      </div>

      <div className="learning-card mb-4 space-y-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-text">背景外观</h3>
            <p className="text-sm text-text-secondary mt-1">
              自定义背景图、遮罩、模糊和色彩强度。
            </p>
          </div>
          <button
            onClick={resetAppearance}
            className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text-secondary hover:border-accent"
          >
            恢复默认
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-text">一键预设</span>
            <span className="text-xs text-text-muted">可再微调</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {appearancePresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setAppearance(preset.patch)}
                className="rounded-lg border border-border bg-surface/82 px-3 py-3 text-left transition-colors hover:border-accent"
              >
                <div className="mb-3 flex gap-1.5">
                  {preset.swatches.map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="font-semibold text-text">{preset.name}</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-text mb-2">自定义图片</span>
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm text-text-secondary file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-accent/12 file:text-accent file:font-medium"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  setAppearance({ backgroundImage: reader.result })
                }
              }
              reader.readAsDataURL(file)
            }}
          />
          {appearance.backgroundImage && (
            <button
              onClick={() => setAppearance({ backgroundImage: null })}
              className="mt-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-alt text-text-secondary hover:bg-surface-muted"
            >
              使用默认背景
            </button>
          )}
        </label>

        <RangeField
          label="遮罩强度"
          min={0}
          max={0.85}
          step={0.01}
          value={appearance.overlayOpacity}
          displayValue={`${Math.round(appearance.overlayOpacity * 100)}%`}
          onChange={(value) => setAppearance({ overlayOpacity: value })}
        />

        <RangeField
          label="背景模糊"
          min={0}
          max={6}
          step={0.1}
          value={appearance.blurPx}
          displayValue={`${appearance.blurPx.toFixed(1)} px`}
          onChange={(value) => setAppearance({ blurPx: value })}
        />

        <RangeField
          label="颜色鲜艳度"
          min={0.6}
          max={1.8}
          step={0.05}
          value={appearance.saturation}
          displayValue={`${appearance.saturation.toFixed(2)}x`}
          onChange={(value) => setAppearance({ saturation: value })}
        />

        <RangeField
          label="背景亮度"
          min={0.6}
          max={1.4}
          step={0.05}
          value={appearance.brightness}
          displayValue={`${appearance.brightness.toFixed(2)}x`}
          onChange={(value) => setAppearance({ brightness: value })}
        />

        <div className="pt-2 border-t border-border/60 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-text mb-1">歌词区颜色</h4>
            <p className="text-sm text-text-secondary">收紧成 4 个核心颜色，其他元素会自动跟随，配色更统一。</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="面板颜色"
              value={appearance.lyricsPanelColor}
              onChange={(value) => setAppearance({ lyricsPanelColor: value })}
            />
            <ColorField
              label="主文字颜色"
              value={appearance.lyricsTextColor}
              onChange={(value) => setAppearance({ lyricsTextColor: value })}
            />
            <ColorField
              label="辅助文字颜色"
              value={appearance.lyricsSubtextColor}
              onChange={(value) => setAppearance({ lyricsSubtextColor: value })}
            />
            <ColorField
              label="强调色"
              value={appearance.lyricsAccentColor}
              onChange={(value) => setAppearance({ lyricsAccentColor: value })}
            />
          </div>

          <RangeField
            label="面板透明度"
            min={0}
            max={0.95}
            step={0.01}
            value={appearance.lyricsPanelOpacity}
            displayValue={`${Math.round(appearance.lyricsPanelOpacity * 100)}%`}
            onChange={(value) => setAppearance({ lyricsPanelOpacity: value })}
          />

          <RangeField
            label="行底透明度"
            min={0}
            max={0.35}
            step={0.01}
            value={appearance.lyricsLineOpacity}
            displayValue={`${Math.round(appearance.lyricsLineOpacity * 100)}%`}
            onChange={(value) => setAppearance({ lyricsLineOpacity: value })}
          />
        </div>
      </div>

      {showLogin && (
        <NetEaseLogin
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-text mb-2">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/78 p-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 shrink-0 rounded border border-border bg-transparent p-1"
        />
        <span className="min-w-0 truncate text-xs font-mono text-text-secondary">{value}</span>
      </div>
    </label>
  )
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  displayValue,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  displayValue: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-semibold text-text-secondary tabular-nums">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </label>
  )
}
