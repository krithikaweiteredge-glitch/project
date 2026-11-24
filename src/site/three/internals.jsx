// Detailed, animated internal views of each kind of component, for the inspector's close-up.
// Built in code (no licensed models): cutaways that show the mechanism inside, with every internal piece
// labelled and tinted by the health IVHM gives it. Same approach as the 3D story's engine and radio.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// ---------- materials ----------
const M = {
  alu: () => new THREE.MeshStandardMaterial({ color: '#b9c0c9', metalness: 0.95, roughness: 0.22 }),
  steel: () => new THREE.MeshStandardMaterial({ color: '#d9dee5', metalness: 1, roughness: 0.14 }),
  cast: () => new THREE.MeshStandardMaterial({ color: '#8c939c', metalness: 0.85, roughness: 0.42 }),
  dark: () => new THREE.MeshStandardMaterial({ color: '#2b313a', metalness: 0.8, roughness: 0.38 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: '#121418', metalness: 0.1, roughness: 0.8 }),
  copper: () => new THREE.MeshStandardMaterial({ color: '#c87a45', metalness: 1, roughness: 0.3 }),
  brass: () => new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.3 }),
  titan: () => new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 1, roughness: 0.28 }),
  hot: () => new THREE.MeshStandardMaterial({ color: '#7a5a43', metalness: 1, roughness: 0.35 }),
  pcb: () => new THREE.MeshStandardMaterial({ color: '#0f5132', metalness: 0.3, roughness: 0.5 }),
  chip: () => new THREE.MeshStandardMaterial({ color: '#15181d', metalness: 0.4, roughness: 0.4 }),
  shell: () => new THREE.MeshPhysicalMaterial({ color: '#c9d0d8', metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: '#9fc2e0', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  fuel: () => new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.1, roughness: 0.2, emissive: '#6b4400', emissiveIntensity: 0.3, transparent: true, opacity: 0.85 }),
  cell: () => new THREE.MeshStandardMaterial({ color: '#2c5d8f', metalness: 0.6, roughness: 0.3 }),
  flame: () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8a3d').multiplyScalar(3), toneMapped: false, transparent: true }),
  led: (c = '#34d399') => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(4), toneMapped: false }),
};
/** a material for a monitored sub-part: tinted toward its health colour */
function useSub(kind, color) {
  return useMemo(() => {
    const m = M[kind]();
    if (color) { m.emissive = new THREE.Color(color); m.emissiveIntensity = 0.12; }
    return m;
  }, [kind, color]);
}
const ring = (n, f) => Array.from({ length: n }, (_, i) => f((i / n) * Math.PI * 2, i));

// ---------- the models (each ~2 units across, centred) ----------
// Every model gets `c(name)` = health colour of a sub-part (or null), and returns <group>.

