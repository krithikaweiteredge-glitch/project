import { useSyncExternalStore } from 'react';

// Tiny hash router: #/  ·  #/fleet/drones  ·  #/vehicle/quadcopter  ·  #/story  ·  #/credits
const read = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
let cached = read(), key = cached.join('/');
const subscribe = (cb) => {
  const f = () => { const r = read(); if (r.join('/') !== key) { cached = r; key = r.join('/'); } cb(); };
  window.addEventListener('hashchange', f);
  return () => window.removeEventListener('hashchange', f);
};
export function useRoute() {
  const r = useSyncExternalStore(subscribe, () => cached);
  return [r[0] || 'home', r[1] || ''];
}
export const href = (...parts) => '#/' + parts.filter(Boolean).join('/');
