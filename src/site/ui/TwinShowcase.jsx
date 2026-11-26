// Home-page 3D showcase: a live digital twin that turns, opens into its parts and lights up by health,
// on a loop. Tabs switch the aircraft class; clicking a part (or the button) opens the full inspector.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { VEHICLES, healthColor, verdictOf } from '../data';
import { demoVehicle } from '../api';
import { href } from '../router';
import { buildModel } from '../three/models';
import { composePredator, PREDATOR_URL } from '../three/predator';
import { composeSu30, SU30_URL } from '../three/su30';
import { composeTejas, TEJAS_URL } from '../three/tejas';
import { composeM300, M300_URL } from '../three/m300';
import { composeA321, A321_URL } from '../three/a321';
import { composeRustom, RUSTOM_URL } from '../three/rustom';
import VehicleScene from '../three/VehicleScene';
import { useInView } from './motion';

const TABS = [
  ['helicopter', 'Helicopter'], ['fighter_twin_engine', 'Fighter jet'], ['male_uav', 'UAV'], ['quadcopter', 'Drone'],
];
const RANK = { 'NO-GO': 0, CAUTION: 1, SAFE: 3 };

// the part each class opens up to show its internals during the loop
export const FOCUS = { helicopter: 'engine_1', fighter_twin_engine: 'engine_1', fighter_single_engine: 'engine', male_uav: 'engine_1', quadcopter: 'motor_1', hexacopter: 'motor_1' };
export const LOOP_S = 14;
/** where the home loop is at time t (s): assembled -> apart -> judged by health (status dots) -> together */
export function loopAt(t) {
  const x = t % LOOP_S;
  if (x < 2) return { p: 1, inside: false, label: 'Assembled' };
  if (x < 4.5) return { p: 1 + (x - 2) / 2.5 * 1.3, inside: false, label: 'Seeing inside' };
  if (x < 6) return { p: 2.3 + (x - 4.5) / 1.5 * 0.9, inside: false, label: 'Judged by health' };
  if (x < 10.5) return { p: 3.2, inside: false, label: 'Judged by health' };
  if (x < 13) return { p: 3.2 - (x - 10.5) / 2.5 * 2.2, inside: false, label: 'Closing up' };
  return { p: 1, inside: false, label: 'Assembled' };
}

export function Twin({ look, model, phase, insets: given, focus = null }) {
  const ids = useMemo(() => Object.keys(model.parts), [model]);
  const parts = useMemo(() => demoVehicle(look, ids), [look, ids]);
  const flagged = ids.filter((id) => ['NO-GO', 'CAUTION'].includes(parts[id].verdict));
  const [hover, setHover] = useState(null);
  const own = useRef({ x: 0, y: 0, zoom: 1.05 });
  const insets = given || own;
  return (
    <VehicleScene model={model} parts={parts} progress={phase} inspect={false} sel={null} hover={hover} insets={insets}
      onHover={setHover} onSelect={() => { location.hash = href('vehicle', look); }} flagged={flagged} look={look} focus={focus} dots quality="lite" />
  );
}
export function BuiltTwin({ look, phase, insets, focus }) {
  if (look === 'fighter_twin_engine') return <Su30Twin phase={phase} insets={insets} focus={focus} />;   // the real Su-30MKI
  if (look === 'fighter_single_engine') return <TejasTwin phase={phase} insets={insets} focus={focus} />; // the real Tejas
  if (look === 'quadcopter') return <M300Twin phase={phase} insets={insets} focus={focus} />;              // the real Matrice 300
  if (look === 'airliner_narrowbody') return <RealTwin look={look} url={A321_URL} compose={composeA321} phase={phase} insets={insets} focus={focus} />;   // Air India A321
  if (look === 'male_uav') return <RealTwin look={look} url={RUSTOM_URL} compose={composeRustom} phase={phase} insets={insets} focus={focus} />;              // DRDO Rustom-2
  return <ShapeTwin look={look} phase={phase} insets={insets} focus={focus} />;
}
function Su30Twin({ phase, insets, focus }) {
  const { scene } = useGLTF(SU30_URL);
  const model = useMemo(() => composeSu30(scene), [scene]);
  return <Twin look="fighter_twin_engine" model={model} phase={phase} insets={insets} focus={focus} />;
}
function TejasTwin({ phase, insets, focus }) {
  const { scene } = useGLTF(TEJAS_URL);
  const model = useMemo(() => composeTejas(scene), [scene]);
  return <Twin look="fighter_single_engine" model={model} phase={phase} insets={insets} focus={focus} />;
}
function M300Twin({ phase, insets, focus }) {
  const { scene } = useGLTF(M300_URL);
  const model = useMemo(() => composeM300(scene), [scene]);
  return <Twin look="quadcopter" model={model} phase={phase} insets={insets} focus={focus} />;
}
/** a real model split into IVHM's parts by its compose function */
function RealTwin({ look, url, compose, phase, insets, focus }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => compose(scene), [scene, compose]);
  return <Twin look={look} model={model} phase={phase} insets={insets} focus={focus} />;
}
function ShapeTwin({ look, phase, insets, focus }) {
  const model = useMemo(() => buildModel(look, []), [look]);
  return <Twin look={look} model={model} phase={phase} insets={insets} focus={focus} />;
}
export function PredatorTwin({ phase, insets, focus }) {
  const { scene } = useGLTF(PREDATOR_URL);
  const model = useMemo(() => composePredator(scene), [scene]);
  return <Twin look="male_uav" model={model} phase={phase} insets={insets} focus={focus} />;
}

