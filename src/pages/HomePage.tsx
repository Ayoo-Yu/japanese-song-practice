import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="page-shell p-6">
      <div className="mb-8 rounded-2xl bg-surface/70 backdrop-blur-sm px-5 py-4 shadow-sm border border-border/40">
        <h1 className="text-3xl font-bold text-text mb-1">日语歌练习</h1>
        <p className="text-text-secondary">从五十音到 KTV 达人，一步步来。</p>
      </div>

      <div className="grid gap-4">
        <Link
          to="/search"
          className="group block p-6 rounded-2xl bg-gradient-to-br from-accent to-accent-light text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-lg font-bold">搜索歌曲</p>
          </div>
          <p className="text-sm opacity-80">找一首想练的日语歌</p>
        </Link>

        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/practice"
            className="group block p-5 rounded-2xl bg-surface-alt/80 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent mb-2">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
            </svg>
            <p className="font-bold text-text">歌词练习</p>
            <p className="text-xs text-text-secondary mt-1">罗马音和假名注音</p>
          </Link>

          <Link
            to="/library"
            className="group block p-5 rounded-2xl bg-surface-alt/80 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent mb-2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <p className="font-bold text-text">我的曲库</p>
            <p className="text-xs text-text-secondary mt-1">歌曲和进度</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
