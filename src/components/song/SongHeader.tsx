interface SongHeaderProps {
  title: string
  artist: string
  albumArtUrl?: string
  album?: string
}

export function SongHeader({ title, artist, albumArtUrl, album }: SongHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-surface/72">
      {albumArtUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-20"
          style={{ backgroundImage: `url(${albumArtUrl})` }}
        />
      )}
      <div className="relative flex items-center gap-4 p-3">
        {albumArtUrl ? (
          <img src={albumArtUrl} alt={album ?? title} width={58} height={58} className="rounded-lg object-cover shadow-sm shrink-0" />
        ) : (
          <div className="w-[58px] h-[58px] rounded-lg bg-surface-muted flex items-center justify-center text-lg font-bold text-text-muted shrink-0 shadow-sm">音</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-accent">跟唱练习</p>
          <h2 className="text-lg font-bold text-text truncate">{title}</h2>
          <p className="text-text-secondary text-sm truncate">{artist}</p>
          {album && <p className="text-text-muted text-xs truncate mt-0.5">{album}</p>}
        </div>
      </div>
    </div>
  )
}
