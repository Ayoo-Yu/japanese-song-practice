import type { PracticeStage } from '../../types'

interface StageSelectorProps {
  currentStage: PracticeStage
  onStageChange: (stage: PracticeStage) => void
}

const stages: { value: PracticeStage; label: string }[] = [
  { value: 1, label: '全注音' },
  { value: 2, label: '假名' },
  { value: 3, label: '生词' },
  { value: 4, label: '无注音' },
  { value: 5, label: 'KTV' },
]

export function StageSelector({ currentStage, onStageChange }: StageSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {stages.map((stage) => (
        <button
          key={stage.value}
          onClick={() => onStageChange(stage.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            currentStage === stage.value
              ? 'bg-accent text-white'
              : 'bg-surface-alt text-text-secondary hover:bg-surface-muted'
          }`}
        >
          {stage.value}. {stage.label}
        </button>
      ))}
    </div>
  )
}
