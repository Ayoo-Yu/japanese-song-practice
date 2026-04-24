import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listUserSongs, deleteSong } from '../services/song-service'
import { listSavedLines, listSavedWords, removeSavedLine, removeSavedWord } from '../services/collections-service'
import type { Song, SavedLine, SavedWord } from '../types'

export function LibraryPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [savedWords, setSavedWords] = useState<SavedWord[]>([])
  const [savedLines, setSavedLines] = useState<SavedLine[]>([])
  const [managing, setManaging] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [tab, setTab] = useState<'songs' | 'words' | 'lines'>('songs')
  const [wordQuery, setWordQuery] = useState('')
  const [lineQuery, setLineQuery] = useState('')

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
    <div className="page-shell p-6">
      <div className="flex items-center justify-between gap-4 mb-6 rounded-2xl bg-surface/70 backdrop-blur-sm px-5 py-4 shadow-sm border border-border/40">
        <h2 className="text-2xl font-bold text-text">我的曲库</h2>
        {tab === 'songs' && songs.length > 0 && (
          <button
            onClick={() => { setManaging(!managing); setConfirmId(null) }}
            className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
              managing
                ? 'bg-red-500/10 text-red-500'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            {managing ? '完成' : '管理'}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <LibraryTab active={tab === 'songs'} onClick={() => setTab('songs')}>曲库</LibraryTab>
        <LibraryTab active={tab === 'words'} onClick={() => setTab('words')}>生词本</LibraryTab>
        <LibraryTab active={tab === 'lines'} onClick={() => setTab('lines')}>收藏句</LibraryTab>
      </div>

      {tab === 'songs' ? (songs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted mb-4">还没有添加歌曲</p>
          <Link
            to="/search"
            className="inline-block px-6 py-2.5 bg-accent text-white rounded-xl font-medium"
          >
            去搜索添加
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {songs.map((song) => (
            <div key={song.id} className="relative">
              <Link
                to={`/song/${song.neteaseId}`}
                className={`flex items-center gap-4 p-4 rounded-xl bg-surface-alt/80 shadow-sm hover:shadow-md border border-border/40 hover:bg-surface-alt transition-all duration-200 ${
                  managing ? 'pr-14' : ''
                }`}
              >
                {song.albumArtUrl ? (
                  <img
                    src={song.albumArtUrl}
                    alt={song.album ?? song.title}
                    width={52}
                    height={52}
                    className="rounded-xl object-cover shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-[52px] h-[52px] rounded-lg bg-surface-muted flex items-center justify-center text-2xl shrink-0">
                    🎵
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-text font-medium truncate">{song.title}</p>
                  <p className="text-text-secondary text-sm truncate">{song.artist}</p>
                </div>
              </Link>

              {managing && (
                confirmId === song.id ? (
                  <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-1">
                    <button
                      onClick={() => handleDelete(song.id)}
                      className="px-2.5 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg"
                    >
                      删除
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-2.5 py-1.5 text-xs font-medium bg-surface text-text-secondary rounded-lg"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(song.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-500 transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )) : tab === 'words' ? (
        savedWords.length === 0 ? (
          <EmptyCollection text="还没有收藏单词" />
        ) : (
          <div className="space-y-3">
            <input
              value={wordQuery}
              onChange={(e) => setWordQuery(e.target.value)}
              placeholder="筛选单词、读音、歌词或歌曲"
              className="w-full rounded-lg border border-border bg-surface/82 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
            />
            {filteredWords.length === 0 ? (
              <EmptyCollection text="没有匹配的生词" />
            ) : (
              <div className="flex flex-col gap-3">
                {filteredWords.map((word) => (
                  <div key={word.id} className="p-4 rounded-xl bg-surface-alt/80 shadow-sm border border-border/40 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-text">{word.surface}</div>
                        <div className="text-sm text-accent">{word.reading}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/song/${word.neteaseId}`}
                          className="text-xs font-medium px-3 py-1 rounded-lg bg-surface text-text-secondary"
                        >
                          去歌曲
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            await removeSavedWord(word.id)
                            reload()
                          }}
                          className="text-xs font-medium px-3 py-1 rounded-lg bg-red-500/10 text-red-500"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-text truncate">{word.lineText}</p>
                    <p className="mt-1 text-xs text-text-secondary truncate">{word.songTitle} · {word.artist}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        savedLines.length === 0 ? (
          <EmptyCollection text="还没有收藏句子" />
        ) : (
          <div className="space-y-3">
            <input
              value={lineQuery}
              onChange={(e) => setLineQuery(e.target.value)}
              placeholder="筛选句子、罗马音、翻译或歌曲"
              className="w-full rounded-lg border border-border bg-surface/82 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent"
            />
            {filteredLines.length === 0 ? (
              <EmptyCollection text="没有匹配的收藏句" />
            ) : (
              <div className="flex flex-col gap-3">
                {filteredLines.map((line) => (
                  <div key={line.id} className="p-4 rounded-xl bg-surface-alt/80 shadow-sm border border-border/40 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-text font-medium">{line.lineText}</p>
                        {line.romaji && <p className="mt-1 text-sm text-text-secondary">{line.romaji}</p>}
                        {line.translation && <p className="mt-1 text-sm text-text-muted">{line.translation}</p>}
                        <p className="mt-2 text-xs text-text-secondary truncate">{line.songTitle} · {line.artist}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Link
                          to={`/song/${line.neteaseId}`}
                          className="text-xs font-medium px-3 py-1 rounded-lg bg-surface text-text-secondary"
                        >
                          去歌曲
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            await removeSavedLine(line.id)
                            reload()
                          }}
                          className="text-xs font-medium px-3 py-1 rounded-lg bg-red-500/10 text-red-500"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}

function LibraryTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? 'bg-accent/15 text-accent border border-accent/30' : 'bg-surface-alt text-text-secondary'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyCollection({ text }: { text: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3 opacity-40">📝</div>
      <p className="text-text-muted">{text}</p>
    </div>
  )
}
