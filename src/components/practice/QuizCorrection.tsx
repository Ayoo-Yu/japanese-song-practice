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
    <div className="mt-3 p-3 rounded-xl bg-warning/10 border border-warning/20 space-y-2">
      <p className="text-sm text-text-secondary">
        正确答案: <span className="font-medium text-text">{correctAnswer}</span>
      </p>
      <p className="text-xs text-text-muted">
        {quizType === 'romaji'
          ? '如果罗马音有误，修正后会同步到歌曲数据'
          : '如果假名注音有误，修正后会同步到歌曲数据'}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm outline-none focus:border-accent/50"
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !value.trim()}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {isSaving ? '...' : '修正'}
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2 rounded-lg bg-surface-alt text-text-secondary text-sm font-medium active:scale-[0.98] transition-transform"
        >
          跳过
        </button>
      </div>
    </div>
  )
}
