import { useSyncExternalStore } from 'react';

/**
 * One shared number drives everything: `t`, the scroll position measured in sections
 * (0 = hero, 1 = exploded view, ... SECTIONS-1 = closing).
 * The 3D scene writes it every frame; the HTML reads it through CSS (--t) or these hooks.
 */
export const SECTIONS = 10;
export const state = { t: 0 };
const subs = new Set();

export function setT(v) {
  state.t = v;
  document.documentElement.style.setProperty('--t', v.toFixed(4));
  subs.forEach((f) => f());
}
const subscribe = (cb) => { subs.add(cb); return () => subs.delete(cb); };

/** true once the scroll has passed `x` (re-renders only when that flips) */
export const useAfter = (x) => useSyncExternalStore(subscribe, () => state.t > x);
/** the current section number (rounded) */
export const useSection = () => useSyncExternalStore(subscribe, () => Math.min(SECTIONS - 1, Math.round(state.t)));
/** a value quantised to `step`, for numbers shown in the UI */
export const useStepped = (fn, step = 0.01) => useSyncExternalStore(subscribe, () => Math.round(fn(state.t) / step) * step);

// ---------- the story's timeline (all in section units) ----------
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** how far apart the aircraft is: 0 = assembled, 1 = exploded */
export const explode = (t) => smooth(0.45, 1.05, t) * (1 - smooth(5.45, 6.0, t));
/** the hatch over the avionics opens for the repair */
export const hatch = (t) => smooth(6.55, 6.85, t) * (1 - smooth(7.6, 7.85, t));
/** repairs done */
export const fixed = (t) => smooth(7.1, 7.35, t);
/** engine misfire (in-flight warning) */
export const misfire = (t) => smooth(1.7, 1.95, t) * (1 - fixed(t));
/** datalink transmitter damage: 0.25 -> 1.09 (limit = 1.0) */
export const radioDamage = (t) => 0.25 + smooth(2.75, 3.3, t) * 0.84;
/** oil-pressure sensor drifting */
export const sensorDrift = (t) => smooth(3.75, 4.2, t) * (1 - fixed(t));

export const STATUS = {
  SAFE: { word: 'SAFE', color: '#34d399' },
  CAUTION: { word: 'CAUTION', color: '#fbbf24' },
  NO_GO: { word: 'NO-GO', color: '#f87171' },
  SENSOR: { word: 'SENSOR ISSUE', color: '#fbbf24' },
  UNKNOWN: { word: 'NOT JUDGED YET', color: '#94a3b8' },
};
export const radioStatus = (t) => {
  if (fixed(t) > 0.5) return 'SAFE';
  const d = radioDamage(t);
  return d >= 1 ? 'NO_GO' : d > 0.6 ? 'CAUTION' : 'SAFE';
};
export const engineStatus = (t) => (misfire(t) > 0.5 ? 'CAUTION' : 'SAFE');
export const sensorStatus = (t) => (sensorDrift(t) > 0.5 ? 'SENSOR' : 'SAFE');

/** any primitive derived from t (string/number/boolean); re-renders only when it changes */
export const useValue = (fn) => useSyncExternalStore(subscribe, () => fn(state.t));