export default function TwinShowcase() {
  const [look, setLook] = useState(TABS[0][0]);
  const [ref, seen] = useInView({ threshold: 0.15 });
  const phase = useRef(1);
  const [stage, setStage] = useState('Assembled');
  const [inside, setInside] = useState(false);
  useEffect(() => {
    let raf; const t0 = performance.now();
    const step = (now) => {
      const st = loopAt(Math.max(0, (now - t0) / 1000));
      phase.current = st.p;
      setStage((s) => (s === st.label ? s : st.label));
      setInside((v) => (v === st.inside ? v : st.inside));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [look]);
  const focus = inside ? FOCUS[look] : null;

  const v = VEHICLES[look];
  const ids = useMemo(() => Object.keys(buildModel(look, []).parts), [look]);
  const demo = useMemo(() => demoVehicle(look, ids), [look, ids]);
  const worst = [...ids].sort((a, b) => (RANK[demo[a].verdict] ?? 2) - (RANK[demo[b].verdict] ?? 2) || demo[a].health - demo[b].health).slice(0, 3);

  return (
    <div className="twin" ref={ref}>
      <div className="twin-side">
        <div className="twin-tabs" role="tablist">
          {TABS.map(([l, name]) => (
            <button key={l} role="tab" aria-selected={l === look} className={l === look ? 'on' : ''} onClick={() => setLook(l)}>{name}</button>
          ))}
        </div>
        <div className="twin-info" key={look}>
          <span className="twin-stage"><i />{stage}</span>
          <h3>{v.name}</h3>
          <p>{v.text}</p>
          <div className="twin-list">
            <div className="twin-list-h">Watch list</div>
            {worst.map((id) => {
              const d = demo[id], vd = verdictOf(d.verdict);
              return (
                <div key={id} className="twin-row" style={{ '--c': healthColor(d.health, d.verdict) }}>
                  <i /><span>{d.name}</span><b>{Math.round(d.health * 100)}%</b><em>{vd.word}</em>
                </div>
              );
            })}
          </div>
          <a className="btn solid" href={href('vehicle', look)}>Open the full digital twin</a>
        </div>
      </div>
      <div className="twin-stagebox">
        {seen && (
          <Canvas shadows="soft" dpr={[1.25, 2]} gl={{ antialias: false, powerPreference: 'high-performance' }} camera={{ fov: 30 }}
            onCreated={(s) => { s.gl.toneMapping = THREE.AgXToneMapping; }}>
            <Suspense fallback={null}>
              <BuiltTwin key={look} look={look} phase={phase} focus={focus} />
            </Suspense>
          </Canvas>
        )}
        <div className="twin-hint">Drag to turn · click a part to inspect</div>
        <div className="twin-legend"><span style={{ '--c': 'var(--safe)' }}>Safe</span><span style={{ '--c': 'var(--caution)' }}>Caution</span><span style={{ '--c': 'var(--nogo)' }}>No-go</span></div>
      </div>
    </div>
  );
}
