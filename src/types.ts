export interface Sound {
  id: string;
  name: string;
  path: string;
  hotkey: string | null;
  volume: number;
  color: string;
  duration: number | null;
  category: string | null;
}

export interface PlayingInstance {
  instanceId: string;
  soundId: string;
}

// Muted, professional accent colors — used only as the left border indicator
export const TILE_COLORS: Record<string, { bar: string; label: string }> = {
  grey:   { bar: '#555555', label: 'Grey' },
  blue:   { bar: '#3b82f6', label: 'Blue' },
  cyan:   { bar: '#06b6d4', label: 'Cyan' },
  green:  { bar: '#22c55e', label: 'Green' },
  yellow: { bar: '#eab308', label: 'Yellow' },
  orange: { bar: '#f97316', label: 'Orange' },
  red:    { bar: '#ef4444', label: 'Red' },
  purple: { bar: '#a855f7', label: 'Purple' },
};

export const COLOR_KEYS = Object.keys(TILE_COLORS);
export const DEFAULT_COLOR = 'grey';

export function randomColor(): string {
  return 'grey';
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
