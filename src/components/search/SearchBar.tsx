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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索日语歌名或歌手..."
        className="flex-1 px-4 py-3 rounded-xl bg-surface-alt border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="px-6 py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-light transition-colors"
      >
        {isLoading ? '...' : '搜索'}
      </button>
    </form>
  )
}
