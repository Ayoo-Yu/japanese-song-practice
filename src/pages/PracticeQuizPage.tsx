import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getAnnotatedSong } from '../services/lyrics-service'
import { buildQuizSession } from '../services/quiz-service'
import { updateLyrics, updateFuriganaToken } from '../services/song-service'
import { QuizCard } from '../components/practice/QuizCard'
import { QuizProgress } from '../components/practice/QuizProgress'
import { QuizCorrection } from '../components/practice/QuizCorrection'
import type { Song } from '../types'
import type { QuizSession, QuizType } from '../services/quiz-service'

function useQuizSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  return useCallback((text: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(`/api/tts?q=${encodeURIComponent(text)}&spd=2`)
    audioRef.current = audio
    audio.play().catch(() => {})
  }, [])
}

export function PracticeQuizPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const neteaseId = id ? parseInt(id, 10) : null
  const quizType = (searchParams.get('type') as QuizType) || 'romaji'

  const [song, setSong] = useState<Song | null>(null)
  const [session, setSession] = useState<QuizSession | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const speak = useQuizSpeech()

  useEffect(() => {
    if (!neteaseId || Number.isNaN(neteaseId)) return
    getAnnotatedSong(neteaseId).then((s) => {
      setSong(s)
      setSession(buildQuizSession(s, quizType))
      setIsLoading(false)
    })
  }, [neteaseId, quizType])

  if (isLoading || !song || !session) {
    return (
      <div className="page-shell px-4 py-6">
        <div className="learning-panel flex justify-center py-20">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (session.questions.length === 0) {
    return (
      <div className="page-shell px-4 py-6">
        <div className="learning-panel px-5 py-12 text-center">
          <p className="font-semibold text-text">这首歌还不能练读音</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-text-secondary">
            先打开歌曲生成注音或罗马音，再回来做复习。
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              to={`/song/${song.neteaseId}`}
              className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-white"
            >
              打开歌曲准备读音
            </Link>
            <Link
              to="/practice"
              className="rounded-lg bg-surface-alt px-6 py-2.5 font-semibold text-text-secondary"
            >
              返回选择
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const question = session.questions[session.currentIndex]

  if (isFinished) {
    const total = session.questions.length
    const pct = Math.round((session.correctCount / total) * 100)
    const summary = pct >= 85
      ? '很顺，下一次可以试着关掉一点读音辅助。'
      : pct >= 60
        ? '已经有感觉了，把不顺的几句再唱慢一点。'
        : '先不用急，保留假名和罗马音，跟着原曲多听几遍。'
    return (
      <div className="page-shell px-4 py-6">
        <div className="learning-panel px-5 py-8 text-center">
          <p className="text-xs font-semibold text-accent">练习总结</p>
          <h2 className="mt-2 text-3xl font-bold text-text">今天这轮完成了</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-text-secondary">{summary}</p>
          <p className="my-7 text-5xl font-bold text-accent">{pct}%</p>
          <p className="mb-8 text-text-secondary">
            顺口 {session.correctCount} 句 · 需要再练 {session.wrongCount} 句
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/practice"
              className="rounded-lg bg-surface-alt px-6 py-2.5 font-semibold text-text-secondary"
            >
              换首歌
            </Link>
            <button
              onClick={() => {
                setSession(buildQuizSession(song, quizType))
                setSelectedAnswer(null)
                setShowResult(false)
                setIsFinished(false)
              }}
              className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-white transition-transform active:scale-[0.98]"
            >
              再练一次
            </button>
            <Link
              to={`/song/${song.neteaseId}`}
              className="rounded-lg border border-border bg-surface px-6 py-2.5 font-semibold text-text-secondary"
            >
              回去跟唱
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index)
    setShowResult(true)

    const isCorrect = index === question.correctIndex
    setSession((prev) =>
      prev
        ? {
            ...prev,
            correctCount: prev.correctCount + (isCorrect ? 1 : 0),
            wrongCount: prev.wrongCount + (isCorrect ? 0 : 1),
          }
        : prev,
    )

    if (isCorrect) {
      setTimeout(() => advance(), 800)
    }
  }

  const advance = () => {
    setSession((prev) => {
      if (!prev) return prev
      const next = prev.currentIndex + 1
      if (next >= prev.questions.length) {
        setIsFinished(true)
        return prev
      }
      return { ...prev, currentIndex: next }
    })
    setSelectedAnswer(null)
    setShowResult(false)
  }

  const handleCorrection = async (value: string) => {
    if ((question.type === 'romaji' || question.type === 'pronunciation') && question.correctRomaji !== undefined) {
      const updated = await updateLyrics(song.neteaseId, [
        { timeMs: question.timeMs, romaji: value },
      ])
      if (updated) setSong(updated)
    } else if (
      question.type === 'furigana' &&
      question.tokenIndex !== undefined &&
      question.correctReading !== undefined
    ) {
      const updated = await updateFuriganaToken(
        song.neteaseId,
        question.lineIndex,
        question.tokenIndex,
        value,
      )
      if (updated) setSong(updated)
    } else if (question.type === 'translation' && question.correctTranslation !== undefined) {
      const updated = await updateLyrics(song.neteaseId, [
        { timeMs: question.timeMs, translation: value },
      ])
      if (updated) setSong(updated)
    }
    advance()
  }

  const correctAnswer =
    question.type === 'romaji' || question.type === 'pronunciation'
      ? question.correctRomaji ?? ''
      : question.type === 'furigana'
        ? question.correctReading ?? ''
        : question.correctTranslation ?? ''

  return (
    <div className="page-shell px-4 py-6">
      <div className="mb-4">
        <Link to={`/song/${song.neteaseId}`} className="text-sm font-semibold text-accent">
          回到跟唱
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-text">{getQuizTitle(quizType)}</h1>
        <p className="mt-1 text-sm text-text-secondary">{song.title} · {song.artist}</p>
      </div>
      <div className="mb-6">
        <QuizProgress
          current={session.currentIndex + 1}
          total={session.questions.length}
          correct={session.correctCount}
          wrong={session.wrongCount}
        />
      </div>

      <QuizCard
        question={question}
        selectedAnswer={selectedAnswer}
        showResult={showResult}
        onAnswer={handleAnswer}
        onSpeak={speak}
      />

      {showResult && selectedAnswer !== question.correctIndex && (
        <>
          <div className="mt-3 rounded-lg border border-border/70 bg-surface/82 px-4 py-3">
            <Link
              to={`/song/${song.neteaseId}?line=${question.lineIndex}`}
              className="text-sm font-semibold text-accent"
            >
              回到这一句跟唱
            </Link>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              跳回原歌词位置，开慢速循环会更适合练错题。
            </p>
          </div>
          <QuizCorrection
            correctAnswer={correctAnswer}
            quizType={question.type}
            onSave={handleCorrection}
            onSkip={advance}
          />
        </>
      )}
    </div>
  )
}

function getQuizTitle(type: QuizType): string {
  if (type === 'romaji') return '罗马音跟读'
  if (type === 'furigana') return '假名读法复习'
  if (type === 'pronunciation') return '听音选读法'
  return '歌词意思复习'
}
