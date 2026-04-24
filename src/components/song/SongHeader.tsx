interface SongHeaderProps {
  title: string
  artist: string
  albumArtUrl?: string
  album?: string
}

export function SongHeader({ title, artist, albumArtUrl, album }: SongHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {albumArtUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-30"
          style={{ backgroundImage: `url(${albumArtUrl})` }}
        />
      )}
      <div className="relative flex items-center gap-4 p-4">
        {albumArtUrl ? (
          <img src={albumArtUrl} alt={album ?? title} width={64} height={64} className="rounded-xl object-cover shadow-lg shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-surface-muted flex items-center justify-center text-2xl shrink-0 shadow-sm">🎵</div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text truncate">{title}</h2>
          <p className="text-text-secondary text-sm truncate">{artist}</p>
          {album && <p className="text-text-muted text-xs truncate mt-0.5">{album}</p>}
        </div>
      </div>
    </div>
  )
}
