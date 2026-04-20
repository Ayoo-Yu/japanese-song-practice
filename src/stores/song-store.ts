import { create } from 'zustand'
import type { Song } from '../types'

interface SongState {
  currentSong: Song | null
  songs: Song[]
  setCurrentSong: (song: Song | null) => void
  setSongs: (songs: Song[]) => void
  addSong: (song: Song) => void
}

export const useSongStore = create<SongState>()((set) => ({
  currentSong: null,
  songs: [],

  setCurrentSong: (song) => set({ currentSong: song }),
  setSongs: (songs) => set({ songs }),
  addSong: (song) => set((state) => ({ songs: [...state.songs, song] })),
}))
