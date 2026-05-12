import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface AssignCategoryModalProps {
  existingCategories: string[];
  soundCount: number;
  onAssign: (category: string | null) => void;
  onClose: () => void;
}

export default function AssignCategoryModal({
  existingCategories,
  soundCount,
  onAssign,
  onClose,
}: AssignCategoryModalProps) {
  const [newCat, setNewCat] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCreate = () => {
    const name = newCat.trim();
    if (!name) return;
    onAssign(name);
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-content flex flex-col"
        style={{
          background: '#181818',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          width: 340,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>Assign Category</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              {soundCount} sound{soundCount !== 1 ? 's' : ''} selected
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#484848', width: 26, height: 26, borderRadius: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#aaa'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#484848'; }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-3" style={{ padding: '14px 16px 16px' }}>

          {/* Existing categories */}
          {existingCategories.length > 0 && (
            <div className="flex flex-col gap-1">
              <div style={{ fontSize: 10, fontWeight: 600, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                Existing Categories
              </div>
              <div className="flex flex-wrap gap-1.5">
                {existingCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => onAssign(cat)}
                    style={{
                      padding: '4px 10px',
                      background: '#1e1e1e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 20,
                      fontSize: 12,
                      color: '#aaa',
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,142,247,0.15)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(79,142,247,0.4)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#7ab4ff';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#1e1e1e';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#aaa';
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {existingCategories.length > 0 && (
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          )}

          {/* Create new */}
          <div className="flex flex-col gap-2">
            <div style={{ fontSize: 10, fontWeight: 600, color: '#484848', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {existingCategories.length > 0 ? 'Or Create New' : 'New Category'}
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                className="sp-input"
                style={{ flex: 1, height: 32, fontSize: 12, padding: '0 10px' }}
                type="text"
                placeholder="Category name…"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              />
              <button
                className="sp-btn sp-btn-accent"
                style={{ height: 32, fontSize: 12, padding: '0 14px', opacity: newCat.trim() ? 1 : 0.4 }}
                disabled={!newCat.trim()}
                onClick={handleCreate}
              >
                Create
              </button>
            </div>
          </div>

          {/* Remove from category */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
            <button
              onClick={() => onAssign(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11.5, color: '#555', padding: 0,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#888'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Remove from category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
