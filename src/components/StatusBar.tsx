interface StatusBarProps {
  soundCount: number;
  playingCount: number;
  masterVolume: number;
  selectedDevices: string[];
  playMode?: 'both' | 'speakers' | 'mic';
}

export default function StatusBar({ soundCount, playingCount, masterVolume, selectedDevices, playMode = 'both' }: StatusBarProps) {
  const micRouting = selectedDevices.some(d => d.toLowerCase().includes('cable input'));
  const playModeLabel = playMode === 'speakers' ? 'Speakers only' : playMode === 'mic' ? 'Mic only' : null;

  return (
    <div
      className="flex items-center shrink-0"
      style={{
        height: 26,
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--border-dim)',
        padding: '0 12px',
        gap: 0,
        fontSize: 11.5,
        color: 'var(--text-3)',
      }}
    >
      {/* Playing indicator */}
      {playingCount > 0 && (
        <div className="flex items-center gap-1.5" style={{ marginRight: 14 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
          <span style={{ color: 'var(--green)', fontWeight: 500 }}>{playingCount} playing</span>
        </div>
      )}

      {/* Sound count */}
      <span>{soundCount} sound{soundCount !== 1 ? 's' : ''}</span>

      <span style={{ margin: '0 10px', color: 'var(--border)' }}>·</span>

      {/* Volume */}
      <span>vol {Math.round(masterVolume * 100)}%</span>

      {/* Mic routing badge */}
      {micRouting && (
        <>
          <span style={{ margin: '0 10px', color: 'var(--border)' }}>·</span>
          <span style={{ color: 'var(--green)', fontWeight: 500 }}>mic routing on</span>
        </>
      )}

      {/* Play mode badge */}
      {playModeLabel && (
        <>
          <span style={{ margin: '0 10px', color: 'var(--border)' }}>·</span>
          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{playModeLabel}</span>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Output devices */}
      <span
        className="truncate"
        style={{ maxWidth: 340, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}
        title={selectedDevices.join(', ')}
      >
        {selectedDevices.length > 0
          ? selectedDevices.join(' · ')
          : 'no output device — open settings'}
      </span>

      <span style={{ margin: '0 10px', color: 'var(--border-dim)' }}>·</span>
      <span style={{ fontSize: 10.5, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>v1.1.4</span>
    </div>
  );
}