function Turbofan({ c, shaft = false }) {
  const fan = useRef(), core = useRef(), lp = useRef(), flames = useRef([]);
  const fanM = useSub('titan', c('fan')), compM = useSub('titan', c('compressor')), turbM = useSub('hot', c('turbine'));
  const combM = useSub('cast', c('combustor')), brgM = useSub('steel', c('bearings')), oilM = useSub('brass', c('oil system'));
  const shell = useMemo(M.shell, []), flame = useMemo(M.flame, []), dark = useMemo(M.dark, []), steel = useMemo(M.steel, []);
  const blade = useMemo(() => new THREE.BoxGeometry(0.03, 0.34, 0.1), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (fan.current) fan.current.rotation.x = t * 6;
    if (core.current) core.current.rotation.x = t * 11;
    if (lp.current) lp.current.rotation.x = t * 6;
    flames.current.forEach((f, i) => { if (f) f.scale.setScalar(0.7 + 0.35 * Math.abs(Math.sin(t * 13 + i * 1.7))); });
    flame.opacity = 0.75 + 0.25 * Math.sin(t * 20);
  });
  const R = shaft ? 0.32 : 0.45;
  return (
    <group rotation={[0, 0, 0]}>
      {/* cut-away casing: the top half is open so the rotating stages show */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={shell}><cylinderGeometry args={[R + 0.06, R - 0.02, 2.1, 64, 1, true, Math.PI, Math.PI]} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} material={shell}><cylinderGeometry args={[R + 0.065, R - 0.015, 2.1, 64, 1, true, 0, Math.PI]} /></mesh>
      {[0.9, 0.3, -0.3, -0.9].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={dark}><torusGeometry args={[R + 0.05, 0.012, 8, 64]} /></mesh>)}
      {/* fan (or the power-turbine output for a turboshaft) */}
      <group ref={fan} position={[0.95, 0, 0]}>
        {!shaft && ring(22, (a, i) => <mesh key={i} geometry={blade} material={fanM} rotation={[a, 0.5, 0]} position={[0, Math.cos(a) * 0.22, Math.sin(a) * 0.22]} />)}
        <mesh rotation={[0, 0, -Math.PI / 2]} material={steel}><coneGeometry args={[0.12, 0.28, 32]} /></mesh>
      </group>
      {/* multi-stage compressor */}
      <group ref={core}>
        {[0, 1, 2, 3, 4, 5].map((s) => {
          const r = R * (0.78 - s * 0.06), x = 0.62 - s * 0.12;
          return (
            <group key={s} position={[x, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={compM}><cylinderGeometry args={[r * 0.45, r * 0.45, 0.05, 40]} /></mesh>
              {ring(18, (a, i) => <mesh key={i} material={compM} rotation={[a, 0.4, 0]} position={[0, Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72]}><boxGeometry args={[0.018, r * 0.55, 0.05]} /></mesh>)}
            </group>
          );
        })}
      </group>
      {/* combustor ring with flames */}
      <mesh position={[-0.2, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={combM}><torusGeometry args={[R * 0.6, 0.09, 20, 64]} /></mesh>
      {ring(10, (a, i) => <mesh key={i} ref={(el) => (flames.current[i] = el)} material={flame} position={[-0.2, Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6]}><sphereGeometry args={[0.05, 12, 12]} /></mesh>)}
      {/* turbine stages */}
      <group ref={lp}>
        {[0, 1, 2].map((s) => (
          <group key={s} position={[-0.48 - s * 0.13, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={turbM}><cylinderGeometry args={[R * 0.3, R * 0.3, 0.06, 40]} /></mesh>
            {ring(26, (a, i) => <mesh key={i} material={turbM} rotation={[a, -0.5, 0]} position={[0, Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5]}><boxGeometry args={[0.02, R * 0.38, 0.05]} /></mesh>)}
          </group>
        ))}
      </group>
      {/* shaft, bearings, oil */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={steel}><cylinderGeometry args={[0.035, 0.035, 2.0, 20]} /></mesh>
      {[0.78, -0.86].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={brgM}><torusGeometry args={[0.08, 0.025, 12, 32]} /></mesh>)}
      <RoundedBox args={[0.34, 0.18, 0.2]} radius={0.03} position={[0.15, -R - 0.18, 0]} material={oilM} />
      <mesh position={[-1.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={dark}><cylinderGeometry args={[R * 0.55, R * 0.75, 0.3, 48, 1, true]} /></mesh>
    </group>
  );
}
Turbofan.labels = (shaft) => [['fan', shaft ? 'Output shaft' : 'Fan', [0.95, 0.42, 0]], ['compressor', 'Compressor', [0.35, 0.5, 0]], ['combustor', 'Combustor', [-0.2, 0.42, 0]],
  ['turbine', 'Turbine', [-0.62, 0.32, 0]], ['bearings', 'Bearings', [0.78, -0.12, 0]], ['oil system', 'Oil system', [0.15, -0.72, 0]]];

function PistonEngine({ c }) {
  const crank = useRef(), pistons = useRef([]), sparks = useRef([]);
  const cylM = useSub('cast', c('cylinders')), crankM = useSub('steel', c('crankshaft')), ignM = useSub('rubber', c('ignition'));
  const steel = useMemo(M.steel, []), spark = useMemo(() => M.led('#9fdcff'), []), cast = useMemo(M.cast, []), shell = useMemo(M.shell, []);
  const CYL = [[-0.3, 1], [-0.3, -1], [0.3, 1], [0.3, -1]];
  useFrame(({ clock }) => {
    const a0 = clock.elapsedTime * 6;
    if (crank.current) crank.current.rotation.x = a0;
    CYL.forEach(([, side], i) => {
      const a = a0 + i * Math.PI / 2;
      if (pistons.current[i]) pistons.current[i].position.z = side * (0.42 + 0.08 * Math.cos(a));
      const fire = Math.exp(-Math.pow(((a % (Math.PI * 4)) - 0.2) * 3, 2));
      if (sparks.current[i]) sparks.current[i].scale.setScalar(0.3 + fire * 1.2);
    });
  });
  return (
    <group>
      <RoundedBox args={[1.0, 0.45, 0.4]} radius={0.06} material={cast} />
      <mesh ref={crank} rotation={[0, 0, Math.PI / 2]} material={crankM}><cylinderGeometry args={[0.05, 0.05, 1.5, 20]} /></mesh>
      {CYL.map(([x, side], i) => (
        <group key={i}>
          <mesh position={[x, 0, side * 0.48]} rotation={[Math.PI / 2, 0, 0]} material={shell}><cylinderGeometry args={[0.17, 0.17, 0.4, 32, 1, true]} /></mesh>
          {Array.from({ length: 8 }, (_, f) => <mesh key={f} position={[x, 0, side * (0.32 + f * 0.045)]} rotation={[Math.PI / 2, 0, 0]} material={cylM}><cylinderGeometry args={[0.23, 0.23, 0.012, 32]} /></mesh>)}
          <RoundedBox args={[0.36, 0.34, 0.12]} radius={0.03} position={[x, 0, side * 0.72]} material={cylM} />
          <mesh ref={(el) => (pistons.current[i] = el)} position={[x, 0, side * 0.42]} rotation={[Math.PI / 2, 0, 0]} material={steel}><cylinderGeometry args={[0.15, 0.15, 0.1, 28]} /></mesh>
          <mesh position={[x, 0.12, side * 0.8]} rotation={[Math.PI / 2, 0, 0]} material={ignM}><cylinderGeometry args={[0.025, 0.025, 0.12, 12]} /></mesh>
          <mesh ref={(el) => (sparks.current[i] = el)} position={[x, 0.04, side * 0.62]} material={spark}><sphereGeometry args={[0.04, 12, 12]} /></mesh>
        </group>
      ))}
    </group>
  );
}
PistonEngine.labels = () => [['cylinders', 'Cylinders', [0.3, 0.3, 0.6]], ['crankshaft', 'Crankshaft', [0.75, 0, 0]], ['ignition', 'Spark plugs', [-0.3, 0.3, -0.8]]];

function Motor({ c }) {
  const bell = useRef();
  const windM = useSub('copper', c('winding')), magM = useSub('dark', c('magnets')), brgM = useSub('steel', c('bearing'));
  const stator = useMemo(M.cast, []), shell = useMemo(M.shell, []), steel = useMemo(M.steel, []), alu = useMemo(M.alu, []);
  useFrame(({ clock }) => { if (bell.current) bell.current.rotation.y = clock.elapsedTime * 3; });
  return (
    <group>
      <mesh position={[0, -0.55, 0]} material={alu}><cylinderGeometry args={[0.55, 0.6, 0.12, 48]} /></mesh>
      {/* stator: teeth wound with copper */}
      <mesh material={stator}><cylinderGeometry args={[0.32, 0.32, 0.5, 40]} /></mesh>
      {ring(12, (a, i) => (
        <group key={i} rotation={[0, -a, 0]}>
          <mesh position={[0.42, 0, 0]} material={stator}><boxGeometry args={[0.2, 0.5, 0.1]} /></mesh>
          <mesh position={[0.42, 0, 0]} material={windM}><boxGeometry args={[0.14, 0.42, 0.16]} /></mesh>
        </group>
      ))}
      {/* rotating bell with magnets (cut open) */}
      <group ref={bell}>
        <mesh material={shell}><cylinderGeometry args={[0.66, 0.66, 0.62, 64, 1, true]} /></mesh>
        <mesh position={[0, 0.33, 0]} material={alu}><cylinderGeometry args={[0.66, 0.66, 0.05, 64]} /></mesh>
        {ring(14, (a, i) => <mesh key={i} material={magM} position={[Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6]} rotation={[0, -a, 0]}><boxGeometry args={[0.06, 0.5, 0.18]} /></mesh>)}
        <mesh position={[0, 0.45, 0]} material={steel}><cylinderGeometry args={[0.04, 0.04, 0.3, 16]} /></mesh>
      </group>
      {[0.28, -0.28].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={brgM}><torusGeometry args={[0.08, 0.03, 12, 32]} /></mesh>)}
    </group>
  );
}
Motor.labels = () => [['winding', 'Stator windings', [0.45, 0.32, 0.3]], ['magnets', 'Rotor magnets', [-0.62, 0.15, 0]], ['bearing', 'Bearings', [0, -0.3, 0.12]]];

function RotorHead({ c, blades = 4, prop = false }) {
  const spin = useRef(), swash = useRef();
  const bladeM = useSub('dark', c('blades') || c('balance')), hubM = useSub('alu', c('hub')), linkM = useSub('steel', c('pitch links'));
  const steel = useMemo(M.steel, []), cast = useMemo(M.cast, []);
  const bl = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(0, -0.07); s.lineTo(1.25, -0.045); s.quadraticCurveTo(1.35, 0, 1.25, 0.045); s.lineTo(0, 0.07); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3 }); g.rotateX(Math.PI / 2); return g;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (spin.current) spin.current.rotation.y = t * 2.2;
    if (swash.current) swash.current.rotation.set(0.08 * Math.sin(t * 0.8), 0, 0.08 * Math.cos(t * 0.8));
  });
  return (
    <group>
      <mesh position={[0, -0.55, 0]} material={cast}><cylinderGeometry args={[0.12, 0.16, 0.7, 32]} /></mesh>
      {!prop && <group ref={swash} position={[0, -0.25, 0]}><mesh material={hubM}><cylinderGeometry args={[0.3, 0.3, 0.05, 48]} /></mesh></group>}
      <group ref={spin}>
        <mesh material={hubM}><cylinderGeometry args={[0.18, 0.18, 0.16, 40]} /></mesh>
        <mesh position={[0, 0.12, 0]} material={steel}><sphereGeometry args={[0.1, 24, 16]} /></mesh>
        {ring(blades, (a, i) => (
          <group key={i} rotation={[0, a, 0]}>
            <mesh geometry={bl} material={bladeM} position={[0.16, 0, 0]} rotation={[0.12, 0, 0]} />
            {!prop && <mesh position={[0.22, -0.13, 0.08]} material={linkM}><cylinderGeometry args={[0.012, 0.012, 0.24, 8]} /></mesh>}
          </group>
        ))}
      </group>
    </group>
  );
}
RotorHead.labels = (prop) => [['blades', prop ? 'Blades' : 'Rotor blades', [1.0, 0.1, 0]], ['hub', prop ? 'Hub' : 'Hub & swashplate', [0, 0.25, 0.25]], ...(prop ? [] : [['pitch links', 'Pitch links', [0.25, -0.25, 0.1]]])];

function spur(teeth, r, w) {
  const s = new THREE.Shape(), n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, rr = r * (i % 4 < 2 ? 1 : 0.9); s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -w / 2); return g;
}
function Gearbox({ c }) {
  const g1 = useRef(), g2 = useRef(), g3 = useRef();
  const gearM = useSub('steel', c('gears')), brgM = useSub('brass', c('bearings')), oilM = useSub('cast', c('oil'));
  const shell = useMemo(M.shell, []), steel = useMemo(M.steel, []);
  const big = useMemo(() => spur(36, 0.62, 0.16), []), small = useMemo(() => spur(14, 0.26, 0.18), []), mid = useMemo(() => spur(22, 0.38, 0.14), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g1.current) g1.current.rotation.z = t * 0.6;
    if (g2.current) g2.current.rotation.z = -t * 0.6 * 36 / 14;
    if (g3.current) g3.current.rotation.z = -t * 0.6 * 36 / 22;
  });
  return (
    <group>
      <RoundedBox args={[2.1, 1.5, 0.5]} radius={0.08} material={shell} />
      <mesh ref={g1} geometry={big} material={gearM} position={[-0.25, 0, 0]} />
      <mesh ref={g2} geometry={small} material={gearM} position={[0.6, 0, 0]} />
      <mesh ref={g3} geometry={mid} material={gearM} position={[-0.25, 0.97, 0]} visible={false} />
      {[[-0.25, 0], [0.6, 0]].map(([x], i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={steel}><cylinderGeometry args={[0.07, 0.07, 0.8, 20]} /></mesh>
          {[0.26, -0.26].map((z) => <mesh key={z} position={[0, 0, z]} material={brgM}><torusGeometry args={[0.1, 0.03, 12, 32]} /></mesh>)}
        </group>
      ))}
      <mesh position={[0, -0.62, 0]} material={oilM}><boxGeometry args={[1.9, 0.12, 0.4]} /></mesh>
    </group>
  );
}
Gearbox.labels = () => [['gears', 'Gear mesh', [0.2, 0.45, 0.2]], ['bearings', 'Bearings', [0.6, 0, 0.32]], ['oil', 'Oil & chip detector', [0, -0.75, 0.2]]];

