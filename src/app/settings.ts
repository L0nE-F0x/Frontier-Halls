import { PALETTES } from "../engine/palettes";

export type Settings = {
  palette: string;
  /** Backbuffer pixels per screen pixel. Higher is chunkier. */
  pixel: number;
  dither: number;
  grain: number;
  bloom: number;
  vignette: number;
  /** Simulated minutes per real second. */
  rate: number;
  quality: 0 | 1 | 2;
  motion: boolean;
  labels: boolean;
  stats: boolean;
};

export const DEFAULTS: Settings = {
  palette: PALETTES[0].id,
  pixel: 3,
  dither: 0.7,
  grain: 0.22,
  bloom: 0.6,
  vignette: 0.3,
  rate: 15,
  quality: 1,
  motion: true,
  labels: true,
  stats: false,
};

const KEY = "frontier-halls/settings/1";

export function loadSettings(): Settings {
  const reduced =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const base: Settings = { ...DEFAULTS, motion: !reduced, rate: reduced ? 0 : DEFAULTS.rate };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Settings>;
    return { ...base, ...saved };
  } catch {
    return base;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* private mode, or storage is full. The page works either way. */
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* as above */
  }
}
