import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listUserSongs } from '../services/song-service'
import type { Song } from '../types'
import type { QuizType } from '../services/quiz-service'

const quizModes: Array<{ type: QuizType; title: string; description: string }> = [
  { type: 'romaji', title: '罗马音跟读', description: '适合刚开始开口唱' },
  { type: 'furigana', title: '假名读法', description: '练汉字歌词怎么读' },
  { type: 'pronunciation', title: '听音辨读', description: '先听，再选顺口读法' },
  { type: 'translation', title: '歌词意思', description: '理解这一句在唱什么' },
]

export function PracticeSelectPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const quizType = (searchParams.get('type') as QuizType) || 'romaji'

  useEffect(() => {
    listUserSongs().then(setSongs)
  }, [])

  const practiceable = songs.filter(isPracticeReady)
  const preparingSongs = songs.filter((song) => !isPracticeReady(song))
  const activeMode = quizModes.find((mode) => mode.type === quizType) ?? quizModes[0]

  return (
    <div className="page-shell px-4 py-6">
      <section className="learning-panel mb-5 px-5 py-5">
        <p className="mb-1 text-xs font-semibold uppercase text-accent">Review practice</p>
        <h2 className="text-2xl font-bold text-text">选择今天要练什么</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          不用一次全会。先选一个目标，跟着歌曲里的真实句子慢慢复习。
        </p>
      </section>

      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        {quizModes.map((mode) => (
          <button
            key={mode.type}
            onClick={() => setSearchParams({ type: mode.type })}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              quizType === mode.type
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-surface-alt text-text'
            }`}
          >
            <p className="font-semibold">{mode.title}</p>
            <p className={`mt-1 text-xs ${quizType === mode.type ? 'text-white/80' : 'text-text-secondary'}`}>
              {mode.description}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">选择歌曲</p>
          <p className="text-xs text-text-secondary">{activeMode.description}</p>
        </div>
        <Link to="/search" className="text-sm font-semibold text-accent">添加歌曲</Link>
      </div>

      {practiceable.length === 0 ? (
        <div className="learning-panel px-5 py-12 text-center">
          <p className="font-semibold text-text">还没有可复习的歌曲</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-text-secondary">
            {preparingSongs.length > 0
              ? '你已经有歌曲了，先打开一首歌词，让系统生成读音辅助。'
              : '先添加歌曲并打开一次歌词，让系统生成读音辅助。'}
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            {preparingSongs[0] && (
              <Link
                to={`/song/${preparingSongs[0].neteaseId}`}
                className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-white"
              >
                准备最近歌曲
              </Link>
            )}
            <Link
              to="/search"
              className={`rounded-lg px-6 py-2.5 font-semibold ${
                preparingSongs[0]
                  ? 'bg-surface-alt text-text-secondary'
                  : 'bg-accent text-white'
              }`}
            >
              去找歌
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {practiceable.map((song) => (
            <Link
              key={song.id}
              to={`/practice/${song.neteaseId}?type=${quizType}`}
              className="learning-card flex items-center gap-4 p-4"
            >
              {song.albumArtUrl ? (
                <img
                  src={song.albumArtUrl}
                  alt={song.album ?? song.title}
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
                <div className="mb-1 flex flex-wrap gap-1">
                  {getPracticeTags(song).map((tag) => (
                    <span key={tag} className="rounded-full bg-accent-bg px-2 py-0.5 text-[11px] font-semibold text-accent">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="truncate font-semibold text-text">{song.title}</p>
                <p className="truncate text-sm text-text-secondary">{song.artist}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-accent">开始</span>
            </Link>
          ))}
        </div>
      )}
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

function getPracticeTags(song: Song): string[] {
  const tags: string[] = []
  if (Object.keys(song.romajiLines ?? {}).length > 0) tags.push('Romaji')
  if ((song.furiganaData?.length ?? 0) > 0) tags.push('假名')
  if (Object.keys(song.translationLines ?? {}).length > 0) tags.push('翻译')
  return tags.length > 0 ? tags : ['待准备']
}