function Battery({ c }) {
  const cellM = useSub('cell', c('capacity')), busM = useSub('copper', c('resistance')), bmsM = useMemo(M.pcb, []);
  const shell = useMemo(M.shell, []), chip = useMemo(M.chip, []), led = useMemo(() => M.led('#34d399'), []), steel = useMemo(M.steel, []);
  const cells = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) cells.push([-0.75 + i * 0.3, -0.45 + j * 0.3]);
  return (
    <group>
      <RoundedBox args={[2.0, 0.8, 1.3]} radius={0.06} material={shell} />
      {cells.map(([x, z], i) => (
        <group key={i} position={[x, -0.05, z]}>
          <mesh material={cellM}><cylinderGeometry args={[0.12, 0.12, 0.6, 24]} /></mesh>
          <mesh position={[0, 0.31, 0]} material={steel}><cylinderGeometry args={[0.05, 0.05, 0.02, 16]} /></mesh>
        </group>
      ))}
      {[-0.45, -0.15, 0.15, 0.45].map((z) => <mesh key={z} position={[0, 0.27, z]} material={busM}><boxGeometry args={[1.8, 0.02, 0.06]} /></mesh>)}
      <mesh position={[0, 0.34, 0]} material={bmsM}><boxGeometry args={[1.0, 0.03, 0.5]} /></mesh>
      {[-0.3, 0, 0.3].map((x) => <mesh key={x} position={[x, 0.37, 0]} material={chip}><boxGeometry args={[0.16, 0.03, 0.16]} /></mesh>)}
      <mesh position={[0.45, 0.37, 0.18]} material={led}><boxGeometry args={[0.03, 0.02, 0.03]} /></mesh>
    </group>
  );
}
Battery.labels = () => [['capacity', 'Cells (capacity)', [-0.75, 0.25, 0.45]], ['resistance', 'Bus bars (resistance)', [0.6, 0.3, -0.45]], ['bms', 'Battery management board', [0, 0.45, 0]]];

