interface QuizProgressProps {
  current: number
  total: number
  correct: number
  wrong: number
}

export function QuizProgress({ current, total, correct, wrong }: QuizProgressProps) {
  const pct = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-muted">{current} / {total}</span>
        <span className="flex items-center gap-3">
          <span className="text-success">{correct} ✓</span>
          <span className="text-danger">{wrong} ✗</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
