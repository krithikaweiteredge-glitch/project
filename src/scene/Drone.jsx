import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { state, smooth, explode, hatch, fixed, radioStatus, engineStatus, sensorStatus, sensorDrift, radioDamage } from '../store';
import { bladeGeometry } from './geometry';
import { buildHull, MODEL_URL } from './hull';
import * as M from './materials';
import Engine from './Engine';
import Radio from './Radio';
import { Label, StatusRing } from './Label';

/**
 * Every part has an assembled position (`base`) and an exploded offset (`off`).
 * Exported so the camera knows where each part floats.
 */
export const PARTS = {
  noseSkin: { base: [0, 0, 0], off: [2.1, 0.25, 0] },
  midUpper: { base: [0, 0, 0], off: [0, 2.35, 0] },
  midLower: { base: [0, 0, 0], off: [0, -2.25, 0] },
  rearUpper: { base: [0, 0, 0], off: [-0.4, 1.95, 0] },
  rearLower: { base: [0, 0, 0], off: [-0.4, -1.8, 0] },
  wing: { base: [0.3, 0.66, 0], off: [0, 3.2, 0] },
  tail: { base: [-2.95, 0.35, 0], off: [-1.2, 1.5, 0] },
  prop: { base: [-4.2, 0, 0], off: [-1.6, 0, 0] },
  engine: { base: [-2.75, 0, 0], off: [-0.6, 0.85, 0] },
  oil: { base: [0, 0, 0], off: [0.55, -1.15, 1.35] },
  fuel: { base: [0.25, -0.05, 0], off: [0, -1.05, -0.2] },
  chute: { base: [-1.25, 0.42, 0], off: [0.1, 1.05, -0.7] },
  radio: { base: [1.95, -0.02, 0], off: [0.3, 1.1, 1.0] },
  computer: { base: [2.75, -0.05, 0], off: [0.55, 0.75, -0.95] },
  gps: { base: [2.65, 0.73, 0], off: [0.3, 1.75, -0.2] },
  airdata: { base: [4.6, 0.02, 0], off: [1.25, 0.25, 0] },
  gimbal: { base: [3.35, -0.58, 0], off: [0.65, -1.2, 0.45] },
  antenna: { base: [1.45, -0.7, 0], off: [0, -1.55, 0.65] },
};
export const exploded = (k) => PARTS[k].base.map((b, i) => b + PARTS[k].off[i]);

const v3 = new THREE.Vector3();
function Part({ k, children, extra, seed = 0, inside = false }) {
  const ref = useRef();
  const { base, off } = PARTS[k];
  useFrame(({ clock }) => {
    const t = state.t, e = explode(t), time = clock.elapsedTime;
    v3.set(base[0] + off[0] * e, base[1] + off[1] * e, base[2] + off[2] * e);
    // drifting gently while apart: the floating look
    v3.y += Math.sin(time * 0.8 + seed * 1.7) * 0.06 * e;
    v3.x += Math.cos(time * 0.6 + seed) * 0.03 * e;
    if (extra) extra(v3, t, ref.current);
    ref.current.position.copy(v3);
    ref.current.rotation.z = Math.sin(time * 0.5 + seed) * 0.04 * e;
    // systems sit inside the real hull: only drawn once it opens (or for the radio swap)
    if (inside) ref.current.visible = e > 0.01 || (inside === 'hatch' && hatch(t) > 0.01);
  });
  return <group ref={ref}>{children}</group>;
}

// explode the hero's skin, and lift the avionics hatch for the repair
const lift = (v, t) => { const h = hatch(t); v.y += h * 1.9; v.z -= h * 1.4; };