function LandingGear({ c }) {
  const oleo = useRef(), wheel = useRef();
  const strutM = useSub('steel', c('shock strut')), brakeM = useSub('hot', c('brakes')), retM = useSub('cast', c('retraction'));
  const rubber = useMemo(M.rubber, []), alu = useMemo(M.alu, []), cast = useMemo(M.cast, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, k = 0.5 + 0.5 * Math.sin(t * 1.6);
    if (oleo.current) oleo.current.position.y = 0.05 + k * 0.18;
    if (wheel.current) wheel.current.rotation.z = -t * 2;
  });
  return (
    <group>
      <mesh position={[0, 0.65, 0]} material={cast}><cylinderGeometry args={[0.1, 0.1, 0.9, 24]} /></mesh>
      <group ref={oleo}>
        <mesh position={[0, -0.05, 0]} material={strutM}><cylinderGeometry args={[0.065, 0.065, 0.8, 24]} /></mesh>
        <group position={[0, -0.5, 0]} ref={wheel}>
          {[0.2, -0.2].map((z) => (
            <group key={z} position={[0, 0, z]}>
              <mesh rotation={[0, 0, 0]} material={rubber}><torusGeometry args={[0.32, 0.12, 20, 48]} /></mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={alu}><cylinderGeometry args={[0.24, 0.24, 0.16, 40]} /></mesh>
              <mesh position={[0, 0, z > 0 ? -0.1 : 0.1]} rotation={[Math.PI / 2, 0, 0]} material={brakeM}><cylinderGeometry args={[0.2, 0.2, 0.03, 40]} /></mesh>
            </group>
          ))}
        </group>
      </group>
      <mesh position={[0.28, 0.85, 0]} rotation={[0, 0, -0.6]} material={retM}><cylinderGeometry args={[0.04, 0.04, 0.7, 16]} /></mesh>
      <mesh position={[0.08, 0.1, 0.14]} rotation={[0, 0, 0.5]} material={alu}><boxGeometry args={[0.04, 0.34, 0.04]} /></mesh>
    </group>
  );
}
LandingGear.labels = () => [['shock strut', 'Shock strut (oleo)', [0.12, 0.2, 0]], ['brakes', 'Brake heat sink', [0, -0.45, 0.4]], ['retraction', 'Retraction actuator', [0.5, 1.1, 0]]];

