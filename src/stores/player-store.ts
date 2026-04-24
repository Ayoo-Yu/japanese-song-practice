import { create } from 'zustand'

interface PlayerState {
  currentTimeMs: number
  durationMs: number
  isPlaying: boolean
  volume: number
  vocalEnergy: number
  pendingSeekMs: number | null
  playRangeEnd: number | null
  playbackRate: number
  setCurrentTime: (ms: number) => void
  setDuration: (ms: number) => void
  setPlaying: (playing: boolean) => void
  setVolume: (vol: number) => void
  setVocalEnergy: (energy: number) => void
  setPendingSeek: (ms: number | null) => void
  setPlayRangeEnd: (ms: number | null) => void
  setPlaybackRate: (rate: number) => void
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  currentTimeMs: 0,
  durationMs: 0,
  isPlaying: false,
  volume: 0.8,
  vocalEnergy: 0,
  pendingSeekMs: null,
  playRangeEnd: null,
  playbackRate: 1,

  setCurrentTime: (ms) => set({ currentTimeMs: ms }),
  setDuration: (ms) => set({ durationMs: ms }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (vol) => set({ volume: vol }),
  setVocalEnergy: (energy) => set({ vocalEnergy: energy }),
  setPendingSeek: (ms) => set({ pendingSeekMs: ms }),
  setPlayRangeEnd: (ms) => set({ playRangeEnd: ms }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
}))
