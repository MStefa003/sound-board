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
        background: '#0a0a0a',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '0 12px',
        gap: 0,
        fontSize: 11,
        color: '#404040',
      }}
    >
      {/* Playing indicator */}
      {playingCount > 0 && (
        <div className="flex items-center gap-1.5" style={{ marginRight: 14 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3a8a5c', flexShrink: 0 }} />
          <span style={{ color: '#4a9a6c', fontWeight: 500 }}>{playingCount} playing</span>
        </div>
      )}

      {/* Sound count */}
      <span>{soundCount} sound{soundCount !== 1 ? 's' : ''}</span>

      <span style={{ margin: '0 10px', color: '#222' }}>·</span>

      {/* Volume */}
      <span>vol {Math.round(masterVolume * 100)}%</span>

      {/* Mic routing badge */}
      {micRouting && (
        <>
          <span style={{ margin: '0 10px', color: '#222' }}>·</span>
          <span style={{ color: '#3a8a5c', fontWeight: 500 }}>mic routing on</span>
        </>
      )}

      {/* Play mode badge */}
      {playModeLabel && (
        <>
          <span style={{ margin: '0 10px', color: '#222' }}>·</span>
          <span style={{ color: '#4f8ef7', fontWeight: 500 }}>{playModeLabel}</span>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Output devices */}
      <span
        className="truncate"
        style={{ maxWidth: 320, color: '#2e2e2e', fontVariantNumeric: 'tabular-nums' }}
        title={selectedDevices.join(', ')}
      >
        {selectedDevices.length > 0
          ? selectedDevices.join(' · ')
          : 'no output device — open settings'}
      </span>
    </div>
  );
}