const INSIDE = [[0.75, 5.6]]; // labels shown while exploded
export default function Drone() {
  const geo = useMemo(() => ({
    blade: bladeGeometry(),
    oilLine: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.55, -0.15, 0.1), new THREE.Vector3(-2.25, -0.35, 0.22), new THREE.Vector3(-1.95, -0.38, 0.32),
      new THREE.Vector3(-1.7, -0.3, 0.38), new THREE.Vector3(-1.55, -0.1, 0.3), new THREE.Vector3(-1.85, 0.05, 0.15), new THREE.Vector3(-2.4, 0.08, 0.1)]), 120, 0.022, 12),
    fuelLine: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.6, -0.2, 0.15), new THREE.Vector3(-1.4, -0.3, 0.18), new THREE.Vector3(-2.0, -0.15, 0.1)]), 40, 0.018, 8),
    propBlade: (() => { const g = new THREE.CylinderGeometry(0.06, 0.03, 1.25, 12); g.scale(1, 1, 0.3); g.translate(0, 0.66, 0); return g; })(),
  }), []);
  const { scene: model } = useGLTF(MODEL_URL);
  const hull = useMemo(() => buildHull(model), [model]);
  const prop = useRef(), gimbal = useRef(), oldRadio = useRef(), newRadio = useRef(), rings = useRef([]);
  const ringMats = useMemo(() => Array.from({ length: 5 }, () => M.glow('#67e8f9', 2.5)), []);
  const oilDots = useRef([]);
  const oilDotMat = useMemo(() => M.glow('#ffb547', 3), []);
  const oilCurve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.55, -0.15, 0.1), new THREE.Vector3(-2.25, -0.35, 0.22), new THREE.Vector3(-1.95, -0.38, 0.32),
    new THREE.Vector3(-1.7, -0.3, 0.38), new THREE.Vector3(-1.55, -0.1, 0.3), new THREE.Vector3(-1.85, 0.05, 0.15), new THREE.Vector3(-2.4, 0.08, 0.1)]), []);
  const sensorMat = useMemo(() => { const m = M.brass.clone(); m.emissive = new THREE.Color('#fbbf24'); m.emissiveIntensity = 0; return m; }, []);

  useFrame(({ clock }) => {
    const t = state.t, time = clock.elapsedTime;
    prop.current.rotation.x = time * 24;
    gimbal.current.rotation.y = Math.sin(time * 0.4) * 0.7;
    // radio waves from the antenna: shorter and redder as the transmitter wears out
    const vis = smooth(2.45, 2.75, t) * (1 - smooth(3.55, 3.85, t)) + smooth(7.25, 7.5, t) * (1 - smooth(7.75, 8.0, t));
    const dmg = fixed(t) > 0.5 ? 0 : smooth(2.75, 3.3, t);
    rings.current.forEach((r, i) => {
      const u = (time * 0.45 + i / 5) % 1;
      const s = 0.15 + u * (2.6 - dmg * 1.9);
      r.scale.set(s, s, s);
      ringMats[i].opacity = vis * (1 - u) * (1 - u) * (1 - dmg * 0.55);
      ringMats[i].color.set(dmg > 0.6 ? '#f87171' : '#67e8f9').multiplyScalar(2.5);
    });
    // radio swap during the repair
    const out = smooth(6.8, 7.05, t), inn = smooth(7.05, 7.3, t);
    oldRadio.current.position.set(0, out * 1.9, out * 0.6);
    oldRadio.current.visible = out < 0.98;
    newRadio.current.position.set(0, (1 - inn) * 1.9, (1 - inn) * 0.6);
    newRadio.current.visible = out > 0.5;
    // oil flowing through the line
    oilDots.current.forEach((d, i) => d && d.position.copy(oilCurve.getPoint((i / 24 + time * 0.12) % 1)));
    oilDotMat.opacity = smooth(3.4, 3.7, t) * (1 - smooth(4.6, 4.9, t));
    sensorMat.emissiveIntensity = sensorDrift(t) * (0.3 + 0.3 * Math.sin(time * 4));
  });

  return (
    <group>
      {/* ---------- skin: the real model, cut into pieces ---------- */}
      {[['noseSkin', 1], ['midUpper', 2, lift], ['midLower', 3], ['rearUpper', 4], ['rearLower', 5], ['wing', 6], ['tail', 7]].map(([k, seed, extra]) => (
        <Part key={k} k={k} seed={seed} extra={extra}>
          {/* hull pieces are already in aircraft coordinates: undo the part's base position */}
          <group position={PARTS[k].base.map((v) => -v)}>
            {(hull[k] || []).map((m, i) => <mesh key={i} geometry={m.geometry} material={m.material} castShadow />)}
          </group>
        </Part>
      ))}
      <Part k="prop" seed={8}>
        <group position={hull.propHub ? hull.propHub.map((v, i) => v - PARTS.prop.base[i]) : [0, 0, 0]}>
          <group ref={prop}>
            {(hull.prop || []).map((m, i) => <mesh key={i} geometry={m.geometry} material={m.material} />)}
          </group>
        </group>
      </Part>

      {/* ---------- systems inside ---------- */}
      <Part k="engine" seed={9} inside>
        <Engine />
        <Label name="Piston engine" status={engineStatus} ranges={[...INSIDE]} position={[0, 0.55, 0]} />
      </Part>

      <Part k="oil" seed={10} inside>
        <mesh geometry={geo.oilLine} material={M.steel} />
        <group position={[-2.18, -0.35, 0.22]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={M.alu}><cylinderGeometry args={[0.085, 0.085, 0.15, 28]} /></mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0.09, 0, 0]} material={M.darkMetal}><cylinderGeometry args={[0.11, 0.11, 0.03, 6]} /></mesh>
          <StatusRing radius={0.22} color="#34d399" visible={(t) => smooth(3.7, 3.9, t) * (1 - smooth(4.6, 4.8, t))} />
          <Label name="Oil pump" ranges={[[3.7, 4.6]]} position={[0, -0.3, 0]} align="down" />
        </group>
        <group position={[-1.72, -0.36, 0.38]}>
          <mesh material={sensorMat}><cylinderGeometry args={[0.045, 0.045, 0.06, 6]} /></mesh>
          <mesh position={[0, 0.07, 0]} material={M.rubber}><cylinderGeometry args={[0.035, 0.035, 0.08, 16]} /></mesh>
          <mesh position={[0, 0.2, 0]} material={M.rubber}><cylinderGeometry args={[0.008, 0.008, 0.2, 8]} /></mesh>
          <StatusRing radius={0.16} color="#fbbf24" dashed pulse visible={(t) => sensorDrift(t) * (1 - smooth(4.6, 4.8, t))} />
          <Label name="Oil-pressure sensor" status={sensorStatus} ranges={[[3.7, 4.6]]} position={[0, 0.25, 0]} />
        </group>
        {Array.from({ length: 24 }, (_, i) => (
          <mesh key={i} ref={(el) => (oilDots.current[i] = el)} material={oilDotMat}><sphereGeometry args={[0.012, 8, 8]} /></mesh>
        ))}
      </Part>

      <Part k="fuel" seed={11} inside>
        <mesh rotation={[0, 0, Math.PI / 2]} material={M.fuelTankMat}><capsuleGeometry args={[0.4, 1.1, 12, 40]} /></mesh>
        {[-0.35, 0.35].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={M.rubber}><torusGeometry args={[0.41, 0.015, 8, 48]} /></mesh>
        ))}
        <mesh position={[0.1, 0.42, 0]} material={M.alu}><cylinderGeometry args={[0.06, 0.06, 0.05, 24]} /></mesh>
        <mesh geometry={geo.fuelLine} position={[-0.25, 0.05, 0]} material={M.copper} />
        <Label name="Fuel system" ranges={INSIDE} position={[0, 0.6, 0]} />
      </Part>

      <Part k="chute" seed={12} inside>
        <mesh material={M.chuteMat}><cylinderGeometry args={[0.22, 0.22, 0.36, 40]} /></mesh>
        <mesh position={[0, 0.2, 0]} material={M.alu}><cylinderGeometry args={[0.235, 0.235, 0.04, 40]} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M.rubber}><torusGeometry args={[0.222, 0.012, 8, 48]} /></mesh>
        <Label name="Recovery parachute" ranges={INSIDE} position={[0, 0.4, 0]} />
      </Part>

      <Part k="radio" seed={13} inside="hatch">
        <group ref={oldRadio}><Radio /></group>
        <group ref={newRadio} visible={false}><Radio fresh /></group>
        <StatusRing radius={0.42} color="#34d399" visible={(t) => smooth(7.2, 7.35, t) * (1 - smooth(7.7, 7.9, t))} />
        <Label name="Datalink radio" status={radioStatus} ranges={[...INSIDE, [6.9, 7.8]]} position={[0, 0.3, 0]} />
      </Part>

      <Part k="computer" seed={14} inside>
        <RoundedBox args={[0.4, 0.15, 0.36]} radius={0.02} material={M.composite} />
        <mesh position={[0, -0.09, 0]} material={M.pcb}><boxGeometry args={[0.42, 0.015, 0.38]} /></mesh>
        <Label name="Flight computer" ranges={[[0.75, 2.4]]} position={[0, 0.25, 0]} />
      </Part>

      <Part k="gps" seed={15} inside>
        <mesh material={M.alu}><cylinderGeometry args={[0.16, 0.18, 0.06, 40]} /></mesh>
        <mesh position={[0, 0.02, 0]} material={M.radome}><sphereGeometry args={[0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <Label name="GPS receiver" ranges={INSIDE} position={[0, 0.3, 0]} />
      </Part>

      <Part k="airdata" seed={16} inside>
        <mesh rotation={[0, 0, Math.PI / 2]} material={M.steel}><cylinderGeometry args={[0.018, 0.024, 0.85, 16]} /></mesh>
        <RoundedBox args={[0.24, 0.12, 0.2]} radius={0.02} position={[-1.2, 0.03, 0]} material={M.darkMetal} />
        <Label name="Air-data probe" ranges={INSIDE} position={[0, 0.2, 0]} />
      </Part>

      <Part k="gimbal" seed={17} inside>
        <mesh position={[0, 0.2, 0]} material={M.darkMetal}><cylinderGeometry args={[0.1, 0.12, 0.12, 32]} /></mesh>
        <group ref={gimbal}>
          <mesh material={M.radome}><sphereGeometry args={[0.24, 48, 32]} /></mesh>
          <mesh position={[0.2, -0.02, 0]} rotation={[0, Math.PI / 2, 0]} material={M.glass}><circleGeometry args={[0.1, 40]} /></mesh>
          <mesh position={[0.205, -0.02, 0]} rotation={[0, Math.PI / 2, 0]} material={M.alu}><torusGeometry args={[0.1, 0.01, 8, 40]} /></mesh>
        </group>
        <Label name="Camera gimbal" ranges={INSIDE} position={[0, -0.4, 0]} align="down" />
      </Part>

      <Part k="antenna" seed={18} inside>
        <mesh geometry={geo.blade} material={M.composite} />
        <mesh position={[-0.15, 0.01, 0]} material={M.darkMetal}><boxGeometry args={[0.36, 0.02, 0.08]} /></mesh>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} ref={(el) => (rings.current[i] = el)} position={[-0.16, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={ringMats[i]}>
            <torusGeometry args={[1, 0.012, 8, 96]} />
          </mesh>
        ))}
        <Label name="Datalink antenna" status={radioStatus} ranges={[[2.5, 3.6]]} position={[-0.15, -0.6, 0]} align="down" />
      </Part>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
export { radioDamage };
