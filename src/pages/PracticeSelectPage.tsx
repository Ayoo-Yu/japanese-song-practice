import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listUserSongs } from '../services/song-service'
import type { Song } from '../types'
import type { QuizType } from '../services/quiz-service'

export function PracticeSelectPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const quizType = (searchParams.get('type') as QuizType) || 'romaji'

  useEffect(() => {
    listUserSongs().then(setSongs)
  }, [])

  const practiceable = songs.filter(
    (s) =>
      (s.furiganaData?.length ?? 0) > 0 ||
      Object.keys(s.romajiLines ?? {}).length > 0 ||
      Object.keys(s.translationLines ?? {}).length > 0,
  )

  return (
    <div className="page-shell p-6">
      <div className="mb-6 rounded-lg bg-surface/68 backdrop-blur-sm px-4 py-3">
        <h2 className="text-2xl font-bold text-text mb-2">歌词练习</h2>
        <p className="text-text-secondary text-sm">选择歌曲开始练习读音</p>
      </div>

      <div className="flex gap-2 mb-6">
        <TypePill
          active={quizType === 'romaji'}
          onClick={() => setSearchParams({ type: 'romaji' })}
        >
          罗马音
        </TypePill>
        <TypePill
          active={quizType === 'furigana'}
          onClick={() => setSearchParams({ type: 'furigana' })}
        >
          假名注音
        </TypePill>
        <TypePill
          active={quizType === 'translation'}
          onClick={() => setSearchParams({ type: 'translation' })}
        >
          歌词翻译
        </TypePill>
        <TypePill
          active={quizType === 'pronunciation'}
          onClick={() => setSearchParams({ type: 'pronunciation' })}
        >
          读音练习
        </TypePill>
      </div>

      {practiceable.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted mb-4">没有可练习的歌曲（需要先添加并加载注音数据）</p>
          <Link
            to="/library"
            className="inline-block px-6 py-2.5 bg-accent text-white rounded-xl font-medium"
          >
            去曲库
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {practiceable.map((song) => (
            <Link
              key={song.id}
              to={`/practice/${song.neteaseId}?type=${quizType}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-alt hover:bg-surface-muted transition-colors"
            >
              {song.albumArtUrl ? (
                <img
                  src={song.albumArtUrl}
                  alt={song.album ?? song.title}
                  width={52}
                  height={52}
                  className="rounded-lg object-cover shrink-0"
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
          ))}
        </div>
      )}
    </div>
  )
}

function TypePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'bg-surface-alt text-text-muted border border-transparent hover:text-text-secondary'
      }`}
    >
      {children}
    </button>
  )
}
