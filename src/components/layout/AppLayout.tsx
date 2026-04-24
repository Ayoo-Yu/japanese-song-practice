import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MiniPlayer } from '../player/MiniPlayer'
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
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-surface/80 backdrop-blur-sm shadow-md flex items-center justify-center text-text-secondary hover:text-text hover:bg-surface active:scale-90 transition-all duration-200"
          aria-label="返回"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 15L7.5 10L13 5" />
          </svg>
        </button>
      )}
      <main className="relative z-10 flex-1 pb-20">
        <Outlet />
      </main>
      <MiniPlayer />
      <div className="relative z-10">
        <BottomNav />
      </div>
    </div>
  )
}