function Actuator({ c }) {
  const rod = useRef();
  const pisM = useSub('steel', c('piston') || c('tracking')), sealM = useSub('rubber', c('seals')), valveM = useSub('cast', c('servo valve') || c('effort'));
  const shell = useMemo(M.shell, []), alu = useMemo(M.alu, []), steel = useMemo(M.steel, []);
  useFrame(({ clock }) => { if (rod.current) rod.current.position.x = 0.25 * Math.sin(clock.elapsedTime * 1.4); });
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} material={shell}><cylinderGeometry args={[0.22, 0.22, 1.5, 48, 1, true]} /></mesh>
      {[-0.75, 0.75].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={alu}><cylinderGeometry args={[0.24, 0.24, 0.06, 48]} /></mesh>)}
      <group ref={rod}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={pisM}><cylinderGeometry args={[0.2, 0.2, 0.16, 40]} /></mesh>
        {[0.06, -0.06].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={sealM}><torusGeometry args={[0.2, 0.012, 8, 40]} /></mesh>)}
        <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={steel}><cylinderGeometry args={[0.06, 0.06, 1.5, 24]} /></mesh>
        <mesh position={[1.6, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={alu}><torusGeometry args={[0.09, 0.04, 12, 24]} /></mesh>
      </group>
      <RoundedBox args={[0.6, 0.26, 0.36]} radius={0.04} position={[-0.1, 0.34, 0]} material={valveM} />
      <mesh position={[-0.95, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={alu}><torusGeometry args={[0.09, 0.04, 12, 24]} /></mesh>
    </group>
  );
}
Actuator.labels = () => [['piston', 'Piston & rod', [0.4, 0.15, 0.2]], ['seals', 'Seals', [0, -0.25, 0.2]], ['servo valve', 'Servo valve', [-0.1, 0.55, 0]]];

function Avionics({ c }) {
  const leds = useRef([]);
  const cpuM = useSub('pcb', c('processor')), psuM = useSub('pcb', c('power supply')), conM = useSub('brass', c('connectors'));
  const shell = useMemo(M.shell, []), chip = useMemo(M.chip, []), fin = useMemo(M.dark, []);
  const ledM = useMemo(() => [M.led('#34d399'), M.led('#34d399'), M.led('#fbbf24')], []);
  useFrame(({ clock }) => { ledM.forEach((m, i) => { m.color.setScalar(0).add(new THREE.Color(i === 2 ? '#fbbf24' : '#34d399').multiplyScalar(2 + 2 * (Math.sin(clock.elapsedTime * (3 + i)) > 0))); }); });
  return (
    <group>
      <RoundedBox args={[1.6, 0.8, 1.0]} radius={0.04} material={shell} />
      {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[-0.72 + i * 0.16, 0.45, 0]} material={fin}><boxGeometry args={[0.03, 0.12, 0.95]} /></mesh>)}
      {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh material={i === 3 ? psuM : cpuM}><boxGeometry args={[0.03, 0.62, 0.86]} /></mesh>
          {[-0.2, 0.15].map((z) => <mesh key={z} position={[0.03, 0.05, z]} material={chip}><boxGeometry args={[0.03, 0.16, 0.16]} /></mesh>)}
        </group>
      ))}
      {[-0.25, 0.25].map((z) => <mesh key={z} position={[0.82, -0.1, z]} rotation={[0, 0, Math.PI / 2]} material={conM}><cylinderGeometry args={[0.08, 0.08, 0.1, 24]} /></mesh>)}
      {ledM.map((m, i) => <mesh key={i} ref={(el) => (leds.current[i] = el)} position={[0.81, 0.22, -0.2 + i * 0.12]} material={m}><boxGeometry args={[0.02, 0.04, 0.04]} /></mesh>)}
    </group>
  );
}
Avionics.labels = () => [['processor', 'Processor cards', [-0.3, 0.35, 0.3]], ['power supply', 'Power supply card', [0.45, 0.35, -0.3]], ['connectors', 'Connectors', [0.85, -0.1, 0.3]]];

