import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AppearanceSettings {
  backgroundImage: string | null
  overlayOpacity: number
  blurPx: number
  saturation: number
  brightness: number
}

interface UIState {
  appearance: AppearanceSettings
  setAppearance: (patch: Partial<AppearanceSettings>) => void
  resetAppearance: () => void
}

const defaultAppearance: AppearanceSettings = {
  backgroundImage: null,
  overlayOpacity: 0.42,
  blurPx: 0.5,
  saturation: 1,
  brightness: 1,
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      appearance: defaultAppearance,
      setAppearance: (patch) =>
        set((state) => ({
          appearance: { ...state.appearance, ...patch },
        })),
      resetAppearance: () => set({ appearance: defaultAppearance }),
    }),
    {
      name: 'jpsong_ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
