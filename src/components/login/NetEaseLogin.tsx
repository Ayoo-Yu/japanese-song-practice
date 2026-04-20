import { useState, useEffect, useCallback, useRef } from 'react'

type LoginState = 'idle' | 'loading' | 'waiting' | 'scanned' | 'success' | 'expired' | 'error'

export function NetEaseLogin({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<LoginState>('loading')
  const [qrUrl, setQrUrl] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const keyRef = useRef<string>('')

  const startLogin = useCallback(async () => {
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/qr-login/key')
      const data = await res.json()
      if (!data.unikey) {
        setState('error')
        setErrorMsg('获取二维码失败')
        return
      }
      keyRef.current = data.unikey
      setQrUrl(data.qrUrl)
      setState('waiting')
    } catch {
      setState('error')
      setErrorMsg('网络错误')
    }
  }, [])

  useEffect(() => {
    if (state !== 'waiting' && state !== 'scanned') return
    if (!keyRef.current) return

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/qr-login/check?key=${keyRef.current}`)
        const data = await res.json()

        if (data.code === 801) {
          setState('waiting')
        } else if (data.code === 802) {
          setState('scanned')
        } else if (data.code === 803) {
          setState('success')
          clearInterval(timer)
        } else if (data.code === 800) {
          setState('expired')
          clearInterval(timer)
        } else {
          setState('error')
          setErrorMsg(data.message || `未知错误 (${data.code})`)
          clearInterval(timer)
        }
      } catch {
        // Retry on network error
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [state])

  useEffect(() => {
    startLogin()
  }, [startLogin])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text">网易云音乐登录</h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {state === 'loading' && (
          <div className="text-center py-8 text-text-secondary">加载中...</div>
        )}

        {(state === 'waiting' || state === 'scanned') && qrUrl && (
          <div className="text-center">
            <div className="bg-white rounded-xl p-3 inline-block mb-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                alt="QR Code"
                width={200}
                height={200}
              />
            </div>
            <p className="text-text-secondary text-sm mb-1">
              用网易云音乐 APP 扫描二维码
            </p>
            {state === 'scanned' ? (
              <p className="text-accent text-sm font-medium animate-pulse">
                已扫码，请在手机确认...
              </p>
            ) : (
              <p className="text-text-secondary text-xs">等待扫码...</p>
            )}
          </div>
        )}

        {state === 'success' && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">&#10003;</div>
            <p className="text-accent font-bold text-lg mb-2">登录成功!</p>
            <p className="text-text-secondary text-sm mb-4">
              Cookie 已保存，刷新页面后生效
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90"
            >
              刷新页面
            </button>
          </div>
        )}

        {state === 'expired' && (
          <div className="text-center py-6">
            <p className="text-text-secondary mb-4">二维码已过期</p>
            <button
              onClick={startLogin}
              className="px-6 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90"
            >
              重新获取
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center py-6">
            <p className="text-red-500 mb-4">{errorMsg}</p>
            <button
              onClick={startLogin}
              className="px-6 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90"
            >
              重试
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
