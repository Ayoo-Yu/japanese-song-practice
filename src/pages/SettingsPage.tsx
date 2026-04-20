import { useState, useEffect } from 'react'
import { NetEaseLogin } from '../components/login/NetEaseLogin'

export function SettingsPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    fetch('/api/qr-login/status')
      .then((r) => r.json())
      .then((d) => setLoggedIn(d.loggedIn))
      .catch(() => setLoggedIn(false))
  }, [])

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-text mb-6">设置</h2>

      <div className="border border-border rounded-xl p-4 mb-4">
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

      {showLogin && (
        <NetEaseLogin
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  )
}
