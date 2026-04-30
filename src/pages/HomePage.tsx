import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSavedLines, listSavedWords } from '../services/collections-service'
import { listUserSongs } from '../services/song-service'
import type { Song } from '../types'

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [savedWordCount, setSavedWordCount] = useState(0)
  const [savedLineCount, setSavedLineCount] = useState(0)

  useEffect(() => {
    Promise.all([listUserSongs(), listSavedWords(), listSavedLines()]).then(([userSongs, words, lines]) => {
      setSongs(userSongs)
      setSavedWordCount(words.length)
      setSavedLineCount(lines.length)
    })
  }, [])

  const recentSong = songs[songs.length - 1]
  const practiceableCount = useMemo(
    () => songs.filter((song) =>
      (song.furiganaData?.length ?? 0) > 0 ||
      Object.keys(song.romajiLines ?? {}).length > 0 ||
      Object.keys(song.translationLines ?? {}).length > 0,
    ).length,
    [songs],
  )
  const savedTotal = savedWordCount + savedLineCount
  const suggestion = getTodaySuggestion({
    hasSongs: songs.length > 0,
    hasPracticeableSongs: practiceableCount > 0,
    hasSavedItems: savedTotal > 0,
    recentSong,
  })
  const firstStepDone = songs.length > 0
  const secondStepDone = practiceableCount > 0
  const thirdStepDone = savedTotal > 0

  return (
    <div className="page-shell px-4 py-6">
      <section className="learning-panel mb-4 px-5 py-5">
        <p className="mb-2 text-xs font-semibold uppercase text-accent">Japanese singing practice</p>
        <h1 className="text-2xl font-bold leading-tight text-text sm:text-3xl">今天唱一句日语歌</h1>
        <p className="mt-2 max-w-[34rem] text-sm leading-6 text-text-secondary">
          先看假名和罗马音，跟着原曲开口，再慢慢切到裸读歌词。
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to={recentSong ? `/song/${recentSong.neteaseId}` : '/search'}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
          >
            {recentSong ? '继续跟唱' : '添加第一首歌'}
          </Link>
          <Link
            to="/practice"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary"
          >
            练读音和歌词
          </Link>
        </div>
      </section>

      <section className="mb-4 grid grid-cols-3 gap-2">
        <StatCard label="歌曲" value={songs.length} />
        <StatCard label="可练" value={practiceableCount} />
        <StatCard label="收藏" value={savedTotal} />
      </section>

      <Link to={suggestion.to} className="learning-card mb-4 block p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-accent">Today</p>
          <span className="rounded-full bg-accent-bg px-2 py-0.5 text-[11px] font-semibold text-accent">
            {suggestion.badge}
          </span>
        </div>
        <p className="font-semibold text-text">{suggestion.title}</p>
        <p className="mt-1 text-sm leading-6 text-text-secondary">{suggestion.description}</p>
      </Link>

      {recentSong && (
        <Link to={`/song/${recentSong.neteaseId}`} className="learning-card mb-5 flex items-center gap-4 p-4">
          {recentSong.albumArtUrl ? (
            <img
              src={recentSong.albumArtUrl}
              alt={recentSong.album ?? recentSong.title}
              width={58}
              height={58}
              className="h-[58px] w-[58px] shrink-0 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-lg bg-surface-muted text-lg font-bold text-text-muted">
              音
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-accent">最近添加</p>
            <p className="truncate font-semibold text-text">{recentSong.title}</p>
            <p className="truncate text-sm text-text-secondary">{recentSong.artist}</p>
          </div>
          <span className="text-sm font-semibold text-accent">开始</span>
        </Link>
      )}

      <section className="grid gap-3">
        <LearningStep
          index="1"
          title="找一首想唱的歌"
          description="从搜索添加歌曲，先用熟悉旋律降低学习压力。"
          to="/search"
          action="搜索"
          status={firstStepDone ? 'done' : 'current'}
        />
        <LearningStep
          index="2"
          title="打开假名和罗马音"
          description="新手先看读音，跟着当前高亮行小声唱出来。"
          to={recentSong ? `/song/${recentSong.neteaseId}` : '/search'}
          action="跟唱"
          status={firstStepDone ? (secondStepDone ? 'done' : 'current') : 'todo'}
        />
        <LearningStep
          index="3"
          title="收藏卡住的词和句子"
          description="把反复唱不顺的地方留下，之后集中练。"
          to="/library?tab=lines"
          action="复习"
          status={secondStepDone ? (thirdStepDone ? 'done' : 'current') : 'todo'}
        />
      </section>
    </div>
  )
}

function getTodaySuggestion({
  hasSongs,
  hasPracticeableSongs,
  hasSavedItems,
  recentSong,
}: {
  hasSongs: boolean
  hasPracticeableSongs: boolean
  hasSavedItems: boolean
  recentSong?: Song
}): {
  badge: string
  title: string
  description: string
  to: string
} {
  if (!hasSongs) {
    return {
      badge: '第 1 步',
      title: '先加一首你会哼的歌',
      description: '熟悉旋律会让日语读音更容易入口，先从一首喜欢的开始。',
      to: '/search',
    }
  }
  if (!hasPracticeableSongs && recentSong) {
    return {
      badge: '准备读音',
      title: '打开最近歌曲，生成假名和罗马音',
      description: '进入歌词页后系统会准备读音辅助，准备好后就能做小测。',
      to: `/song/${recentSong.neteaseId}`,
    }
  }
  if (hasSavedItems) {
    return {
      badge: '复习',
      title: '先处理卡住的词和句子',
      description: '收藏过的内容最值得回炉，点进去直接跳回原句跟唱。',
      to: '/library?tab=lines',
    }
  }
  if (recentSong) {
    return {
      badge: '跟唱',
      title: '今天先慢速循环一句',
      description: '从当前高亮句开始，听一句、唱一句，别急着整首唱完。',
      to: `/song/${recentSong.neteaseId}`,
    }
  }
  return {
    badge: '开始',
    title: '添加第一首练习歌',
    description: '搜索歌名或歌手，加入练习后就能开始跟唱。',
    to: '/search',
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="learning-panel px-3 py-2.5 text-center">
      <div className="text-xl font-bold tabular-nums text-text">{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  )
}

function LearningStep({
  index,
  title,
  description,
  to,
  action,
  status,
}: {
  index: string
  title: string
  description: string
  to: string
  action: string
  status: 'done' | 'current' | 'todo'
}) {
  const statusLabel = status === 'done' ? '已完成' : status === 'current' ? '现在做' : '待解锁'
  return (
    <Link to={to} className="learning-card flex items-center gap-4 p-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
          status === 'done'
            ? 'bg-success/12 text-success'
            : status === 'current'
              ? 'bg-accent-bg text-accent'
              : 'bg-surface-muted text-text-muted'
        }`}
      >
        {status === 'done' ? '✓' : index}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-text">{title}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              status === 'done'
                ? 'bg-success/10 text-success'
                : status === 'current'
                  ? 'bg-accent-bg text-accent'
                  : 'bg-surface-muted text-text-muted'
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="mt-1 text-sm leading-5 text-text-secondary">{description}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-accent">{action}</span>
    </Link>
  )
}
