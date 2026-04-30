import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listUserSongs, deleteSong } from '../services/song-service'
import { listSavedLines, listSavedWords, removeSavedLine, removeSavedWord } from '../services/collections-service'
import type { Song, SavedLine, SavedWord } from '../types'

type LibraryTabKey = 'songs' | 'words' | 'lines'

function getLibraryTab(value: string | null): LibraryTabKey {
  if (value === 'words' || value === 'lines') return value
  return 'songs'
}

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [songs, setSongs] = useState<Song[]>([])
  const [savedWords, setSavedWords] = useState<SavedWord[]>([])
  const [savedLines, setSavedLines] = useState<SavedLine[]>([])
  const [managing, setManaging] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [wordQuery, setWordQuery] = useState('')
  const [lineQuery, setLineQuery] = useState('')
  const tab = getLibraryTab(searchParams.get('tab'))

  const setTab = (nextTab: LibraryTabKey) => {
    setConfirmId(null)
    setSearchParams(nextTab === 'songs' ? {} : { tab: nextTab })
  }

  const reload = () => {
    listUserSongs().then(setSongs)
    listSavedWords().then(setSavedWords)
    listSavedLines().then(setSavedLines)
  }

  useEffect(() => { reload() }, [])

  const handleDelete = async (id: string) => {
    await deleteSong(id)
    setConfirmId(null)
    reload()
  }

  const practiceableSongs = songs.filter(isPracticeReady)
  const filteredWords = savedWords.filter((word) => {
    const query = wordQuery.trim().toLowerCase()
    if (!query) return true
    return [
      word.surface,
      word.reading,
      word.lineText,
      word.songTitle,
      word.artist,
    ].some((value) => value.toLowerCase().includes(query))
  })

  const filteredLines = savedLines.filter((line) => {
    const query = lineQuery.trim().toLowerCase()
    if (!query) return true
    return [
      line.lineText,
      line.romaji ?? '',
      line.translation ?? '',
      line.songTitle,
      line.artist,
    ].some((value) => value.toLowerCase().includes(query))
  })

  return (
    <div className="page-shell px-4 py-6">
      <section className="learning-panel mb-4 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-accent">Study library</p>
            <h2 className="text-2xl font-bold text-text">学习资料库</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              管理想唱的歌，复习卡住的词和句子。
            </p>
          </div>
          {tab === 'songs' && songs.length > 0 && (
            <button
              onClick={() => { setManaging(!managing); setConfirmId(null) }}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                managing
                  ? 'bg-danger/10 text-danger'
                  : 'bg-surface-alt text-text-secondary hover:text-text'
              }`}
            >
              {managing ? '完成' : '管理'}
            </button>
          )}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <LibraryStat label="歌曲" value={songs.length} />
          <LibraryStat label="可跟唱" value={practiceableSongs.length} />
          <LibraryStat label="复习项" value={savedWords.length + savedLines.length} />
        </div>
      </section>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <LibraryTab active={tab === 'songs'} onClick={() => setTab('songs')} count={songs.length}>歌曲</LibraryTab>
        <LibraryTab active={tab === 'words'} onClick={() => setTab('words')} count={savedWords.length}>生词</LibraryTab>
        <LibraryTab active={tab === 'lines'} onClick={() => setTab('lines')} count={savedLines.length}>句子</LibraryTab>
      </div>

      {tab === 'songs' ? (
        <SongsPanel
          songs={songs}
          managing={managing}
          confirmId={confirmId}
          onConfirmDelete={setConfirmId}
          onDelete={handleDelete}
        />
      ) : tab === 'words' ? (
        <WordsPanel
          words={filteredWords}
          total={savedWords.length}
          query={wordQuery}
          onQueryChange={setWordQuery}
          onRemove={async (id) => {
            await removeSavedWord(id)
            reload()
          }}
        />
      ) : (
        <LinesPanel
          lines={filteredLines}
          total={savedLines.length}
          query={lineQuery}
          onQueryChange={setLineQuery}
          onRemove={async (id) => {
            await removeSavedLine(id)
            reload()
          }}
        />
      )}
    </div>
  )
}

function SongsPanel({
  songs,
  managing,
  confirmId,
  onConfirmDelete,
  onDelete,
}: {
  songs: Song[]
  managing: boolean
  confirmId: string | null
  onConfirmDelete: (id: string | null) => void
  onDelete: (id: string) => void
}) {
  if (songs.length === 0) {
    return (
      <EmptyCollection
        title="还没有练习歌曲"
        text="先添加一首熟悉的日语歌，从能哼出来的旋律开始。"
        action={<Link to="/search" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white">去搜索添加</Link>}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {songs.map((song) => {
        const readiness = getSongReadiness(song)
        return (
          <div key={song.id} className="relative">
            <Link
              to={`/song/${song.neteaseId}`}
              className={`learning-card flex items-center gap-4 p-4 ${managing ? 'pr-16' : ''}`}
            >
              <AlbumArt song={song} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${readiness.className}`}>
                    {readiness.label}
                  </span>
                  <span className="text-[11px] text-text-muted">{readiness.hint}</span>
                </div>
                <p className="truncate font-semibold text-text">{song.title}</p>
                <p className="truncate text-sm text-text-secondary">{song.artist}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-accent">练唱</span>
            </Link>

            {managing && (
              confirmId === song.id ? (
                <div className="absolute bottom-0 right-1 top-0 flex items-center gap-1">
                  <button
                    onClick={() => onDelete(song.id)}
                    className="rounded-lg bg-danger px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    删除
                  </button>
                  <button
                    onClick={() => onConfirmDelete(null)}
                    className="rounded-lg bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-secondary"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onConfirmDelete(song.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-danger/10 px-2 py-1 text-xs font-semibold text-danger"
                >
                  删除
                </button>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}

function WordsPanel({
  words,
  total,
  query,
  onQueryChange,
  onRemove,
}: {
  words: SavedWord[]
  total: number
  query: string
  onQueryChange: (value: string) => void
  onRemove: (id: string) => void
}) {
  if (total === 0) {
    return <EmptyCollection title="还没有生词" text="在歌词页点不熟的汉字词，之后会出现在这里。" />
  }

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={onQueryChange} placeholder="筛选单词、读音、歌词或歌曲" />
      {words.length === 0 ? (
        <EmptyCollection title="没有匹配的生词" text="换个关键词试试看。" />
      ) : (
        <div className="flex flex-col gap-3">
          {words.map((word) => (
            <div key={word.id} className="learning-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xl font-bold text-text">{word.surface}</div>
                  <div className="text-sm font-semibold text-accent">{word.reading}</div>
                </div>
                <ReviewActions to={`/song/${word.neteaseId}?line=${word.lineIndex}`} onRemove={() => onRemove(word.id)} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-text">{word.lineText}</p>
              <p className="mt-2 truncate text-xs text-text-secondary">{word.songTitle} · {word.artist}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LinesPanel({
  lines,
  total,
  query,
  onQueryChange,
  onRemove,
}: {
  lines: SavedLine[]
  total: number
  query: string
  onQueryChange: (value: string) => void
  onRemove: (id: string) => void
}) {
  const [reviewing, setReviewing] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)

  if (total === 0) {
    return <EmptyCollection title="还没有收藏句" text="把唱不顺的一整句收藏起来，之后集中跟读。" />
  }

  const currentReviewLine = lines[Math.min(reviewIndex, Math.max(lines.length - 1, 0))]

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={onQueryChange} placeholder="筛选句子、罗马音、翻译或歌曲" />
      {lines.length === 0 ? (
        <EmptyCollection title="没有匹配的收藏句" text="换个关键词试试看。" />
      ) : (
        <>
          <div className="learning-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-text">收藏句复习</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {reviewing ? `第 ${Math.min(reviewIndex + 1, lines.length)} / ${lines.length} 句` : '把卡住的句子一条条练顺。'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewing((value) => !value)
                  setReviewIndex(0)
                }}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {reviewing ? '退出复习' : '开始复习'}
              </button>
            </div>
            {reviewing && currentReviewLine && (
              <div className="mt-4 rounded-lg border border-border bg-surface/82 p-4">
                <p className="text-base font-semibold leading-7 text-text">{currentReviewLine.lineText}</p>
                {currentReviewLine.romaji && (
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{currentReviewLine.romaji}</p>
                )}
                {currentReviewLine.translation && (
                  <p className="mt-1 text-sm leading-6 text-text-muted">{currentReviewLine.translation}</p>
                )}
                <p className="mt-3 truncate text-xs text-text-secondary">
                  {currentReviewLine.songTitle} · {currentReviewLine.artist}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/song/${currentReviewLine.neteaseId}?line=${currentReviewLine.lineIndex}`}
                    className="rounded-lg bg-accent-bg px-4 py-2 text-sm font-semibold text-accent"
                  >
                    去跟唱
                  </Link>
                  <button
                    type="button"
                    onClick={() => setReviewIndex((value) => Math.max(0, value - 1))}
                    disabled={reviewIndex === 0}
                    className="rounded-lg bg-surface-alt px-4 py-2 text-sm font-semibold text-text-secondary disabled:opacity-40"
                  >
                    上一句
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewIndex((value) => (value + 1) % lines.length)}
                    className="rounded-lg bg-surface-alt px-4 py-2 text-sm font-semibold text-text-secondary"
                  >
                    下一句
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {lines.map((line) => (
              <div key={line.id} className="learning-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-7 text-text">{line.lineText}</p>
                    {line.romaji && <p className="mt-1 text-sm leading-6 text-text-secondary">{line.romaji}</p>}
                    {line.translation && <p className="mt-1 text-sm leading-6 text-text-muted">{line.translation}</p>}
                  </div>
                  <ReviewActions to={`/song/${line.neteaseId}?line=${line.lineIndex}`} onRemove={() => onRemove(line.id)} />
                </div>
                <p className="mt-3 truncate text-xs text-text-secondary">{line.songTitle} · {line.artist}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function LibraryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-alt/80 px-3 py-3 text-center">
      <div className="text-xl font-bold tabular-nums text-text">{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  )
}

function LibraryTab({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-accent text-white' : 'bg-surface-alt text-text-secondary'
      }`}
    >
      {children}
      <span className={`ml-1 text-xs ${active ? 'text-white/80' : 'text-text-muted'}`}>{count}</span>
    </button>
  )
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-surface/86 px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent"
    />
  )
}

function ReviewActions({ to, onRemove }: { to: string; onRemove: () => void | Promise<void> }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <Link
        to={to}
        className="rounded-lg bg-surface px-3 py-1 text-xs font-semibold text-text-secondary"
      >
        去跟唱
      </Link>
      {confirming ? (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              void onRemove()
              setConfirming(false)
            }}
            className="rounded-lg bg-danger px-2.5 py-1 text-xs font-semibold text-white"
          >
            确认
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary"
          >
            取消
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg bg-danger/10 px-3 py-1 text-xs font-semibold text-danger"
        >
          删除
        </button>
      )}
    </div>
  )
}

function AlbumArt({ song }: { song: Song }) {
  if (song.albumArtUrl) {
    return (
      <img
        src={song.albumArtUrl}
        alt={song.album ?? song.title}
        width={58}
        height={58}
        className="h-[58px] w-[58px] shrink-0 rounded-lg object-cover shadow-sm"
      />
    )
  }

  return (
    <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-lg bg-surface-muted text-lg font-bold text-text-muted">
      音
    </div>
  )
}

function EmptyCollection({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="learning-panel px-5 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-bg text-sm font-bold text-accent">
        練
      </div>
      <p className="font-semibold text-text">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-text-secondary">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

function isPracticeReady(song: Song): boolean {
  return (
    (song.furiganaData?.length ?? 0) > 0 ||
    Object.keys(song.romajiLines ?? {}).length > 0 ||
    Object.keys(song.translationLines ?? {}).length > 0
  )
}

function getSongReadiness(song: Song): { label: string; hint: string; className: string } {
  if ((song.furiganaData?.length ?? 0) > 0) {
    return {
      label: '可跟唱',
      hint: '假名已准备',
      className: 'bg-accent-bg text-accent',
    }
  }
  if (Object.keys(song.romajiLines ?? {}).length > 0) {
    return {
      label: '可读音',
      hint: '有 Romaji',
      className: 'bg-highlight text-text',
    }
  }
  return {
    label: '待准备',
    hint: '打开歌曲生成注音',
    className: 'bg-surface-muted text-text-secondary',
  }
}
