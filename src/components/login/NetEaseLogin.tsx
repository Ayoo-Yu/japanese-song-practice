import { useState } from 'react'

export function NetEaseLogin({ onClose }: { onClose: () => void }) {
  const [cookie, setCookie] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!cookie.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/qr-login/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: cookie.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setSuccess(true)
      } else {
        setError(data.error || '保存失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text">网易云音乐登录</h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">&#10003;</div>
            <p className="text-accent font-bold text-lg mb-2">登录成功!</p>
            <p className="text-text-secondary text-sm mb-4">刷新页面后生效</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90"
            >
              刷新页面
            </button>
          </div>
        ) : (
          <>
            <div className="text-sm text-text-secondary mb-4 space-y-2">
              <p>
                <span className="font-medium text-text">1.</span> 打开{' '}
                <a
                  href="https://music.163.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline"
                >
                  music.163.com
                </a>{' '}
                并登录
              </p>
              <p>
                <span className="font-medium text-text">2.</span> 按{' '}
                <kbd className="px-1.5 py-0.5 bg-black/10 rounded text-xs">F12</kbd>{' '}
                打开开发者工具
              </p>
              <p>
                <span className="font-medium text-text">3.</span> 切换到{' '}
                <span className="font-medium text-text">Application</span> 标签页
              </p>
              <p>
                <span className="font-medium text-text">4.</span> 左侧 Cookies &rarr;
                music.163.com &rarr; 找到{' '}
                <span className="font-mono text-accent">MUSIC_U</span>
              </p>
              <p>
                <span className="font-medium text-text">5.</span> 复制它的值，粘贴到下方
              </p>
            </div>

            <textarea
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              placeholder="粘贴 MUSIC_U 的值..."
              className="w-full h-20 px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text resize-none focus:outline-none focus:border-accent"
            />

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <button
              onClick={handleSave}
              disabled={!cookie.trim() || saving}
              className="w-full mt-3 px-4 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-40"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
