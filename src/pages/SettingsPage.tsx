import { useState, useEffect } from 'react'
import { NetEaseLogin } from '../components/login/NetEaseLogin'
import { useUIStore } from '../stores/ui-store'

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
    <div className="page-shell p-6">
      <div className="mb-6 rounded-2xl bg-surface/70 backdrop-blur-sm px-5 py-4 shadow-sm border border-border/40">
        <h2 className="text-2xl font-bold text-text">设置</h2>
      </div>

      <div className="border border-border rounded-xl bg-surface/72 backdrop-blur-sm p-4 mb-4">
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
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              loggedIn
                ? 'border border-border text-text-secondary hover:border-accent'
                : 'bg-accent text-white hover:opacity-90'
            }`}
          >
            {loggedIn ? '重新登录' : '登录'}
          </button>
        </div>
      </div>

      <div className="border border-border rounded-xl bg-surface/72 backdrop-blur-sm p-4 mb-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-text">背景外观</h3>
            <p className="text-sm text-text-secondary mt-1">
              自定义背景图、遮罩、模糊和色彩强度。
            </p>
          </div>
          <button
            onClick={resetAppearance}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text-secondary hover:border-accent"
          >
            恢复默认
          </button>
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
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded border border-border bg-transparent p-1"
        />
        <span className="text-sm text-text-secondary font-mono">{value}</span>
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
        <span className="text-sm text-text-secondary tabular-nums">{displayValue}</span>
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
