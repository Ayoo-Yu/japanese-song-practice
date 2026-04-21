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
  lyricsLineColor: string
  lyricsLineOpacity: number
  lyricsPrimaryTextColor: string
  lyricsFuriganaColor: string
  ktvHighlightColor: string
  lyricsSecondaryTextColor: string
  lyricsMutedTextColor: string
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
  lyricsPanelColor: '#131625',
  lyricsPanelOpacity: 0.68,
  lyricsLineColor: '#ffffff',
  lyricsLineOpacity: 0.08,
  lyricsPrimaryTextColor: '#ffffff',
  lyricsFuriganaColor: '#a29bfe',
  ktvHighlightColor: '#6c5ce7',
  lyricsSecondaryTextColor: '#eef1ff',
  lyricsMutedTextColor: '#d7dbf5',
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
