import { useSyncExternalStore, useMemo } from 'react';
import { Html, Billboard, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { state, STATUS } from '../store';

// tiny subscription to the shared scroll value without re-rendering every frame
const tagsRoot = { get current() { return document.getElementById('tags'); } };
const subs = new Set();
let raf = 0;
function tick() { subs.forEach((f) => f()); raf = requestAnimationFrame(tick); }
const subscribe = (cb) => { subs.add(cb); if (!raf) raf = requestAnimationFrame(tick); return () => subs.delete(cb); };

/**
 * A HUD tag pinned to a 3D part: name + status word + coloured dot (never colour alone).
 * `ranges`: list of [from, to] scroll positions in which it is shown.
 */
export function Label({ name, status = () => 'SAFE', ranges, position = [0, 0, 0], align = 'up' }) {
  const snap = useSyncExternalStore(subscribe, () => {
    const t = state.t;
    const on = ranges.some(([a, b]) => t > a && t < b);
    return on ? status(t) : '';
  });
  const s = STATUS[snap];
  return (
    <Html position={position} center portal={tagsRoot} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`tag ${snap ? 'on' : ''} ${align}`} style={{ '--c': s ? s.color : '#34d399' }}>
        <span className="tag-line" />
        <span className="tag-box">
          <i />
          <b>{name}</b>
          <em>{s ? s.word : ''}</em>
        </span>
      </div>
    </Html>
  );
}

/** A ring that always faces the camera; dashed for "sensor issue". */
export function StatusRing({ radius = 0.3, color = '#34d399', dashed = false, visible = () => 1, pulse = false, ...props }) {
  const ref = useRef();
  const pts = useMemo(() => Array.from({ length: 97 }, (_, i) => { const a = (i / 96) * Math.PI * 2; return [Math.cos(a) * radius, Math.sin(a) * radius, 0]; }), [radius]);
  useFrame(({ clock }) => {
    const v = visible(state.t);
    const p = pulse ? 0.65 + 0.35 * Math.sin(clock.elapsedTime * 5) : 1;
    if (ref.current) {
      ref.current.material.opacity = v * p;
      ref.current.visible = v > 0.01;
      if (dashed) ref.current.material.dashOffset = -clock.elapsedTime * 0.15;
    }
  });
  return (
    <Billboard {...props}>
      <Line ref={ref} points={pts} color={color} lineWidth={2.2} transparent dashed={dashed} dashSize={0.06} gapSize={0.04} toneMapped={false} />
    </Billboard>
  );
}