function Pump({ c, hydraulic = true }) {
  const imp = useRef();
  const pumpM = useSub('cast', c('pump')), valveM = useSub('alu', c('valve') || c('filter')), accM = useSub('steel', c('accumulator') || c('tank')), coolM = useSub('copper', c('cooler') || c('lines'));
  const shell = useMemo(M.shell, []), steel = useMemo(M.steel, []), fuel = useMemo(M.fuel, []);
  const pipe = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.35, 0, 0), new THREE.Vector3(0.7, 0.2, 0), new THREE.Vector3(0.9, 0.55, 0), new THREE.Vector3(0.9, 0.9, 0)]), 40, 0.05, 12), []);
  useFrame(({ clock }) => { if (imp.current) imp.current.rotation.x = clock.elapsedTime * 8; });
  return (
    <group position={[-0.2, -0.2, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={shell}><cylinderGeometry args={[0.32, 0.32, 0.7, 40, 1, true]} /></mesh>
      <group ref={imp}>{ring(7, (a, i) => <mesh key={i} material={pumpM} rotation={[a, 0, 0]} position={[0, Math.cos(a) * 0.15, Math.sin(a) * 0.15]}><boxGeometry args={[0.5, 0.2, 0.04]} /></mesh>)}</group>
      <mesh rotation={[0, 0, Math.PI / 2]} material={steel}><cylinderGeometry args={[0.04, 0.04, 1.0, 16]} /></mesh>
      <mesh geometry={pipe} material={coolM} />
      <RoundedBox args={[0.3, 0.3, 0.3]} radius={0.04} position={[0.9, 1.0, 0]} material={valveM} />
      {hydraulic
        ? <mesh position={[-0.7, 0.6, 0]} material={accM}><sphereGeometry args={[0.3, 32, 24]} /></mesh>
        : <group position={[-0.8, 0.55, 0]}><mesh material={shell}><boxGeometry args={[0.8, 0.6, 0.6]} /></mesh><mesh position={[0, -0.1, 0]} material={fuel}><boxGeometry args={[0.76, 0.36, 0.56]} /></mesh><mesh material={accM}><boxGeometry args={[0.82, 0.62, 0.02]} /></mesh></group>}
    </group>
  );
}
Pump.labels = (hydraulic) => hydraulic
  ? [['pump', 'Pump', [-0.2, 0.15, 0.3]], ['valve', 'Valve block', [0.7, 0.95, 0]], ['accumulator', 'Accumulator', [-0.9, 0.5, 0.2]], ['cooler', 'Cooler line', [0.75, 0.2, 0.1]]]
  : [['pump', 'Boost pump', [-0.2, 0.15, 0.3]], ['filter', 'Filter', [0.7, 0.95, 0]], ['tank', 'Tank & gauging', [-1.0, 0.4, 0.35]], ['lines', 'Fuel lines', [0.75, 0.2, 0.1]]];

function Generator({ c }) {
  const rotor = useRef();
  const windM = useSub('copper', c('winding') || c('generator')), rotM = useSub('steel', c('rotor')), brgM = useSub('brass', c('bearing'));
  const shell = useMemo(M.shell, []), cast = useMemo(M.cast, []);
  useFrame(({ clock }) => { if (rotor.current) rotor.current.rotation.x = clock.elapsedTime * 5; });
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} material={shell}><cylinderGeometry args={[0.6, 0.6, 1.4, 48, 1, true]} /></mesh>
      {ring(18, (a, i) => <mesh key={i} material={windM} rotation={[a, 0, 0]} position={[0, Math.cos(a) * 0.48, Math.sin(a) * 0.48]}><boxGeometry args={[1.1, 0.12, 0.1]} /></mesh>)}
      <group ref={rotor}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={rotM}><cylinderGeometry args={[0.3, 0.3, 1.1, 32]} /></mesh>
        {ring(4, (a, i) => <mesh key={i} material={cast} rotation={[a, 0, 0]} position={[0, Math.cos(a) * 0.32, Math.sin(a) * 0.32]}><boxGeometry args={[1.0, 0.08, 0.2]} /></mesh>)}
      </group>
      {[0.72, -0.72].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={brgM}><torusGeometry args={[0.1, 0.035, 12, 32]} /></mesh>)}
    </group>
  );
}
Generator.labels = () => [['winding', 'Stator windings', [0, 0.62, 0.2]], ['rotor', 'Rotor', [0.3, 0.1, 0.35]], ['bearing', 'Bearings', [0.72, -0.2, 0]]];

