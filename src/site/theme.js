// Light / dark theme: remembered per browser, defaults to the system setting.
import { useSyncExternalStore } from 'react';

const KEY = 'ivhm-theme';
const subs = new Set();
function initial() {
  try { const t = localStorage.getItem(KEY); if (t === 'light' || t === 'dark') return t; } catch { /* storage blocked */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
let theme = initial();
const apply = () => { document.documentElement.dataset.theme = theme; };
apply();

export function setTheme(t) {
  theme = t; apply();
  try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ }
  subs.forEach((f) => f());
}
export const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
export const useTheme = () => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => theme);
