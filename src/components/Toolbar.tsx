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
      style={{ background: '#101010', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Transport row */}
      <div
        className="flex items-center gap-2"
        style={{ height: 38, padding: '0 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* Prev / Pause / Next */}
        <div className="flex items-center gap-1">
          <button
            className="sp-btn sp-btn-ghost"
            onClick={onPrev}
            disabled={!hasPlaying}
            style={{ width: 28, padding: 0, opacity: hasPlaying ? 1 : 0.3 }}
            title="Previous"
          >
            <SkipBack size={12} />
          </button>
          <button
            className="sp-btn sp-btn-ghost"
            onClick={onPauseResume}
            disabled={!hasPlaying}
            style={{ width: 28, padding: 0, opacity: hasPlaying ? 1 : 0.3 }}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button
            className="sp-btn sp-btn-ghost"
            onClick={onNext}
            disabled={!hasPlaying}
            style={{ width: 28, padding: 0, opacity: hasPlaying ? 1 : 0.3 }}
            title="Next"
          >
            <SkipForward size={12} />
          </button>
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

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
                  fontSize: 11.5,
                  color: isPaused ? '#666' : '#aaa',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {isPaused ? '⏸ ' : ''}{currentlyPlaying.name}
              </span>
              {playingCount > 1 && (
                <span style={{ fontSize: 10, color: '#484848', flexShrink: 0 }}>+{playingCount - 1} more</span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 11, color: '#383838' }}>No sound playing</span>
          )}
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

        {/* Play mode */}
        <div className="flex items-center" style={{ gap: 1 }}>
          {PLAY_MODE_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onPlayModeChange(opt.value)}
              title={opt.title}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 24, padding: '0 7px',
                background: playMode === opt.value ? 'rgba(79,142,247,0.15)' : 'transparent',
                border: playMode === opt.value ? '1px solid rgba(79,142,247,0.35)' : '1px solid transparent',
                borderRadius: 5,
                color: playMode === opt.value ? '#4f8ef7' : '#505050',
                cursor: 'pointer', fontSize: 10.5, fontWeight: 500,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                if (playMode !== opt.value) (e.currentTarget as HTMLButtonElement).style.color = '#888';
              }}
              onMouseLeave={e => {
                if (playMode !== opt.value) (e.currentTarget as HTMLButtonElement).style.color = '#505050';
              }}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

        {/* Stop all */}
        {hasPlaying && (
          <button className="sp-btn sp-btn-danger" onClick={onStopAll} style={{ gap: 5 }}>
            <Square size={9} fill="currentColor" />
            Stop All
            <span style={{
              background: 'rgba(239,68,68,0.14)', color: '#fca5a5',
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
            style={{ color: '#404040' }}
          />
          <input
            className="sp-input"
            style={{ paddingLeft: 30, height: 28, fontSize: 12, borderRadius: 6 }}
            type="text"
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex"
              style={{ color: '#363636', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#787878')}
              onMouseLeave={e => (e.currentTarget.style.color = '#363636')}
            >
              <X size={10} />
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Volume */}
        <div className="flex items-center gap-2" style={{ width: 120 }}>
          <Volume2 size={11} style={{ color: '#363636', flexShrink: 0 }} />
          <input
            type="range" min="0" max="2" step="0.02"
            value={masterVolume}
            onChange={e => onMasterVolumeChange(parseFloat(e.target.value))}
            style={{ flex: 1 }}
            title={`Volume: ${Math.round(masterVolume * 100)}%`}
          />
          <span style={{ fontSize: 10, color: '#525252', minWidth: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(masterVolume * 100)}%
          </span>
        </div>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '0 2px' }} />

        {/* View toggle */}
        <div className="flex items-center" style={{ gap: 1 }}>
          <button
            className="sp-btn sp-btn-ghost"
            onClick={() => onViewModeChange('list')}
            title="List view"
            style={{
              width: 28, padding: 0,
              background: viewMode === 'list' ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: viewMode === 'list' ? '#b0b0b0' : '#484848',
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
              color: viewMode === 'grid' ? '#b0b0b0' : '#484848',
            }}
          >
            <LayoutGrid size={13} />
          </button>
        </div>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '0 2px' }} />

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
