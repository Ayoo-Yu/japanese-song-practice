import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MiniPlayer } from '../player/MiniPlayer'
import { GlobalAudio } from '../player/GlobalAudio'
import backgroundUrl from '../../../background.jpeg'
import { useUIStore } from '../../stores/ui-store'

export function AppLayout() {
  const appearance = useUIStore((s) => s.appearance)
  const bgUrl = appearance.backgroundImage || backgroundUrl
  const location = useLocation()
  const navigate = useNavigate()
  const showBack = location.pathname !== '/'

  return (
    <div className="relative flex flex-col min-h-svh text-text font-sans overflow-hidden">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url(${bgUrl})`,
          filter: `saturate(${appearance.saturation}) brightness(${appearance.brightness}) blur(${appearance.blurPx}px)`,
          transform: appearance.blurPx > 0 ? 'scale(1.02)' : undefined,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ backgroundColor: `rgba(255, 255, 255, ${appearance.overlayOpacity})` }}
      />
      <GlobalAudio />
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-surface/88 text-text-secondary shadow-sm backdrop-blur-md transition-all duration-200 hover:text-text hover:bg-surface active:scale-95"
          aria-label="返回"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 15L7.5 10L13 5" />
          </svg>
        </button>
      )}
      <main className={`relative z-10 flex-1 pb-24 ${showBack ? 'pt-12' : ''}`}>
        <Outlet />
      </main>
      <MiniPlayer />
      <div className="relative z-10">
        <BottomNav />
      </div>
    </div>
  )
}
