import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AppearanceSettings {
  backgroundImage: string | null
  overlayOpacity: number
  blurPx: number
  saturation: number
  brightness: number
  lyricsPanelColor: string
  lyricsPanelOpacity: number
  lyricsLineOpacity: number
  lyricsTextColor: string
  lyricsAccentColor: string
  lyricsSubtextColor: string
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
  lyricsPanelColor: '#0f172a',
  lyricsPanelOpacity: 0.8,
  lyricsLineOpacity: 0.12,
  lyricsTextColor: '#ffffff',
  lyricsAccentColor: '#67e8f9',
  lyricsSubtextColor: '#e5eefc',
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
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<UIState> | undefined
        return {
          ...currentState,
          ...typedState,
          appearance: {
            ...defaultAppearance,
            ...(typedState?.appearance ?? {}),
          },
        }
      },
    }
  )
)
