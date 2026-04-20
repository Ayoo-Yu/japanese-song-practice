interface SongHeaderProps {
  title: string
  artist: string
  albumArtUrl?: string
  album?: string
}

export function SongHeader({ title, artist, albumArtUrl, album }: SongHeaderProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-surface-alt rounded-2xl">
      {albumArtUrl ? (
        <img src={albumArtUrl} alt={album ?? title} width={72} height={72} className="rounded-xl object-cover" />
      ) : (
        <div className="w-[72px] h-[72px] rounded-xl bg-surface-muted flex items-center justify-center text-3xl shrink-0">🎵</div>
      )}
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-text truncate">{title}</h2>
        <p className="text-text-secondary text-sm truncate">{artist}</p>
        {album && <p className="text-text-muted text-xs truncate">{album}</p>}
      </div>
    </div>
  )
}
