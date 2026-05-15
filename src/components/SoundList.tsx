import React, { useState, useCallback, useRef } from 'react';
import { Sound, PlayingInstance, formatDuration, TILE_COLORS } from '../types';
import AssignCategoryModal from './AssignCategoryModal';

interface SoundListProps {
  sounds: Sound[];
  playingInstances: PlayingInstance[];
  pausedInstances: Set<string>;
  searchQuery: string;
  existingCategories: string[];
  onPlay: (sound: Sound) => void;
  onStop: (instanceId: string) => void;
  onPause: (instanceId: string) => void;
  onResume: (instanceId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (sound: Sound) => void;
  onSetCategory: (ids: string[], category: string | null) => void;
}

interface CtxMenu { x: number; y: number; sound: Sound }

export default function SoundList({
  sounds,
  playingInstances,
  pausedInstances,
  searchQuery,
  existingCategories,
  onPlay,
  onStop,
  onPause,
  onResume,
  onDelete,
  onEdit,
  onSetCategory,
}: SoundListProps) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryTargetIds, setCategoryTargetIds] = useState<string[]>([]);
  const ctxRef = useRef<HTMLDivElement>(null);
  const lastCheckedRef = useRef<string | null>(null);

  const filtered = sounds.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPlayingInstance = (soundId: string) =>
    playingInstances.find(p => p.soundId === soundId);

  const isPlaying = (soundId: string) => !!getPlayingInstance(soundId);
  const isPaused = (soundId: string) => {
    const inst = getPlayingInstance(soundId);
    return inst ? pausedInstances.has(inst.instanceId) : false;
  };

  const toggleCheck = useCallback((sound: Sound, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(sound.id)) next.delete(sound.id);
      else next.add(sound.id);
      return next;
    });
    lastCheckedRef.current = sound.id;
  }, []);

  const handleRowClick = useCallback((sound: Sound, e: React.MouseEvent) => {
    // Ctrl/Cmd+click = toggle selection
    if (e.ctrlKey || e.metaKey) {
      toggleCheck(sound, e);
      return;
    }
    // Shift+click = range select
    if (e.shiftKey && lastCheckedRef.current) {
      const ids = filtered.map(s => s.id);
      const a = ids.indexOf(lastCheckedRef.current);
      const b = ids.indexOf(sound.id);
      if (a !== -1 && b !== -1) {
        const range = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
        setCheckedIds(prev => new Set([...prev, ...range]));
      }
      return;
    }
    // Normal click = play/pause
    setFocusId(sound.id);
    const inst = getPlayingInstance(sound.id);
    if (!inst) {
      onPlay(sound);
    } else if (pausedInstances.has(inst.instanceId)) {
      onResume(inst.instanceId);
    } else {
      onPause(inst.instanceId);
    }
  }, [filtered, playingInstances, pausedInstances, onPlay, onPause, onResume, toggleCheck]);

  const handleRightClick = useCallback((e: React.MouseEvent, sound: Sound) => {
    e.preventDefault();
    // If clicking on an unchecked row and nothing else is selected, just single ctx
    if (!checkedIds.has(sound.id) && checkedIds.size === 0) {
      setFocusId(sound.id);
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, sound });
  }, [checkedIds]);

  const closeCtx = useCallback(() => setCtxMenu(null), []);

  const openCategoryModal = (ids: string[]) => {
    setCategoryTargetIds(ids);
    setShowCategoryModal(true);
    closeCtx();
  };

  const handleCtxPlay = () => {
    if (!ctxMenu) return;
    const inst = getPlayingInstance(ctxMenu.sound.id);
    if (inst) onStop(inst.instanceId);
    else onPlay(ctxMenu.sound);
    closeCtx();
  };

  const handleCtxEdit = () => {
    if (ctxMenu) { onEdit(ctxMenu.sound); closeCtx(); }
  };

  const handleCtxDelete = () => {
    if (ctxMenu) { onDelete(ctxMenu.sound.id); closeCtx(); }
  };

  const clearSelection = () => setCheckedIds(new Set());

  const deleteSelected = () => {
    checkedIds.forEach(id => onDelete(id));
    clearSelection();
  };

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3" style={{ color: 'var(--text-4)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 19V6l12-3v13"/>
          <circle cx="6" cy="19" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <span style={{ fontSize: 13 }}>
          {searchQuery ? 'No sounds match your search' : 'No sounds yet — add one with the + button'}
        </span>
      </div>
    );
  }

  const anyChecked = checkedIds.size > 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ position: 'relative' }}>
      <div
        className="flex-1 overflow-auto"
        style={{ background: 'var(--bg)' }}
        onClick={e => {
          closeCtx();
          // Click on empty area clears selection
          if ((e.target as HTMLElement).tagName === 'DIV') clearSelection();
        }}
      >
        <table className="sound-list-table w-full border-collapse">
          <thead>
            <tr>
              {/* Checkbox header */}
              <th style={{ width: 36, textAlign: 'center' }}>
                {anyChecked && (
                  <button
                    onClick={clearSelection}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 10, padding: 2 }}
                    title="Clear selection"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="1" width="14" height="14" rx="3" fill="rgba(79,142,247,0.2)" stroke="#4f8ef7" strokeWidth="1.5"/>
                      <path d="M4 8h8" stroke="#4f8ef7" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </th>
              <th style={{ width: 36, textAlign: 'right', paddingRight: 10 }}>#</th>
              <th style={{ textAlign: 'left', paddingLeft: 8 }}>Name</th>
              <th style={{ width: 90, textAlign: 'left', paddingLeft: 8, color: 'var(--text-4)' }}>Category</th>
              <th style={{ width: 66, textAlign: 'right', paddingRight: 12 }}>Duration</th>
              <th style={{ width: 100, textAlign: 'left', paddingLeft: 8 }}>Hotkey</th>
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((sound, idx) => {
              const playing = isPlaying(sound.id);
              const paused = isPaused(sound.id);
              const isFocused = focusId === sound.id;
              const isChecked = checkedIds.has(sound.id);
              const accentColor = TILE_COLORS[sound.color]?.bar ?? '#4f8ef7';

              return (
                <tr
                  key={sound.id}
                  className={`sound-list-row${playing ? ' playing' : ''}${isFocused && !anyChecked ? ' selected' : ''}${isChecked ? ' checked' : ''}`}
                  style={{ '--accent': accentColor, cursor: 'pointer' } as React.CSSProperties}
                  onClick={e => handleRowClick(sound, e)}
                  onContextMenu={e => handleRightClick(e, sound)}
                  onDoubleClick={() => onEdit(sound)}
                >
                  {/* Checkbox */}
                  <td style={{ width: 36, textAlign: 'center', paddingLeft: 4 }} onClick={e => toggleCheck(sound, e)}>
                    <span className={`row-checkbox${isChecked ? ' checked' : ''}`}>
                      {isChecked && (
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5 8.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  </td>

                  {/* Row number / play indicator */}
                  <td style={{ width: 36, textAlign: 'right', paddingRight: 10, color: 'var(--text-4)', fontSize: 11 }}>
                    {playing && !paused ? (
                      <span className="list-wave" style={{ '--accent': accentColor } as React.CSSProperties}>
                        <span /><span /><span />
                      </span>
                    ) : paused ? (
                      <span style={{ color: accentColor, fontSize: 10 }}>⏸</span>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </td>

                  {/* Name */}
                  <td style={{ paddingLeft: 8 }}>
                    <div className="flex items-center gap-2">
                      <span className="list-accent-dot" style={{ background: accentColor, opacity: playing ? 1 : 0.3 }} />
                      <span style={{ fontSize: 13, fontWeight: playing ? 500 : 400, color: playing ? 'var(--text-1)' : 'var(--text-2)' }}>
                        {sound.name}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ width: 90, paddingLeft: 8 }}>
                    {sound.category && (
                      <span style={{
                        fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 10, padding: '1px 7px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'block', maxWidth: 84,
                      }}>
                        {sound.category}
                      </span>
                    )}
                  </td>

                  {/* Duration */}
                  <td style={{ width: 66, textAlign: 'right', paddingRight: 12, color: 'var(--text-3)', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>
                    {sound.duration ? formatDuration(sound.duration) : '—'}
                  </td>

                  {/* Hotkey */}
                  <td style={{ width: 100, paddingLeft: 8 }}>
                    {sound.hotkey ? <span className="hotkey-badge-list">{sound.hotkey}</span> : null}
                  </td>

                  {/* Stop button */}
                  <td style={{ width: 36, textAlign: 'center' }}>
                    {playing && (
                      <button className="list-stop-btn" title="Stop"
                        onClick={e => { e.stopPropagation(); const inst = getPlayingInstance(sound.id); if (inst) onStop(inst.instanceId); }}
                      >■</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating selection bar */}
      {anyChecked && (
        <div className="selection-bar">
          <span className="selection-count">{checkedIds.size} selected</span>
          <div style={{ flex: 1 }} />
          <button
            className="sp-btn sp-btn-ghost selection-bar-btn"
            onClick={() => openCategoryModal(Array.from(checkedIds))}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            Set Category
          </button>
          <button
            className="sp-btn sp-btn-ghost selection-bar-btn danger"
            onClick={deleteSelected}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Delete
          </button>
          <button
            className="sp-btn sp-btn-ghost"
            style={{ width: 28, padding: 0, color: '#505050' }}
            onClick={clearSelection}
            title="Clear selection"
          >
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Context Menu */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {/* If multiple selected, show bulk actions */}
          {checkedIds.size > 1 && checkedIds.has(ctxMenu.sound.id) ? (
            <>
              <div style={{ padding: '5px 14px 4px', fontSize: 10.5, color: '#505050' }}>
                {checkedIds.size} sounds selected
              </div>
              <div className="ctx-sep" />
              <button onClick={() => openCategoryModal(Array.from(checkedIds))}>
                <span className="ctx-icon">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </span>
                Set Category
              </button>
              <div className="ctx-sep" />
              <button className="danger" onClick={() => { deleteSelected(); closeCtx(); }}>
                <span className="ctx-icon">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </span>
                Delete Selected
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCtxPlay}>
                <span className="ctx-icon">{isPlaying(ctxMenu.sound.id) ? <span style={{fontSize:9}}>■</span> : <span style={{fontSize:10}}>▶</span>}</span>
                {isPlaying(ctxMenu.sound.id) ? 'Stop' : 'Play'}
              </button>
              <button onClick={handleCtxEdit}>
                <span className="ctx-icon">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </span>
                Edit
              </button>
              <button onClick={() => openCategoryModal([ctxMenu.sound.id])}>
                <span className="ctx-icon">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </span>
                Set Category
              </button>
              <div className="ctx-sep" />
              <button className="danger" onClick={handleCtxDelete}>
                <span className="ctx-icon">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </span>
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Assign category modal */}
      {showCategoryModal && (
        <AssignCategoryModal
          existingCategories={existingCategories}
          soundCount={categoryTargetIds.length}
          onAssign={cat => {
            onSetCategory(categoryTargetIds, cat);
            setShowCategoryModal(false);
            clearSelection();
          }}
          onClose={() => setShowCategoryModal(false)}
        />
      )}
    </div>
  );
}