function ECS({ c }) {
  const turb = useRef();
  const hxM = useSub('alu', c('heat exchanger')), acmM = useSub('titan', c('air cycle machine')), fanM = useSub('dark', c('fan'));
  const shell = useMemo(M.shell, []);
  useFrame(({ clock }) => { if (turb.current) turb.current.rotation.x = clock.elapsedTime * 12; });
  return (
    <group>
      <group position={[-0.55, 0, 0]}>{Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[-0.35 + i * 0.05, 0, 0]} material={hxM}><boxGeometry args={[0.015, 0.9, 0.9]} /></mesh>)}<mesh material={shell}><boxGeometry args={[0.8, 0.95, 0.95]} /></mesh></group>
      <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={shell}><cylinderGeometry args={[0.32, 0.32, 0.8, 40, 1, true]} /></mesh>
      <group ref={turb} position={[0.5, 0, 0]}>{ring(12, (a, i) => <mesh key={i} material={acmM} rotation={[a, 0.4, 0]} position={[0, Math.cos(a) * 0.17, Math.sin(a) * 0.17]}><boxGeometry args={[0.6, 0.22, 0.02]} /></mesh>)}</group>
      <mesh position={[0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={fanM}><cylinderGeometry args={[0.25, 0.25, 0.08, 32]} /></mesh>
    </group>
  );
}
ECS.labels = () => [['heat exchanger', 'Heat exchanger', [-0.55, 0.55, 0.3]], ['air cycle machine', 'Air cycle machine', [0.5, 0.4, 0.2]], ['fan', 'Fan', [0.95, -0.3, 0]]];

function Structure({ c }) {
  const frameM = useSub('alu', c('frames')), strM = useSub('cast', c('stringers')), skinM = useSub('shell', c('skin'));
  return (
    <group>
      {[-0.9, -0.45, 0, 0.45, 0.9].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={frameM}><torusGeometry args={[0.6, 0.035, 10, 48]} /></mesh>)}
      {ring(12, (a, i) => <mesh key={i} position={[0, Math.cos(a) * 0.6, Math.sin(a) * 0.6]} rotation={[0, 0, Math.PI / 2]} material={strM}><boxGeometry args={[0.025, 1.9, 0.03]} /></mesh>)}
      <mesh rotation={[0, 0, Math.PI / 2]} material={skinM}><cylinderGeometry args={[0.62, 0.62, 1.95, 48, 1, true, 0, Math.PI]} /></mesh>
    </group>
  );
}
Structure.labels = () => [['frames', 'Frames', [0.45, 0.62, 0.2]], ['stringers', 'Stringers', [-0.6, 0.1, 0.62]], ['skin', 'Skin panels', [0, 0.7, -0.2]]];

