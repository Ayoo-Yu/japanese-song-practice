import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-8 rounded-lg bg-surface/68 backdrop-blur-sm px-4 py-3">
        <h1 className="text-3xl font-bold text-text mb-2">日语歌练习</h1>
        <p className="text-text-secondary">从五十音到 KTV 达人，一步步来。</p>
      </div>

      <div className="grid gap-4">
        <Link
          to="/search"
          className="block p-6 rounded-2xl bg-accent text-white hover:bg-accent-light transition-colors"
        >
          <p className="text-lg font-bold">搜索歌曲</p>
          <p className="text-sm opacity-80 mt-1">找一首想练的日语歌</p>
        </Link>

        <Link
          to="/practice"
          className="block p-6 rounded-2xl bg-surface-alt border border-border hover:bg-surface-muted transition-colors"
        >
          <p className="text-lg font-bold text-text">歌词练习</p>
          <p className="text-sm text-text-secondary mt-1">测试罗马音和假名注音</p>
        </Link>

        <Link
          to="/library"
          className="block p-6 rounded-2xl bg-surface-alt border border-border hover:bg-surface-muted transition-colors"
        >
          <p className="text-lg font-bold text-text">我的曲库</p>
          <p className="text-sm text-text-secondary mt-1">查看已添加的歌曲和进度</p>
        </Link>
      </div>
    </div>
  )
}
