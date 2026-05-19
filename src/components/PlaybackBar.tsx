import { useState, useRef, useCallback, useEffect } from 'react';
import { Sound, formatDuration, TILE_COLORS } from '../types';

interface PlaybackBarProps {
  currentSound: Sound | null;
  instanceId: string | null;
  positionSecs: number;
  isPaused: boolean;
  onSeek: (instanceId: string, secs: number) => void;
}

export default function PlaybackBar({ currentSound, instanceId, positionSecs, isPaused, onSeek }: PlaybackBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const [pendingSeekPos, setPendingSeekPos] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverProgress, setHoverProgress] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const active = !!currentSound && !!instanceId;
  const duration = currentSound?.duration ?? 0;

  // Clear pendingSeekPos once the backend position has caught up (within 1s)
  useEffect(() => {
    if (pendingSeekPos !== null && Math.abs(positionSecs - pendingSeekPos) < 1.0) {
      setPendingSeekPos(null);
    }
  }, [positionSecs, pendingSeekPos]);

  const displayPos = isDragging ? dragValue : pendingSeekPos ?? positionSecs;
  const progress = duration > 0 ? Math.min((displayPos / duration) * 100, 100) : 0;
  const accentColor = currentSound ? (TILE_COLORS[currentSound.color]?.bar ?? 'var(--accent)') : 'var(--accent)';

  const getRatio = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const r = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!active || !duration || isDragging) return;
    setHoverProgress(getRatio(e.clientX) * 100);
  }, [active, duration, isDragging, getRatio]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!active || !duration || !instanceId) return;
    e.preventDefault();
    setIsClicking(true);
    setIsDragging(true);
    const v = getRatio(e.clientX) * duration;
    setDragValue(v);

    const onMove = (me: MouseEvent) => {
      setDragValue(getRatio(me.clientX) * duration);
    };
    const onUp = (me: MouseEvent) => {
      const v2 = getRatio(me.clientX) * duration;
      setDragValue(v2);
      setPendingSeekPos(v2);  // hold position until backend confirms
      setIsDragging(false);
      setIsClicking(false);
      onSeek(instanceId, v2);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [active, duration, instanceId, getRatio, onSeek]);

  const trackH = isDragging ? 6 : isHovering ? 5 : 3;

  return (
    <div
      style={{
        height: 40,
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Color accent stripe */}
      <div style={{
        width: 3,
        alignSelf: 'stretch',
        background: active ? accentColor : 'var(--border-dim)',
        flexShrink: 0,
        transition: 'background 0.3s',
      }} />

      {/* Sound name + wave indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '0 12px',
        width: 200,
        flexShrink: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}>
        {active && !isPaused && (
          <span className="wave-bars" style={{ color: accentColor, flexShrink: 0, opacity: 0.9 }}>
            <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
          </span>
        )}
        {active && isPaused && (
          <span style={{ fontSize: 10, color: 'var(--text-4)', flexShrink: 0, lineHeight: 1 }}>βΈ</span>
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: active ? 500 : 400,
            color: active ? (isPaused ? 'var(--text-3)' : 'var(--text-1)') : 'var(--text-4)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'color 0.2s',
          }}
          title={currentSound?.name}
        >
          {currentSound?.name ?? 'Nothing playing'}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 14, background: 'var(--border-dim)', flexShrink: 0 }} />

      {/* Elapsed time */}
      <span
        style={{
          fontSize: 11,
          color: active ? 'var(--text-2)' : 'var(--text-4)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          padding: '0 10px',
          minWidth: 42,
          textAlign: 'right',
          transition: 'color 0.2s',
        }}
      >
        {active ? formatDuration(displayPos) : '--:--'}
      </span>

      {/* Seek hit area β€” full bar height for easy clicking */}
      <div
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => { if (!isDragging) setIsHovering(false); }}
        onMouseMove={handleMouseMove}
        style={{
          flex: 1,
          alignSelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
          cursor: active && duration > 0 ? 'pointer' : 'default',
          padding: '0 8px',
          position: 'relative',
        }}
      >
        {/* Visual track */}
        <div
          ref={trackRef}
          style={{
            flex: 1,
            height: trackH,
            background: 'var(--surface-3)',
            borderRadius: 3,
            position: 'relative',
            overflow: 'visible',
            transition: 'height 0.12s ease',
          }}
        >
          {/* Ghost hover indicator */}
          {isHovering && active && duration > 0 && !isDragging && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${hoverProgress}%`,
              background: `${accentColor}30`,
              borderRadius: 3,
              pointerEvents: 'none',
            }} />
          )}

          {/* Filled portion */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${progress}%`,
              background: active ? accentColor : 'var(--border)',
              borderRadius: 3,
              transition: isDragging ? 'none' : 'width 0.1s linear, background 0.3s',
              pointerEvents: 'none',
              boxShadow: isHovering && active ? `0 0 6px ${accentColor}66` : 'none',
            }}
          />

          {/* Thumb */}
          {(isHovering || isDragging) && active && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: `${progress}%`,
                transform: `translate(-50%, -50%) scale(${isClicking ? 1.3 : 1})`,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'var(--text-1)',
                boxShadow: isClicking
                  ? `0 0 0 4px ${accentColor}44, 0 2px 6px rgba(0,0,0,0.6)`
                  : `0 0 0 2px ${accentColor}55, 0 1px 4px rgba(0,0,0,0.5)`,
                transition: isDragging ? 'transform 0.08s ease, box-shadow 0.08s' : 'left 0.1s linear, transform 0.08s ease, box-shadow 0.08s',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* Total duration */}
      <span
        style={{
          fontSize: 11,
          color: active ? 'var(--text-3)' : 'var(--text-4)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          padding: '0 10px',
          minWidth: 42,
          transition: 'color 0.2s',
        }}
      >
        {active ? formatDuration(duration) : '--:--'}
      </span>
    </div>
  );
}
