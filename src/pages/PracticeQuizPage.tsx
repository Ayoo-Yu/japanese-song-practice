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
      <div className="page-shell p-6">
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (session.questions.length === 0) {
    return (
      <div className="page-shell p-6 text-center py-16">
        <p className="text-text-muted mb-4">这首歌没有足够的注音数据来出题</p>
        <Link to="/practice" className="inline-block px-6 py-2.5 bg-accent text-white rounded-xl font-medium">
          返回选择
        </Link>
      </div>
    )
  }

  const question = session.questions[session.currentIndex]

  if (isFinished) {
    const total = session.questions.length
    const pct = Math.round((session.correctCount / total) * 100)
    return (
      <div className="page-shell p-6 text-center py-12">
        <div className="mb-6 rounded-lg bg-surface/68 backdrop-blur-sm px-4 py-3">
          <h2 className="text-3xl font-bold text-text mb-2">练习完成!</h2>
        </div>
        <p className="text-5xl font-bold text-accent my-6">{pct}%</p>
        <p className="text-text-secondary mb-8">
          {session.correctCount} / {total} 正确
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/practice"
            className="px-6 py-2.5 bg-surface-alt text-text-secondary rounded-xl font-medium"
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
            className="px-6 py-2.5 bg-accent text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
          >
            再练一次
          </button>
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
    <div className="page-shell p-6">
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
        <QuizCorrection
          correctAnswer={correctAnswer}
          quizType={question.type}
          onSave={handleCorrection}
          onSkip={advance}
        />
      )}
    </div>
  )
}
