import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { state, smooth, misfire } from '../store';
import { castAlu, steel, alu, rubber, glow, darkMetal } from './materials';
import { Label, StatusRing } from './Label';

const CYL = [];
for (const cx of [-0.17, 0.17]) for (const side of [1, -1]) CYL.push({ cx, side });
const PHASE = [0, Math.PI, Math.PI * 1.5, Math.PI * 0.5];
export const MISFIRING = 2; // index of the faulty cylinder

/** Flat-four (boxer) piston engine. Opens up and turns see-through when the story zooms in. */
export default function Engine(props) {
  const pistons = useRef([]), rods = useRef([]), heads = useRef([]), sparks = useRef([]), groups = useRef([]);
  const crank = useRef();
  const barrelMats = useMemo(() => CYL.map(() => { const m = castAlu.clone(); m.transparent = true; return m; }), []);
  const headMats = useMemo(() => CYL.map(() => { const m = castAlu.clone(); m.emissive = new THREE.Color('#ff8a1f'); m.emissiveIntensity = 0; return m; }), []);
  const sparkMats = useMemo(() => CYL.map(() => glow('#9fdcff', 6)), []);
  const wires = useMemo(() => CYL.map(({ cx, side }) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(cx * 0.5, 0.26, 0), new THREE.Vector3(cx, 0.28, side * 0.25), new THREE.Vector3(cx, 0.14, side * 0.52),
  ]), 24, 0.012, 8)), []);
  const exhausts = useMemo(() => CYL.map(({ cx, side }) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(cx, -0.08, side * 0.47), new THREE.Vector3(cx, -0.24, side * 0.4), new THREE.Vector3(cx - 0.2, -0.3, side * 0.2), new THREE.Vector3(-0.55, -0.28, side * 0.12),
  ]), 32, 0.03, 12)), []);
  const exhaustMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a6a52', metalness: 1, roughness: 0.35 }), []);
  const wireMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b3261e', roughness: 0.5 }), []);
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

  useFrame(({ clock }) => {
    const t = state.t, time = clock.elapsedTime;
    const open = smooth(1.55, 1.95, t) * (1 - smooth(2.6, 2.95, t)); // cutaway while we look inside
    const mf = misfire(t);
    const a0 = time * 5.5;
    crank.current.rotation.x = a0;
    CYL.forEach(({ cx, side }, i) => {
      const a = a0 + PHASE[i];
      groups.current[i].position.z = side * open * 0.16; // cylinders slide outward
      barrelMats[i].opacity = 1 - open * 0.78;
      barrelMats[i].depthWrite = open < 0.2;
      const pz = side * (0.25 + 0.055 * Math.cos(a));
      pistons.current[i].position.set(cx, 0, pz);
      const pin = tmpA.set(cx, 0.045 * Math.sin(a), side * 0.045 * Math.cos(a));
      const p = pistons.current[i].position;
      rods.current[i].position.copy(tmpB.copy(pin).add(p).multiplyScalar(0.5));
      rods.current[i].scale.z = pin.distanceTo(p) / 0.2;
      rods.current[i].rotation.set(Math.atan2(pin.y - p.y, Math.abs(pin.z - p.z)) * side, 0, 0);
      // 4-stroke: each cylinder fires once every two turns, near the top of its stroke
      const cyc = a % (Math.PI * 4);
      let fire = Math.exp(-Math.pow(Math.min(cyc, Math.PI * 4 - cyc) * 3, 2));
      const turn = Math.floor(a / (Math.PI * 4));
      if (i === MISFIRING && mf > 0.3 && turn % 3 !== 0) fire = 0; // the misfire: sparks go missing
      sparkMats[i].opacity = fire;
      sparks.current[i].scale.setScalar(0.4 + fire);
      headMats[i].emissiveIntensity = i === MISFIRING ? mf * (0.12 + 0.16 * (0.5 + 0.5 * Math.sin(time * 6))) : 0;
    });
  });

  return (
    <group {...props}>
      {/* crankcase */}
      <RoundedBox args={[0.62, 0.3, 0.26]} radius={0.04} smoothness={4} material={castAlu} />
      <mesh ref={crank} rotation={[0, 0, Math.PI / 2]} position={[-0.6, 0, 0]} material={steel}>
        <cylinderGeometry args={[0.035, 0.035, 1.6, 16]} />
      </mesh>
      {/* ignition coils on top */}
      {[-0.15, 0.15].map((x) => (
        <RoundedBox key={x} args={[0.12, 0.08, 0.1]} radius={0.015} position={[x, 0.24, 0]} material={rubber} />
      ))}
      <mesh position={[0.36, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkMetal}><cylinderGeometry args={[0.14, 0.14, 0.05, 32]} /></mesh>
      {CYL.map(({ cx, side }, i) => (
        <group key={i} ref={(el) => (groups.current[i] = el)}>
          {/* barrel with cooling fins */}
          <mesh position={[cx, 0, side * 0.3]} rotation={[Math.PI / 2, 0, 0]} material={barrelMats[i]}>
            <cylinderGeometry args={[0.105, 0.105, 0.26, 32, 1, true]} />
          </mesh>
          {Array.from({ length: 7 }, (_, f) => (
            <mesh key={f} position={[cx, 0, side * (0.19 + f * 0.035)]} rotation={[Math.PI / 2, 0, 0]} material={barrelMats[i]}>
              <cylinderGeometry args={[0.145, 0.145, 0.01, 32]} />
            </mesh>
          ))}
          {/* head, spark plug */}
          <RoundedBox args={[0.24, 0.22, 0.1]} radius={0.025} position={[cx, 0, side * 0.47]} material={headMats[i]} />
          {Array.from({ length: 5 }, (_, f) => (
            <mesh key={'h' + f} position={[cx, -0.1 + f * 0.05, side * 0.47]} material={headMats[i]}><boxGeometry args={[0.28, 0.012, 0.13]} /></mesh>
          ))}
          <mesh position={[cx, 0.07, side * 0.545]} rotation={[Math.PI / 2, 0, 0]} material={alu}><cylinderGeometry args={[0.02, 0.02, 0.07, 12]} /></mesh>
          <mesh geometry={wires[i]} material={wireMat} />
          <mesh geometry={exhausts[i]} material={exhaustMat} />
          <mesh ref={(el) => (sparks.current[i] = el)} position={[cx, 0.02, side * 0.39]} material={sparkMats[i]}>
            <sphereGeometry args={[0.05, 16, 16]} />
          </mesh>
          <mesh ref={(el) => (pistons.current[i] = el)} rotation={[Math.PI / 2, 0, 0]} material={steel}>
            <cylinderGeometry args={[0.088, 0.088, 0.075, 28]} />
          </mesh>
          <mesh ref={(el) => (rods.current[i] = el)} material={alu}><boxGeometry args={[0.028, 0.03, 0.2]} /></mesh>
          {i === MISFIRING && (
            <>
              <StatusRing position={[cx, 0, side * 0.5]} radius={0.2} color="#fbbf24" dashed pulse visible={(t) => misfire(t) * (1 - smooth(2.55, 2.75, t))} />
              <Label name="Cylinder 2 · ignition" status={(t) => (misfire(t) > 0.5 ? 'CAUTION' : 'SAFE')} ranges={[[1.6, 2.6]]} position={[cx, -0.22, side * 0.5]} align="down" />
            </>
          )}
        </group>
      ))}
    </group>
  );
}
