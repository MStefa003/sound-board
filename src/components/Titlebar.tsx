import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState, useEffect } from "react";
import { SkipBack, SkipForward, Play, Pause } from "lucide-react";
import { Sound } from "../types";

const appWindow = getCurrentWindow();

const WaveIcon = () => (
  <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
    <rect x="0"    y="5"   width="2.5" height="1"  rx="0.5" fill="currentColor" opacity="0.3"/>
    <rect x="3.5"  y="3.5" width="2.5" height="4"  rx="1.25" fill="currentColor" opacity="0.5"/>
    <rect x="7"    y="0"   width="2.5" height="11" rx="1.25" fill="currentColor" opacity="0.85"/>
    <rect x="10.5" y="3.5" width="2.5" height="4"  rx="1.25" fill="currentColor" opacity="0.5"/>
    <rect x="14"   y="5"   width="2"   height="1"  rx="0.5" fill="currentColor" opacity="0.3"/>
  </svg>
);

const MinimizeIcon = () => (
  <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
    <rect width="10" height="1" rx="0.5" fill="currentColor"/>
  </svg>
);

const MaximizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="0.5" y="0.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1"/>
  </svg>
);

const RestoreIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect x="2.5" y="0.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1"/>
    <path d="M0.5 2.5v7a1 1 0 0 0 1 1h7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

interface TitlebarProps {
  hasPlaying: boolean;
  currentlyPlaying: Sound | null;
  isPaused: boolean;
  playingCount: number;
  onPrev: () => void;
  onPauseResume: () => void;
  onNext: () => void;
}

export default function Titlebar({
  hasPlaying, currentlyPlaying, isPaused, playingCount,
  onPrev, onPauseResume, onNext,
}: TitlebarProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setMaximized);
    const unlisten = appWindow.onResized(async () => {
      setMaximized(await appWindow.isMaximized());
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  const winControls = [
    { icon: <MinimizeIcon />, fn: () => appWindow.minimize(),                              isClose: false, title: "Minimize" },
    { icon: maximized ? <RestoreIcon /> : <MaximizeIcon />, fn: () => appWindow.toggleMaximize(), isClose: false, title: maximized ? "Restore" : "Maximize" },
    { icon: <CloseIcon />,   fn: () => appWindow.close(),                                  isClose: true,  title: "Close"    },
  ];

  const transBtnStyle = (off: boolean): React.CSSProperties => ({
    width: 26, height: 26, border: "none", outline: "none", borderRadius: 5,
    background: "transparent", cursor: off ? "default" : "pointer",
    color: off ? "var(--text-4)" : "var(--text-3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.1s, color 0.1s",
    opacity: off ? 0.35 : 1, flexShrink: 0,
  });

  return (
    <div
      data-tauri-drag-region
      className="flex items-center select-none shrink-0"
      style={{ height: 38, background: "var(--surface-1)", borderBottom: "1px solid var(--border-dim)" }}
    >
      {/* App identity — drag region */}
      <div
        data-tauri-drag-region
        className="flex items-center"
        style={{ gap: 7, padding: "0 13px 0 14px", flexShrink: 0 }}
      >
        <span style={{ color: "var(--accent)", lineHeight: 0 }}><WaveIcon /></span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.15em" }}>
          SOUNDPAD
        </span>
      </div>

      <div style={{ width: 1, height: 14, background: "var(--border-dim)", flexShrink: 0 }} />

      {/* Transport */}
      <div className="flex items-center" style={{ padding: "0 5px", gap: 0 }}>
        {[
          { icon: <SkipBack size={11} />,                              fn: onPrev,         title: "Previous"                    },
          { icon: isPaused ? <Play size={12} /> : <Pause size={12} />, fn: onPauseResume,  title: isPaused ? "Resume" : "Pause" },
          { icon: <SkipForward size={11} />,                           fn: onNext,         title: "Next"                        },
        ].map((btn, i) => (
          <button
            key={i}
            style={transBtnStyle(!hasPlaying)}
            title={btn.title}
            onClick={btn.fn}
            disabled={!hasPlaying}
            onMouseEnter={e => {
              if (hasPlaying) {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.color = "var(--text-1)";
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = !hasPlaying ? "var(--text-4)" : "var(--text-3)";
            }}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 14, background: "var(--border-dim)", flexShrink: 0 }} />

      {/* Now playing — drag region */}
      <div
        data-tauri-drag-region
        className="flex items-center"
        style={{ flex: 1, minWidth: 0, overflow: "hidden", gap: 7, padding: "0 12px" }}
      >
        {currentlyPlaying ? (
          <>
            {!isPaused ? (
              <span className="wave-bars" style={{ color: "var(--accent)", flexShrink: 0 }}>
                <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
              </span>
            ) : (
              <span style={{ fontSize: 10, color: "var(--text-4)", flexShrink: 0, lineHeight: 1 }}>⏸</span>
            )}
            <span style={{
              fontSize: 12, color: isPaused ? "var(--text-4)" : "var(--text-2)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {currentlyPlaying.name}
            </span>
            {playingCount > 1 && (
              <span style={{ fontSize: 10, color: "var(--text-4)", flexShrink: 0 }}>+{playingCount - 1}</span>
            )}
          </>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>Nothing playing</span>
        )}
      </div>

      {/* Window controls */}
      <div className="flex" style={{ height: "100%", flexShrink: 0 }}>
        {winControls.map((btn, i) => (
          <button
            key={i}
            onClick={btn.fn}
            title={btn.title}
            style={{
              width: 46, height: "100%",
              border: "none", outline: "none",
              background: "transparent", cursor: "pointer",
              color: "var(--text-4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.1s, color 0.1s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = btn.isClose ? "rgba(196,43,33,0.9)" : "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = btn.isClose ? "#fff" : "var(--text-1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-4)";
            }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

