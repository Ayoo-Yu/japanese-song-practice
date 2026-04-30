import { useState } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  defaultValue?: string
}

export function SearchBar({ onSearch, isLoading, defaultValue }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="learning-panel flex flex-col gap-2 p-2 sm:flex-row">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="歌名、歌手、动画名..."
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface-alt px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="rounded-lg bg-accent px-5 py-3 font-semibold text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isLoading ? '...' : '搜索'}
      </button>
    </form>
  )
}
