import type { PracticeStage } from '../types'

export type FuriganaDisplay = 'all' | 'saved' | 'none'

export interface PracticeStageConfig {
  value: PracticeStage
  label: string
  description: string
  furigana: FuriganaDisplay
  showRomaji: boolean
  showTranslation: boolean
  showKTV: boolean
}

export const PRACTICE_STAGES: readonly PracticeStageConfig[] = [
  {
    value: 1,
    label: '全辅助',
    description: '显示全部假名、Romaji 和中文，先把读音唱准。',
    furigana: 'all',
    showRomaji: true,
    showTranslation: true,
    showKTV: false,
  },
  {
    value: 2,
    label: '假名',
    description: '隐藏 Romaji，只看假名和中文练习日文读音。',
    furigana: 'all',
    showRomaji: false,
    showTranslation: true,
    showKTV: false,
  },
  {
    value: 3,
    label: '生词',
    description: '只给生词本中的词标假名，逐步减少读音依赖。',
    furigana: 'saved',
    showRomaji: false,
    showTranslation: true,
    showKTV: false,
  },
  {
    value: 4,
    label: '裸读',
    description: '关闭读音和翻译，只凭原文完成整句。',
    furigana: 'none',
    showRomaji: false,
    showTranslation: false,
    showKTV: false,
  },
  {
    value: 5,
    label: 'KTV',
    description: '显示原文和平假名注音，并按播放进度高亮跟唱。',
    furigana: 'all',
    showRomaji: false,
    showTranslation: false,
    showKTV: true,
  },
] as const

export function getPracticeStageConfig(stage: PracticeStage): PracticeStageConfig {
  return PRACTICE_STAGES.find((item) => item.value === stage) ?? PRACTICE_STAGES[0]
}
