import { create } from 'zustand'
import type { NeteaseSearchResult } from '../types'

interface SearchCacheState {
  query: string
  results: NeteaseSearchResult[]
  addedIds: Set<number>
  setCache: (query: string, results: NeteaseSearchResult[], addedIds: Set<number>) => void
  addId: (id: number) => void
  clear: () => void
}

export const useSearchCache = create<SearchCacheState>()((set) => ({
  query: '',
  results: [],
  addedIds: new Set<number>(),
  setCache: (query, results, addedIds) => set({ query, results, addedIds }),
  addId: (id) =>
    set((s) => {
      const next = new Set(s.addedIds)
      next.add(id)
      return { addedIds: next }
    }),
  clear: () => set({ query: '', results: [], addedIds: new Set() }),
}))
