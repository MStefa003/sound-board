import { useCallback, useState } from 'react';
import { Plus, Music } from 'lucide-react';
import { Sound, PlayingInstance } from '../types';
import SoundTile from './SoundTile';

interface SoundGridProps {
  sounds: Sound[];
  playingInstances: PlayingInstance[];
  searchQuery: string;
  existingCategories: string[];
  onPlay: (sound: Sound) => void;
  onStop: (instanceId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (sound: Sound) => void;
  onSetCategory: (ids: string[], category: string | null) => void;
  onAddSound: () => void;
  onFileDrop?: (path: string) => void;
  onReorder?: (sounds: Sound[]) => void;
  canReorder?: boolean;
  onToggleFavorite?: (id: string) => void;
  onShowInExplorer?: (sound: Sound) => void;
}

export default function SoundGrid({
  sounds, playingInstances, searchQuery, existingCategories,
  onPlay, onStop, onDelete, onEdit, onSetCategory, onAddSound,
  onReorder, canReorder, onToggleFavorite, onShowInExplorer,
}: SoundGridProps) {
  const [fileDragOver, setFileDragOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const filtered = searchQuery
    ? sounds.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sounds;

  const getInstanceId = (soundId: string) =>
    playingInstances.find(p => p.soundId === soundId)?.instanceId ?? null;

  // File-drop handlers (outer container)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) setFileDragOver(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFileDragOver(false);
    // Actual file handling is done by Tauri's onDragDropEvent in App.tsx
  }, []);

  // Tile drag-to-reorder handlers
  const handleTileDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleTileDragOver = (e: React.DragEvent, id: string) => {
    if (e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragId) setDragOverId(id);
  };

  const handleTileDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!fromId || fromId === targetId || !onReorder) return;
    const newOrder = [...sounds];
    const fromIdx = newOrder.findIndex(s => s.id === fromId);
    const toIdx = newOrder.findIndex(s => s.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    onReorder(newOrder);
  };

  const handleTileDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <div
      className={`flex-1 overflow-y-auto ${fileDragOver ? 'drag-over' : ''}`}
      style={{ background: 'var(--bg)', padding: '10px' }}
      onDragOver={handleDragOver}
      onDragLeave={() => setFileDragOver(false)}
      onDrop={handleDrop}
    >
      {sounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Music size={36} strokeWidth={1} style={{ color: 'var(--surface-3)' }} />
          <div className="flex flex-col items-center gap-1">
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>No sounds yet</p>
            <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Drag & drop an audio file or click Add Sound</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No results for "{searchQuery}"</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))', gap: 7 }}>
          {filtered.map(s => (
            <div
              key={s.id}
              draggable={canReorder}
              onDragStart={canReorder ? e => handleTileDragStart(e, s.id) : undefined}
              onDragOver={canReorder ? e => handleTileDragOver(e, s.id) : undefined}
              onDrop={canReorder ? e => handleTileDrop(e, s.id) : undefined}
              onDragEnd={canReorder ? handleTileDragEnd : undefined}
              style={{
                borderRadius: 10,
                opacity: dragId === s.id ? 0.35 : 1,
                outline: dragOverId === s.id ? '2px solid var(--accent)' : 'none',
                outlineOffset: 2,
                transition: 'opacity 0.12s',
                cursor: canReorder ? 'grab' : undefined,
              }}
            >
              <SoundTile
                sound={s}
                playingInstanceId={getInstanceId(s.id)}
                existingCategories={existingCategories}
                onPlay={onPlay}
                onStop={onStop}
                onDelete={onDelete}
                onEdit={onEdit}
                onSetCategory={onSetCategory}
                onToggleFavorite={onToggleFavorite}
                onShowInExplorer={onShowInExplorer}
              />
            </div>
          ))}
          {/* Ghost add-sound tile */}
          <div className="add-sound-tile" onClick={onAddSound} title="Add Sound">
            <Plus size={20} strokeWidth={1.5} style={{ color: 'var(--text-4)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>Add Sound</span>
          </div>
        </div>
      )}
    </div>
  );
}

