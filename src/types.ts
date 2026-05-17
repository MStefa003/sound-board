export interface Sound {
  id: string;
  name: string;
  path: string;
  hotkey: string | null;
  volume: number;
  color: string;
  duration: number | null;
  category: string | null;
  favorite?: boolean;
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

/**
 * Convert stored hotkey (Code format) to human-readable display.
 * e.g. "ctrl+KeyA" → "Ctrl+A", "KeyA" → "A", "Digit1" → "1"
 */
export function formatHotkeyDisplay(hk: string): string {
  return hk.split('+').map(part => {
    if (part.startsWith('Key')) return part.slice(3);    // "KeyA" → "A"
    if (part.startsWith('Digit')) return part.slice(5);  // "Digit1" → "1"
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(); // "ctrl" → "Ctrl"
  }).join('+');
}

/**
 * Normalize a hotkey string to the Code format expected by the global-hotkey crate.
 * Handles old-format hotkeys (e.g. "A" stored before the fix) by converting to "KeyA".
 */
export function normalizeHotkey(hk: string): string {
  return hk.split('+').map(part => {
    const lower = part.toLowerCase();
    if (['ctrl', 'alt', 'shift', 'super', 'meta', 'command'].includes(lower)) return lower;
    if (/^Key[A-Z]/.test(part) || /^Digit[0-9]/.test(part)) return part; // already correct
    if (/^[A-Za-z]$/.test(part)) return `Key${part.toUpperCase()}`;       // "A" → "KeyA"
    if (/^[0-9]$/.test(part)) return `Digit${part}`;                      // "1" → "Digit1"
    return part; // Space, Enter, Escape, F1, etc.
  }).join('+');
}
