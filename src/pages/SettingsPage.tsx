import { useState, useEffect } from 'react'
import { NetEaseLogin } from '../components/login/NetEaseLogin'
import { useUIStore } from '../stores/ui-store'
import { createBackupJson, restoreBackupJson } from '../services/backup-service'

export function SettingsPage() {
  const [loginConfigured, setLoginConfigured] = useState<boolean | null>(null)
  const [loginWritable, setLoginWritable] = useState<boolean | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [appearanceFeedback, setAppearanceFeedback] = useState<string | null>(null)
  const [dataFeedback, setDataFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const appearance = useUIStore((s) => s.appearance)
  const setAppearance = useUIStore((s) => s.setAppearance)
  const resetAppearance = useUIStore((s) => s.resetAppearance)

  useEffect(() => {
    fetch('/api/qr-login/status')
      .then((r) => r.json())
      .then((d) => {
        setLoginConfigured(d.configured ?? d.loggedIn ?? false)
        setLoginWritable(d.writable ?? false)
      })
      .catch(() => {
        setLoginConfigured(false)
        setLoginWritable(false)
      })
  }, [])

  const handleExport = () => {
    try {
      const blob = new Blob([createBackupJson()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `japanese-song-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setDataFeedback({ tone: 'success', text: '备份已导出。文件包含曲库、生词、收藏句、学习进度和外观设置。' })
    } catch {
      setDataFeedback({ tone: 'error', text: '导出失败，请检查浏览器是否允许下载。' })
    }
  }

  return (
    <div className="page-shell p-6">
      <div className="mb-6 rounded-2xl bg-surface/70 backdrop-blur-sm px-5 py-4 shadow-sm border border-border/40">
        <h2 className="text-2xl font-bold text-text">设置</h2>
      </div>

      <div className="border border-border rounded-xl bg-surface/72 backdrop-blur-sm p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-text">网易云音乐</h3>
            <p className="text-sm text-text-secondary mt-1">
              {loginConfigured === null
                ? '检查中...'
                : loginConfigured
                  ? `已配置登录凭据；音源权限会在播放时验证${loginWritable === false ? '（由服务器管理）' : ''}`
                  : loginWritable === false
                    ? '部署环境未配置登录凭据；请由服务器管理员添加环境变量'
                    : '未配置凭据，部分歌曲可能无法播放'}
            </p>
          </div>
          {loginWritable && (
            <button
              onClick={() => setShowLogin(true)}
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium self-start sm:self-auto ${
                loginConfigured
                  ? 'border border-border text-text-secondary hover:border-accent'
                  : 'bg-accent text-white hover:opacity-90'
              }`}
            >
              {loginConfigured ? '更新凭据' : '配置登录'}
            </button>
          )}
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
            type="button"
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
              setAppearanceFeedback(null)
              if (file.size > 1024 * 1024) {
                setAppearanceFeedback('图片超过 1 MB。为避免挤满浏览器存储，请先压缩或缩小图片。')
                e.target.value = ''
                return
              }
              const reader = new FileReader()
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  setAppearance({ backgroundImage: reader.result })
                }
              }
              reader.readAsDataURL(file)
            }}
          />
          {appearanceFeedback && <p className="mt-2 text-sm text-danger">{appearanceFeedback}</p>}
          {appearance.backgroundImage && (
            <button
              type="button"
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

      <div className="border border-border rounded-xl bg-surface/72 backdrop-blur-sm p-4 mb-4 space-y-3">
        <div>
          <h3 className="font-semibold text-text">数据备份</h3>
          <p className="text-sm text-text-secondary mt-1">
            曲库和学习记录目前只保存在这个浏览器中，不会自动同步到另一台电脑。换设备前请导出 JSON，再在新设备导入。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:opacity-90"
          >
            导出 JSON 备份
          </button>
          <label className="cursor-pointer px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:border-accent">
            导入备份
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const result = restoreBackupJson(await file.text())
                  setDataFeedback({
                    tone: 'success',
                    text: `已恢复 ${result.restoredKeys} 组数据。重新加载应用后生效。`,
                  })
                } catch (error) {
                  setDataFeedback({
                    tone: 'error',
                    text: error instanceof Error ? error.message : '导入失败。',
                  })
                } finally {
                  e.target.value = ''
                }
              }}
            />
          </label>
          {dataFeedback?.tone === 'success' && dataFeedback.text.includes('重新加载') && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-alt text-text-secondary"
            >
              重新加载应用
            </button>
          )}
        </div>
        {dataFeedback && (
          <p className={`text-sm ${dataFeedback.tone === 'success' ? 'text-success' : 'text-danger'}`}>
            {dataFeedback.text}
          </p>
        )}
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
