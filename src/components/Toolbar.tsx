import React from 'react';
import { Search, Plus, Square, Settings, Volume2, X, LayoutGrid, List, SkipBack, SkipForward, Pause, Play, Mic, Speaker, Headphones } from 'lucide-react';
import { ViewMode, PlayMode } from '../App';
import { Sound } from '../types';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddSound: () => void;
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
  currentlyPlaying: Sound | null;
  isPaused: boolean;
  onPauseResume: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const PLAY_MODE_OPTS: { value: PlayMode; label: string; title: string; icon: React.ReactNode }[] = [
  { value: 'both',     label: 'Both',     title: 'Play to speakers + mic',   icon: <Headphones size={11} /> },
  { value: 'speakers', label: 'Speakers', title: 'Play to speakers only',    icon: <Speaker size={11} /> },
  { value: 'mic',      label: 'Mic',      title: 'Play to mic only',         icon: <Mic size={11} /> },
];

export default function Toolbar({
  searchQuery, onSearchChange, onAddSound, onStopAll, onOpenSettings,
  playingCount, hasPlaying, masterVolume, onMasterVolumeChange,
  viewMode, onViewModeChange, playMode, onPlayModeChange,
  currentlyPlaying, isPaused, onPauseResume, onPrev, onNext,
}: ToolbarProps) {
  return (
    <div
      className="flex flex-col shrink-0"
      style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-dim)' }}
    >
      {/* Transport row */}
      <div
        className="flex items-center gap-2"
        style={{ height: 38, padding: '0 10px', borderBottom: '1px solid var(--border-dim)' }}
      >
        {/* Prev / Pause / Next */}
        <div className="flex items-center gap-0.5">
          <button
            className="sp-btn sp-btn-ghost"
            onClick={onPrev}
            disabled={!hasPlaying}
            style={{ width: 28, padding: 0 }}
            title="Previous"
          >
            <SkipBack size={12} />
          </button>
          <button
            className="sp-btn sp-btn-ghost"
            onClick={onPauseResume}
            disabled={!hasPlaying}
            style={{ width: 28, padding: 0 }}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button
            className="sp-btn sp-btn-ghost"
            onClick={onNext}
            disabled={!hasPlaying}
            style={{ width: 28, padding: 0 }}
            title="Next"
          >
            <SkipForward size={12} />
          </button>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border-dim)', flexShrink: 0 }} />

        {/* Now playing indicator */}
        <div className="flex items-center gap-2" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          {currentlyPlaying ? (
            <>
              {!isPaused && (
                <span className="wave-bars" style={{ flexShrink: 0 }}>
                  <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
                </span>
              )}
              <span
                style={{
                  fontSize: 12,
                  color: isPaused ? 'var(--text-4)' : 'var(--text-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {isPaused ? '? ' : ''}{currentlyPlaying.name}
              </span>
              {playingCount > 1 && (
                <span style={{ fontSize: 10.5, color: 'var(--text-4)', flexShrink: 0 }}>+{playingCount - 1}</span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 11.5, color: 'var(--text-4)' }}>Nothing playing</span>
          )}
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border-dim)', flexShrink: 0 }} />

        {/* Play mode */}
        <div className="flex items-center" style={{ gap: 2 }}>
          {PLAY_MODE_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onPlayModeChange(opt.value)}
              title={opt.title}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 24, padding: '0 8px',
                background: playMode === opt.value ? 'var(--accent-dim)' : 'transparent',
                border: playMode === opt.value ? '1px solid rgba(91,156,246,0.4)' : '1px solid transparent',
                borderRadius: 5,
                color: playMode === opt.value ? 'var(--accent)' : 'var(--text-3)',
                cursor: 'pointer', fontSize: 11, fontWeight: 500,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                if (playMode !== opt.value) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={e => {
                if (playMode !== opt.value) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border-dim)', flexShrink: 0 }} />

        {/* Stop all */}
        {hasPlaying && (
          <button className="sp-btn sp-btn-danger" onClick={onStopAll} style={{ gap: 5 }}>
            <Square size={9} fill="currentColor" />
            Stop
            <span style={{
              background: 'rgba(248,113,113,0.15)', color: '#fca5a5',
              borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 700,
            }}>
              {playingCount}
            </span>
          </button>
        )}
      </div>

      {/* Search + tools row */}
      <div
        className="flex items-center gap-2"
        style={{ height: 38, padding: '0 10px' }}
      >
        {/* Search */}
        <div className="relative" style={{ flex: 1, maxWidth: 260 }}>
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-4)' }}
          />
          <input
            className="sp-input"
            style={{ paddingLeft: 30, height: 28, fontSize: 12, borderRadius: 6 }}
            type="text"
            placeholder="Search sounds…"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex"
              style={{ color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-4)')}
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Volume */}
        <div className="flex items-center gap-2" style={{ width: 130 }}>
          <Volume2 size={11} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
          <input
            type="range" min="0" max="2" step="0.02"
            value={masterVolume}
            onChange={e => onMasterVolumeChange(parseFloat(e.target.value))}
            style={{ flex: 1 }}
            title={`Volume: ${Math.round(masterVolume * 100)}%`}
          />
          <span style={{ fontSize: 10.5, color: 'var(--text-3)', minWidth: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(masterVolume * 100)}%
          </span>
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--border-dim)', flexShrink: 0, margin: '0 2px' }} />

        {/* View toggle */}
        <div className="flex items-center" style={{ gap: 1 }}>
          <button
            className="sp-btn sp-btn-ghost"
            onClick={() => onViewModeChange('list')}
            title="List view"
            style={{
              width: 28, padding: 0,
              background: viewMode === 'list' ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: viewMode === 'list' ? 'var(--text-2)' : 'var(--text-4)',
            }}
          >
            <List size={13} />
          </button>
          <button
            className="sp-btn sp-btn-ghost"
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
            style={{
              width: 28, padding: 0,
              background: viewMode === 'grid' ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--text-2)' : 'var(--text-4)',
            }}
          >
            <LayoutGrid size={13} />
          </button>
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--border-dim)', flexShrink: 0, margin: '0 2px' }} />

        <button className="sp-btn sp-btn-accent" onClick={onAddSound} style={{ gap: 5 }}>
          <Plus size={13} />
          Add Sound
        </button>

        <button
          className="sp-btn sp-btn-ghost"
          onClick={onOpenSettings}
          style={{ width: 30, padding: 0 }}
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
