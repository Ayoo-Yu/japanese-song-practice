import type { PracticeStage } from '../../types'
import { getPracticeStageConfig, PRACTICE_STAGES } from '../../lib/practice-stages'

interface StageSelectorProps {
  currentStage: PracticeStage
  onStageChange: (stage: PracticeStage) => void
}

export function StageSelector({ currentStage, onStageChange }: StageSelectorProps) {
  const current = getPracticeStageConfig(currentStage)

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="练习模式">
        {PRACTICE_STAGES.map((stage) => (
          <button
            key={stage.value}
            type="button"
            aria-pressed={currentStage === stage.value}
            onClick={() => onStageChange(stage.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              currentStage === stage.value
                ? 'bg-accent text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-surface-muted'
            }`}
          >
            {stage.value}. {stage.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-text-secondary">{current.description}</p>
    </div>
  )
}
