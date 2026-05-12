import React, { useState, useRef, useEffect } from 'react';
import { Sound } from '../types';

interface SidebarProps {
  sounds: Sound[];
  activeCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
}

interface CatCtxMenu { x: number; y: number; cat: string }

export default function Sidebar({
  sounds,
  activeCategory,
  onSelectCategory,
  onRenameCategory,
  onDeleteCategory,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [catCtxMenu, setCatCtxMenu] = useState<CatCtxMenu | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  const categories = Array.from(
    new Set(sounds.map(s => s.category).filter((c): c is string => !!c))
  ).sort();

  const countAll = sounds.length;
  const countFor = (cat: string) => sounds.filter(s => s.category === cat).length;
  const countUncategorized = sounds.filter(s => !s.category).length;

  useEffect(() => {
    if (renamingCat) renameInputRef.current?.focus();
  }, [renamingCat]);

  useEffect(() => {
    if (!catCtxMenu) return;
    const close = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCatCtxMenu(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [catCtxMenu]);

  const startRename = (cat: string) => {
    setRenamingCat(cat);
    setRenameValue(cat);
    setCatCtxMenu(null);
  };

  const commitRename = () => {
    if (!renamingCat) return;
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renamingCat) {
      onRenameCategory(renamingCat, trimmed);
      if (activeCategory === renamingCat) onSelectCategory(trimmed);
    }
    setRenamingCat(null);
  };

  const handleDeleteCategory = (cat: string) => {
    onDeleteCategory(cat);
    if (activeCategory === cat) onSelectCategory(null);
    setCatCtxMenu(null);
  };

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center py-2 gap-2"
        style={{ width: 28, background: '#0e0e0e', borderRight: '1px solid #1e1e1e', flexShrink: 0 }}
      >
        <button
          onClick={() => setCollapsed(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484848', padding: 4 }}
          title="Expand sidebar"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5V3z"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ width: 158, minWidth: 158, background: '#0e0e0e', borderRight: '1px solid #1e1e1e', flexShrink: 0, overflow: 'hidden' }}
      onClick={() => setCatCtxMenu(null)}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '8px 10px 6px', borderBottom: '1px solid #191919' }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: '#484848', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Categories
        </span>
        <button
          onClick={() => setCollapsed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#383838', padding: 2 }}
          title="Collapse sidebar"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M10 13L5 8l5-5v10z"/></svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto" style={{ padding: '4px 0' }}>

        {/* All Sounds */}
        <SidebarItem
          label="All Sounds"
          count={countAll}
          active={activeCategory === null}
          onClick={() => onSelectCategory(null)}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19V6l12-3v13"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          }
        />

        {categories.length > 0 && (
          <div style={{ height: 1, background: '#191919', margin: '4px 8px' }} />
        )}

        {/* Named categories */}
        {categories.map(cat => (
          renamingCat === cat ? (
            <div key={cat} style={{ padding: '3px 8px' }}>
              <input
                ref={renameInputRef}
                className="sp-input"
                style={{ height: 26, fontSize: 11.5, padding: '0 7px', borderRadius: 5 }}
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setRenamingCat(null);
                }}
                onBlur={commitRename}
              />
            </div>
          ) : (
            <SidebarItem
              key={cat}
              label={cat}
              count={countFor(cat)}
              active={activeCategory === cat}
              onClick={() => onSelectCategory(cat)}
              onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                setCatCtxMenu({ x: e.clientX, y: e.clientY, cat });
              }}
              onRename={() => startRename(cat)}
              onDelete={() => handleDeleteCategory(cat)}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              }
            />
          )
        ))}

        {/* Uncategorized */}
        {countUncategorized > 0 && categories.length > 0 && (
          <SidebarItem
            label="Uncategorized"
            count={countUncategorized}
            active={activeCategory === '__none__'}
            onClick={() => onSelectCategory('__none__')}
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9"/>
                <line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
              </svg>
            }
          />
        )}
      </div>

      {/* Category context menu */}
      {catCtxMenu && (
        <div
          ref={ctxRef}
          className="ctx-menu"
          style={{ top: catCtxMenu.y, left: catCtxMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => startRename(catCtxMenu.cat)}>
            <span className="ctx-icon">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </span>
            Rename
          </button>
          <div className="ctx-sep" />
          <button className="danger" onClick={() => handleDeleteCategory(catCtxMenu.cat)}>
            <span className="ctx-icon">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </span>
            Delete Category
          </button>
        </div>
      )}
    </div>
  );
}

interface SidebarItemProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onRename?: () => void;
  onDelete?: () => void;
  icon: React.ReactNode;
}

function SidebarItem({ label, count, active, onClick, onContextMenu, onRename, onDelete, icon }: SidebarItemProps) {
  const [hovered, setHovered] = useState(false);
  const isCategory = !!onRename;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: active ? '#1a1a1a' : hovered ? '#151515' : 'transparent',
        borderLeft: active ? '2px solid #4f8ef7' : '2px solid transparent',
        transition: 'background 0.1s',
        paddingRight: 4,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
    >
      <button
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          flex: 1, padding: '5px 10px 5px 8px',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ color: active ? '#4f8ef7' : '#484848', flexShrink: 0 }}>{icon}</span>
        <span style={{
          fontSize: 12, color: active ? '#d8d8d8' : '#888',
          fontWeight: active ? 500 : 400,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 10, color: '#484848', background: '#191919',
          borderRadius: 10, padding: '1px 5px', fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>
          {count}
        </span>
      </button>

      {/* Hover action icons for named categories */}
      {isCategory && hovered && (
        <div className="flex items-center gap-0.5" style={{ flexShrink: 0, paddingRight: 2 }}>
          <button
            onClick={e => { e.stopPropagation(); onRename?.(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484848', padding: '2px 3px', borderRadius: 3 }}
            title="Rename"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#909090'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484848'; }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete?.(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484848', padding: '2px 3px', borderRadius: 3 }}
            title="Delete category"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484848'; }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
