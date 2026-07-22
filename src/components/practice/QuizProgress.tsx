interface QuizProgressProps {
  current: number
  total: number
  correct: number
  wrong: number
}

export function QuizProgress({ current, total, correct, wrong }: QuizProgressProps) {
  const pct = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="learning-panel space-y-3 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-accent">读音复习</p>
          <p className="mt-1 text-sm text-text-secondary">第 {current} 句 / 共 {total} 句</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-success/10 px-2 py-1 text-success">顺口 {correct}</span>
          <span className="rounded-full bg-danger/10 px-2 py-1 text-danger">再练 {wrong}</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
