import { useState } from 'react'
import type { QuizType } from '../../services/quiz-service'

interface QuizCorrectionProps {
  correctAnswer: string
  quizType: QuizType
  onSave: (correctedValue: string) => void
  onSkip: () => void
}

export function QuizCorrection({ correctAnswer, quizType, onSave, onSkip }: QuizCorrectionProps) {
  const [value, setValue] = useState(correctAnswer)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!value.trim()) return
    setIsSaving(true)
    try {
      await onSave(value.trim())
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-warning/25 bg-warning/10 p-4">
      <p className="text-sm font-semibold text-text">
        这一句再练一次
      </p>
      <p className="text-sm text-text-secondary">
        参考答案：<span className="font-semibold text-text">{correctAnswer}</span>
      </p>
      <p className="text-xs leading-5 text-text-muted">
        {quizType === 'romaji' || quizType === 'pronunciation'
          ? '如果资料里的罗马音不准，可以顺手校正；不确定就直接继续。'
          : quizType === 'translation'
            ? '如果翻译不顺，可以改成你更好记的说法。'
            : '如果假名注音不准，可以顺手校正；不确定就直接继续。'}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent/50"
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !value.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? '...' : '校正'}
        </button>
        <button
          onClick={onSkip}
          className="rounded-lg bg-surface-alt px-4 py-2 text-sm font-semibold text-text-secondary transition-transform active:scale-[0.98]"
        >
          继续
        </button>
      </div>
    </div>
  )
}
