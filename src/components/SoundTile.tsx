import { useEffect, useRef, useState } from "react";
import { Play, Square, Trash2, Edit2 } from "lucide-react";
import { Sound, TILE_COLORS, formatDuration } from "../types";
import AssignCategoryModal from "./AssignCategoryModal";

interface SoundTileProps {
  sound: Sound;
  playingInstanceId: string | null;
  existingCategories: string[];
  onPlay: (sound: Sound) => void;
  onStop: (instanceId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (sound: Sound) => void;
  onSetCategory: (ids: string[], category: string | null) => void;
}

export default function SoundTile({ sound, playingInstanceId, existingCategories, onPlay, onStop, onDelete, onEdit, onSetCategory }: SoundTileProps) {
  const isPlaying = playingInstanceId !== null;
  const accent = (TILE_COLORS[sound.color] ?? TILE_COLORS["grey"]).bar;
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [ctxMenu]);

  const toggle = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    isPlaying ? onStop(playingInstanceId!) : onPlay(sound);
  };

  return (
    <>
      <div
        className="group sound-tile relative flex flex-col cursor-pointer"
        style={{
          background: isPlaying ? "var(--surface-2)" : "var(--surface-1)",
          border: `1px solid ${isPlaying ? "var(--border)" : "var(--border-dim)"}`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: 10,
          minHeight: 90,
          transition: "background 0.12s, border-color 0.12s, box-shadow 0.18s, transform 0.14s",
          overflow: "hidden",
          boxShadow: isPlaying ? `0 0 0 1px ${accent}28, 0 4px 18px ${accent}18` : "none",
        }}
        onClick={toggle}
        onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = isPlaying ? "var(--surface-3)" : "var(--surface-2)";
          el.style.borderColor = "var(--border)";
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = isPlaying ? `0 0 0 1px ${accent}28, 0 8px 24px ${accent}22` : "0 4px 14px rgba(0,0,0,0.35)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = isPlaying ? "var(--surface-2)" : "var(--surface-1)";
          el.style.borderColor = isPlaying ? "var(--border)" : "var(--border-dim)";
          el.style.transform = "translateY(0)";
          el.style.boxShadow = isPlaying ? `0 0 0 1px ${accent}28, 0 4px 18px ${accent}18` : "none";
        }}
      >
        {isPlaying && (
          <div
            className="tile-playing-bar"
            style={{
              position: "absolute", top: 0, left: -3, right: 0, height: 3,
              background: accent, borderRadius: "0 2px 0 0",
            }}
          />
        )}

        <div style={{ padding: "10px 10px 9px 12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8 }}>
          <div className="flex items-start gap-2">
            <span style={{
              fontSize: 12.5, fontWeight: 600, lineHeight: 1.35,
              color: isPlaying ? "var(--text-1)" : "var(--text-2)",
              flex: 1,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              transition: "color 0.12s",
            }}>
              {sound.name}
            </span>
            {isPlaying && (
              <div className="wave-bars shrink-0" style={{ color: accent, marginTop: 2 }}>
                {[0, 1, 2, 3, 4].map(i => <div key={i} className="wave-bar" />)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 10, color: "var(--text-4)", fontVariantNumeric: "tabular-nums" }}>
              {formatDuration(sound.duration)}
            </span>
            {sound.hotkey && (
              <span style={{
                fontSize: 9, fontFamily: "monospace", fontWeight: 600,
                color: "var(--text-4)", background: "var(--surface-2)",
                border: "1px solid var(--border-dim)",
                borderRadius: 3, padding: "1px 4px",
              }}>
                {sound.hotkey}
              </span>
            )}
            {sound.category && (
              <span style={{
                fontSize: 9, color: "var(--text-4)",
                background: "var(--surface-3)",
                border: "1px solid var(--border-dim)",
                borderRadius: 3, padding: "1px 5px",
                maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {sound.category}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {isPlaying ? (
              <button
                title="Stop"
                onClick={e => { e.stopPropagation(); onStop(playingInstanceId!); }}
                style={{
                  width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                  background: "var(--danger-dim)", color: "var(--danger)", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.22)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
              >
                <Square size={8} fill="currentColor" />
              </button>
            ) : (
              <button
                title="Play"
                onClick={e => { e.stopPropagation(); onPlay(sound); }}
                className="opacity-0 group-hover:opacity-100"
                style={{
                  width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                  background: "rgba(255,255,255,0.05)", color: "var(--text-3)", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.1s, color 0.1s, opacity 0.12s",
                }}
                onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.12)"); (e.currentTarget.style.color = "var(--text-1)"); }}
                onMouseLeave={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.05)"); (e.currentTarget.style.color = "var(--text-3)"); }}
              >
                <Play size={8} fill="currentColor" />
              </button>
            )}
          </div>
        </div>
      </div>

      {ctxMenu && (
        <div
          ref={menuRef}
          className="ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
          {[
            { icon: <Edit2 size={11} />, label: "Edit", action: () => { onEdit(sound); setCtxMenu(null); } },
            {
              icon: isPlaying ? <Square size={11} /> : <Play size={11} />,
              label: isPlaying ? "Stop" : "Play",
              action: () => { isPlaying ? onStop(playingInstanceId!) : onPlay(sound); setCtxMenu(null); },
            },
          ].map((item, i) => (
            <button key={i} onClick={item.action}>
              <span className="ctx-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button onClick={() => { setCtxMenu(null); setShowCategoryModal(true); }}>
            <span className="ctx-icon">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
            </span>
            Set Category
          </button>
          <div className="ctx-sep" />
          <button className="danger" onClick={() => { onDelete(sound.id); setCtxMenu(null); }}>
            <span className="ctx-icon"><Trash2 size={11} /></span>
            Delete
          </button>
        </div>
      )}
      {showCategoryModal && (
        <AssignCategoryModal
          existingCategories={existingCategories}
          soundCount={1}
          onAssign={cat => { onSetCategory([sound.id], cat); setShowCategoryModal(false); }}
          onClose={() => setShowCategoryModal(false)}
        />
      )}
    </>
  );
}
