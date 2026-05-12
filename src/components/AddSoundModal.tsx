import { useState, useEffect, useRef, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { X, FolderOpen, Keyboard } from 'lucide-react';
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

  // Apply dropped/initial path on mount
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

  return (
    <div
      className="modal-backdrop fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-content flex flex-col"
        style={{
          background: '#181818',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          width: 400,
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>
            {editingSound ? 'Edit Sound' : 'Add Sound'}
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded transition-colors"
            style={{ width: 26, height: 26, color: '#555', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.08)'); (e.currentTarget.style.color = '#aaa'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = '#555'); }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 overflow-y-auto">
          {/* File picker */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              File
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={pickFile}
              className="flex items-center gap-2.5 cursor-pointer transition-colors rounded-lg"
              style={{
                padding: '10px 12px',
                border: dragOver ? '1px solid rgba(255,255,255,0.3)' : '1px dashed rgba(255,255,255,0.12)',
                background: dragOver ? 'rgba(255,255,255,0.04)' : '#141414',
                borderRadius: 8,
                minHeight: 48,
              }}
              onMouseEnter={e => { if (!dragOver) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { if (!dragOver) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
            >
              <FolderOpen size={14} style={{ color: '#555', shrink: 0 } as React.CSSProperties} />
              <span style={{ fontSize: 12, color: fileName ? '#c8c8c8' : '#444' }}>
                {fileName || 'Click to browse or drag & drop an audio file'}
              </span>
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Name
            </label>
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
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tag Color
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_KEYS.map(c => (
                <button
                  key={c}
                  type="button"
                  title={TILE_COLORS[c].label}
                  onClick={() => setColor(c)}
                  className="rounded-full transition-all"
                  style={{
                    width: 20, height: 20,
                    background: TILE_COLORS[c].bar,
                    border: color === c ? '2px solid rgba(255,255,255,0.7)' : '2px solid transparent',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label style={{ fontSize: 11, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Volume
              </label>
              <span style={{ fontSize: 11, color: '#555' }}>{Math.round(volume * 100)}%</span>
            </div>
            <input type="range" min="0" max="2" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Category (optional)
            </label>
            <input
              className="sp-input"
              list="category-list"
              type="text"
              placeholder="e.g. Memes, Music, SFX"
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
            {existingCategories.length > 0 && (
              <datalist id="category-list">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            )}
          </div>

          {/* Hotkey */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Hotkey (optional)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="sp-btn sp-btn-ghost text-xs"
                onClick={() => setRecording(r => !r)}
                onKeyDown={handleHotkey}
                style={{ fontSize: 11 }}
              >
                <Keyboard size={12} />
                {recording ? 'Press a key combo…' : (hotkey || 'Click to record')}
              </button>
              {hotkey && (
                <button
                  type="button"
                  onClick={() => setHotkey('')}
                  className="sp-btn sp-btn-ghost"
                  style={{ fontSize: 11 }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 11, color: '#404040' }}>
              {duration ? formatDuration(duration) : ''}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" className="sp-btn sp-btn-ghost" onClick={onClose} style={{ fontSize: 12 }}>
                Cancel
              </button>
              <button
                type="submit"
                className="sp-btn sp-btn-primary"
                disabled={!filePath || !name.trim()}
                style={{ fontSize: 12, opacity: (!filePath || !name.trim()) ? 0.4 : 1 }}
              >
                {editingSound ? 'Save Changes' : 'Add Sound'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

