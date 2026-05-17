import React from 'react';
import { Search, Plus, Square, Settings, Volume2, X, LayoutGrid, List, Mic, Speaker, Headphones, Download } from 'lucide-react';
import { ViewMode, PlayMode } from '../App';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddSound: () => void;
  onOpenDownload: () => void;
  onStopAll: () => void;
  onOpenSettings: () => void;
  playingCount: number;
  hasPlaying: boolean;
  masterVolume: number;
  onMasterVolumeChange: (v: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  playMode: PlayMode;
  onPlayModeChange: (m: PlayMode) => void;
}

const PLAY_MODE_OPTS: { value: PlayMode; title: string; icon: React.ReactNode }[] = [
  { value: 'both',     title: 'Both � speakers + mic', icon: <Headphones size={12} /> },
  { value: 'speakers', title: 'Speakers only',         icon: <Speaker size={12} /> },
  { value: 'mic',      title: 'Mic only',              icon: <Mic size={12} /> },
];

export default function Toolbar({
  searchQuery, onSearchChange, onAddSound, onStopAll, onOpenSettings,
  playingCount, hasPlaying, masterVolume, onMasterVolumeChange,
  viewMode, onViewModeChange, playMode, onPlayModeChange, onOpenDownload,
}: ToolbarProps) {
  const sep = (
    <div style={{ width: 1, height: 14, background: 'var(--border-dim)', flexShrink: 0, margin: '0 1px' }} />
  );

  return (
    <div
      className="flex items-center shrink-0"
      style={{
        height: 36,
        padding: '0 10px',
        gap: 5,
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border-dim)',
      }}
    >
      {/* Search */}
      <div className="relative" style={{ width: 200, flexShrink: 0 }}>
        <Search
          size={12}
          style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }}
        />
        <input
          className="sp-input"
          style={{ paddingLeft: 28, height: 26, fontSize: 12, borderRadius: 13 }}
          type="text"
          placeholder="Search sounds�"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0, display: 'flex' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-4)')}
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Stop all � only when playing */}
      {hasPlaying && (
        <button
          className="sp-btn sp-btn-danger"
          onClick={onStopAll}
          style={{ height: 26, padding: '0 9px', gap: 4, fontSize: 11.5, flexShrink: 0 }}
        >
          <Square size={8} fill="currentColor" />
          Stop
          {playingCount > 1 && (
            <span style={{ background: 'rgba(248,113,113,0.15)', color: '#fca5a5', borderRadius: 3, padding: '1px 4px', fontSize: 9.5, fontWeight: 700 }}>
              {playingCount}
            </span>
          )}
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Play mode � icon-only with tooltips */}
      <div className="flex items-center" style={{ gap: 1 }}>
        {PLAY_MODE_OPTS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onPlayModeChange(opt.value)}
            title={opt.title}
            style={{
              width: 28, height: 26,
              border: playMode === opt.value ? '1px solid rgba(79,142,247,0.4)' : '1px solid transparent',
              borderRadius: 5,
              background: playMode === opt.value ? 'var(--accent-dim)' : 'transparent',
              color: playMode === opt.value ? 'var(--accent)' : 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.1s',
            }}
            onMouseEnter={e => {
              if (playMode !== opt.value) {
                e.currentTarget.style.color = 'var(--text-2)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }
            }}
            onMouseLeave={e => {
              if (playMode !== opt.value) {
                e.currentTarget.style.color = 'var(--text-3)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {opt.icon}
          </button>
        ))}
      </div>

      {sep}

      {/* Volume */}
      <div className="flex items-center" style={{ gap: 6, width: 118 }}>
        <Volume2 size={10} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
        <input
          type="range" min="0" max="2" step="0.02"
          value={masterVolume}
          onChange={e => onMasterVolumeChange(parseFloat(e.target.value))}
          style={{ flex: 1 }}
          title={`Volume: ${Math.round(masterVolume * 100)}%`}
        />
        <span style={{ fontSize: 10, color: 'var(--text-3)', minWidth: 27, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(masterVolume * 100)}%
        </span>
      </div>

      {sep}

      {/* View mode */}
      <div className="flex items-center" style={{ gap: 1 }}>
        {([['list', <List size={13} />, 'List view'], ['grid', <LayoutGrid size={13} />, 'Grid view']] as const).map(([mode, icon, title]) => (
          <button
            key={mode}
            className="sp-btn sp-btn-ghost"
            onClick={() => onViewModeChange(mode)}
            title={title}
            style={{
              width: 28, height: 26, padding: 0,
              background: viewMode === mode ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: viewMode === mode ? 'var(--text-1)' : 'var(--text-4)',
            }}
          >
            {icon}
          </button>
        ))}
      </div>

      {sep}

      {/* Add Sound */}
      <button className="sp-btn sp-btn-accent" onClick={onAddSound} style={{ height: 26, gap: 5, fontSize: 12, flexShrink: 0 }}>
        <Plus size={12} />
        Add Sound
      </button>

      <button
        className="sp-btn sp-btn-ghost"
        onClick={onOpenDownload}
        title="Download audio from URL"
        style={{ width: 28, height: 26, padding: 0 }}
      >
        <Download size={13} />
      </button>

      <button
        className="sp-btn sp-btn-ghost"
        onClick={onOpenSettings}
        title="Settings"
        style={{ width: 28, height: 26, padding: 0 }}
      >
        <Settings size={13} />
      </button>
    </div>
  );
}

