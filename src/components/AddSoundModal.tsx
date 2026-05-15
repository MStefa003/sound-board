import { useState, useEffect, useRef, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { X, Music, Keyboard } from 'lucide-react';
import { Sound, TILE_COLORS, COLOR_KEYS, DEFAULT_COLOR, formatDuration } from '../types';

interface AddSoundModalProps {
  onAdd: (data: Omit<Sound, 'id'>) => void;
  onClose: () => void;
  editingSound?: Sound | null;
  initialPath?: string;
  existingCategories?: string[];
}

export default function AddSoundModal({ onAdd, onClose, editingSound, initialPath, existingCategories = [] }: AddSoundModalProps) {
  const [name, setName] = useState(editingSound?.name ?? '');
  const [filePath, setFilePath] = useState(editingSound?.path ?? '');
  const [color, setColor] = useState(editingSound?.color ?? DEFAULT_COLOR);
  const [volume, setVolume] = useState(editingSound?.volume ?? 1);
  const [hotkey, setHotkey] = useState(editingSound?.hotkey ?? '');
  const [category, setCategory] = useState(editingSound?.category ?? '');
  const [duration, setDuration] = useState<number | null>(editingSound?.duration ?? null);
  const [recording, setRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  useEffect(() => {
    if (initialPath && !editingSound) applyFile(initialPath);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDuration = useCallback(async (path: string) => {
    try {
      const d = await invoke<number>('get_sound_duration', { path });
      setDuration(d);
    } catch { setDuration(null); }
  }, []);

  const applyFile = useCallback(async (path: string) => {
    setFilePath(path);
    const base = path.replace(/\\/g, '/').split('/').pop() ?? path;
    const autoName = base.replace(/\.[^.]+$/, '');
    if (!name) setName(autoName);
    await fetchDuration(path);
  }, [name, fetchDuration]);

  const pickFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma'] }],
    });
    if (selected && typeof selected === 'string') await applyFile(selected);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const audio = files.find(f => /\.(mp3|wav|ogg|flac|m4a|aac|opus|wma)$/i.test(f.name));
    if (audio) await applyFile((audio as File & { path?: string }).path ?? '');
  }, [applyFile]);

  const handleHotkey = (e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    const key = e.key;
    if (!['Control','Alt','Shift','Meta'].includes(key)) parts.push(key.toUpperCase());
    if (parts.length) { setHotkey(parts.join('+')); setRecording(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath || !name.trim()) return;
    onAdd({ name: name.trim(), path: filePath, color, volume, hotkey: hotkey || null, duration, category: category.trim() || null });
    onClose();
  };

  const fileName = filePath ? filePath.replace(/\\/g, '/').split('/').pop() : '';
  const accentColor = TILE_COLORS[color]?.bar ?? '#5b9cf6';

  return (
    <div
      className="modal-backdrop fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-content flex flex-col"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          width: 460,
          maxHeight: '92vh',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* Accent top bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}cc, transparent)`, transition: 'background 0.3s' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s, border-color 0.3s',
            }}>
              <Music size={13} style={{ color: accentColor, transition: 'color 0.3s' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
              {editingSound ? 'Edit Sound' : 'Add Sound'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md transition-colors"
            style={{ width: 26, height: 26, color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.07)'); (e.currentTarget.style.color = 'var(--text-1)'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-3)'); }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 overflow-y-auto">

          {/* File drop zone */}
          <div className="flex flex-col gap-1.5">
            <span className="sp-label">File</span>
            {filePath ? (
              <div
                className="flex items-center gap-3"
                style={{
                  padding: '10px 14px', borderRadius: 9,
                  background: `${accentColor}0d`,
                  border: `1px solid ${accentColor}28`,
                  transition: 'all 0.3s',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${accentColor}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Music size={14} style={{ color: accentColor }} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span style={{ fontSize: 12.5, color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fileName}
                  </span>
                  {duration && (
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{formatDuration(duration)}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFilePath(''); setDuration(null); }}
                  style={{ color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-4)')}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={pickFile}
                className="flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                style={{
                  padding: '22px 16px', borderRadius: 9,
                  border: dragOver ? `1.5px solid ${accentColor}80` : '1.5px dashed var(--border)',
                  background: dragOver ? `${accentColor}0a` : 'transparent',
                  minHeight: 88,
                }}
                onMouseEnter={e => { if (!dragOver) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (!dragOver) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Music size={16} style={{ color: 'var(--text-3)' }} />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 500 }}>Drop audio file here</span>
                  <span style={{ fontSize: 11, color: 'var(--text-4)' }}>or click to browse</span>
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <span className="sp-label">Name</span>
            <input
              ref={nameRef}
              className="sp-input"
              type="text"
              placeholder="Sound name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <span className="sp-label">Tag Color</span>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_KEYS.map(c => (
                <button
                  key={c}
                  type="button"
                  title={TILE_COLORS[c].label}
                  onClick={() => setColor(c)}
                  style={{
                    width: 22, height: 22,
                    borderRadius: '50%',
                    background: TILE_COLORS[c].bar,
                    border: color === c ? '2.5px solid rgba(255,255,255,0.75)' : '2.5px solid transparent',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.12s, border-color 0.12s',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: color === c ? `0 0 0 1px ${TILE_COLORS[c].bar}60` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="sp-label">Volume</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: accentColor,
                background: `${accentColor}15`, border: `1px solid ${accentColor}25`,
                padding: '1px 7px', borderRadius: 10,
                transition: 'color 0.3s, background 0.3s',
              }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input type="range" min="0" max="2" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} />
          </div>

          {/* Category + Hotkey β€” two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <span className="sp-label">Category</span>
              <input
                className="sp-input"
                list="category-list"
                type="text"
                placeholder="e.g. Music, SFX"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ fontSize: 12 }}
              />
              {existingCategories.length > 0 && (
                <datalist id="category-list">
                  {existingCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              )}
            </div>

            {/* Hotkey */}
            <div className="flex flex-col gap-1.5">
              <span className="sp-label">Hotkey</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="sp-btn sp-btn-ghost"
                  onClick={() => setRecording(r => !r)}
                  onKeyDown={handleHotkey}
                  style={{
                    fontSize: 11, flex: 1,
                    height: 34, borderRadius: 7,
                    border: recording ? `1px solid ${accentColor}50` : '1px solid var(--border-dim)',
                    background: recording ? `${accentColor}10` : 'transparent',
                    color: recording ? accentColor : hotkey ? 'var(--text-2)' : 'var(--text-4)',
                    gap: 5,
                    transition: 'all 0.15s',
                  }}
                >
                  <Keyboard size={11} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {recording ? 'Press keysβ€¦' : (hotkey || 'Record')}
                  </span>
                </button>
                {hotkey && !recording && (
                  <button
                    type="button"
                    onClick={() => setHotkey('')}
                    style={{ color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: 16, lineHeight: 1 }}
                    title="Clear hotkey"
                  >Γ—</button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--border-dim)' }}>
            <button type="button" className="sp-btn sp-btn-ghost" onClick={onClose} style={{ fontSize: 12, height: 34 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!filePath || !name.trim()}
              style={{
                height: 34, padding: '0 18px', borderRadius: 7,
                background: (!filePath || !name.trim()) ? 'var(--surface-2)' : `${accentColor}22`,
                border: `1px solid ${(!filePath || !name.trim()) ? 'var(--border)' : `${accentColor}50`}`,
                color: (!filePath || !name.trim()) ? 'var(--text-4)' : accentColor,
                fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                cursor: (!filePath || !name.trim()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (filePath && name.trim()) { e.currentTarget.style.background = `${accentColor}35`; } }}
              onMouseLeave={e => { if (filePath && name.trim()) { e.currentTarget.style.background = `${accentColor}22`; } }}
            >
              {editingSound ? 'Save Changes' : 'Add Sound'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

