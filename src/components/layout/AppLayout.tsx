import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import backgroundUrl from '../../../background.jpeg'
import { useUIStore } from '../../stores/ui-store'

export function AppLayout() {
  const appearance = useUIStore((s) => s.appearance)
  const bgUrl = appearance.backgroundImage || backgroundUrl

  return (
    <div className="relative flex flex-col min-h-svh text-text font-sans overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${bgUrl})`,
          filter: `saturate(${appearance.saturation}) brightness(${appearance.brightness}) blur(${appearance.blurPx}px)`,
          transform: appearance.blurPx > 0 ? 'scale(1.02)' : undefined,
        }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(255, 255, 255, ${appearance.overlayOpacity})` }}
      />
      <main className="relative z-10 flex-1 pb-20">
        <Outlet />
      </main>
      <div className="relative z-10">
        <BottomNav />
      </div>
    </div>
  )
}