function Shaft({ c }) {
  const s = useRef();
  const shM = useSub('steel', c('shaft')), brgM = useSub('brass', c('bearings')), cpM = useSub('cast', c('couplings'));
  useFrame(({ clock }) => { if (s.current) s.current.rotation.x = clock.elapsedTime * 7; });
  return (
    <group ref={s}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={shM}><cylinderGeometry args={[0.07, 0.07, 2.4, 24]} /></mesh>
      {[-0.6, 0.2, 1.0].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={brgM}><torusGeometry args={[0.16, 0.05, 12, 32]} /></mesh>)}
      {[-1.15, 1.15].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={cpM}><cylinderGeometry args={[0.18, 0.18, 0.12, 6]} /></mesh>)}
    </group>
  );
}
Shaft.labels = () => [['shaft', 'Drive shaft', [-0.2, 0.15, 0]], ['bearings', 'Hanger bearings', [0.2, 0.25, 0]], ['couplings', 'Flexible couplings', [1.15, 0.25, 0]]];

function Esc({ c }) {
  const swM = useSub('chip', c('switches')), capM = useSub('dark', c('capacitors'));
  const pcb = useMemo(M.pcb, []), fin = useMemo(M.alu, []), copper = useMemo(M.copper, []);
  return (
    <group>
      <mesh material={pcb}><boxGeometry args={[1.8, 0.05, 0.9]} /></mesh>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[-0.6 + i * 0.24, 0.07, -0.2]} material={swM}><boxGeometry args={[0.16, 0.08, 0.2]} /></mesh>)}
      {[-0.5, -0.2, 0.1].map((x) => <mesh key={x} position={[x, 0.22, 0.25]} material={capM}><cylinderGeometry args={[0.1, 0.1, 0.36, 24]} /></mesh>)}
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-0.8 + i * 0.145, -0.2, 0]} material={fin}><boxGeometry args={[0.03, 0.34, 0.86]} /></mesh>)}
      {[-0.3, 0, 0.3].map((z) => <mesh key={z} position={[0.95, 0.04, z]} rotation={[0, 0, Math.PI / 2]} material={copper}><cylinderGeometry args={[0.03, 0.03, 0.2, 12]} /></mesh>)}
    </group>
  );
}
Esc.labels = () => [['switches', 'Power switches (MOSFETs)', [-0.2, 0.2, -0.2]], ['capacitors', 'Capacitors', [-0.2, 0.5, 0.25]]];

/** which internal model shows a part (by its id, on a given vehicle type) */
export function internalFor(look, id) {
  const is = (p) => id === p || id.startsWith(p + '_');
  if (is('engine')) return look === 'male_uav' ? { C: PistonEngine } : look === 'helicopter' ? { C: Turbofan, p: { shaft: true } } : { C: Turbofan };
  if (is('apu')) return { C: Turbofan, p: { shaft: true } };
  if (is('motor')) return { C: Motor };
  if (is('esc') || is('inverter')) return { C: Esc };
  if (is('propeller') || is('rotor')) return { C: RotorHead, p: { blades: look === 'male_uav' ? 3 : 2, prop: true } };
  if (is('main_rotor')) return { C: RotorHead, p: { blades: 4 } };
  if (is('tail_rotor')) return { C: RotorHead, p: { blades: 2 } };
  if (is('battery')) return { C: Battery };
  if (is('avionics')) return { C: Avionics };
  if (is('landing_gear')) return { C: LandingGear };
  if (is('flight_actuator') || is('actuator')) return { C: Actuator };
  if (id.includes('gearbox')) return { C: Gearbox };
  if (is('drivetrain') || id.includes('bearing')) return { C: Shaft };
  if (is('hydraulics')) return { C: Pump, p: { hydraulic: true } };
  if (is('fuel')) return { C: Pump, p: { hydraulic: false } };
  if (is('electrical')) return { C: Generator };
  if (is('ecs')) return { C: ECS };
  if (is('airframe') || is('structure') || is('wing_panel')) return { C: Structure };
  return { C: Structure };
}
export function internalLabels(entry) {
  const { C, p = {} } = entry;
  const arg = C === Turbofan ? p.shaft : C === RotorHead ? p.prop : C === Pump ? p.hydraulic : undefined;
  return C.labels(arg);
}
