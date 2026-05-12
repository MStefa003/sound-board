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
  onFileDrop: (path: string) => void;
}

export default function SoundGrid({
  sounds, playingInstances, searchQuery, existingCategories,
  onPlay, onStop, onDelete, onEdit, onSetCategory, onAddSound, onFileDrop,
}: SoundGridProps) {
  const [dragOver, setDragOver] = useState(false);

  const filtered = searchQuery
    ? sounds.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sounds;

  const getInstanceId = (soundId: string) =>
    playingInstances.find(p => p.soundId === soundId)?.instanceId ?? null;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const audio = files.find(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac|opus|wma)$/i.test(f.name));
    if (audio) onFileDrop((audio as File & { path?: string }).path ?? '');
  }, [onFileDrop]);

  return (
    <div
      className={`flex-1 overflow-y-auto ${dragOver ? 'drag-over' : ''}`}
      style={{ background: '#0c0c0c', padding: '10px' }}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {sounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Music size={36} strokeWidth={1} style={{ color: '#2c2c2c' }} />
          <div className="flex flex-col items-center gap-1">
            <p style={{ fontSize: 13, fontWeight: 600, color: '#464646' }}>No sounds yet</p>
            <p style={{ fontSize: 12, color: '#2e2e2e' }}>Drag & drop an audio file or click Add Sound</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <p style={{ fontSize: 13, color: '#444' }}>No results for "{searchQuery}"</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))', gap: 7 }}>
          {filtered.map(s => (
            <SoundTile
              key={s.id}
              sound={s}
              playingInstanceId={getInstanceId(s.id)}
              existingCategories={existingCategories}
              onPlay={onPlay}
              onStop={onStop}
              onDelete={onDelete}
              onEdit={onEdit}
              onSetCategory={onSetCategory}
            />
          ))}
          {/* Add tile */}
          {!searchQuery && (
            <button
              onClick={onAddSound}
              className="flex flex-col items-center justify-center gap-1.5 transition-colors rounded-lg"
              style={{
                minHeight: 100,
                border: '1px dashed rgba(255,255,255,0.1)',
                background: 'transparent',
                color: '#404040',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
                (e.currentTarget as HTMLElement).style.color = '#666';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLElement).style.color = '#404040';
              }}
            >
              <Plus size={18} strokeWidth={1.5} />
              <span style={{ fontSize: 11 }}>Add Sound</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

