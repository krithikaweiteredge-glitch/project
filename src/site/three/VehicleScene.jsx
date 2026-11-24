import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, MeshReflectorMaterial, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { healthColor } from '../data';
import { TEXTURES } from './models';
import { useTheme } from '../theme';
import { internalFor, internalLabels } from './internals';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** scroll timeline (in screen heights): 0 cover photo, 1 assembled twin, 2 exploded, 3 coloured by health */
export const explodeAt = (p) => smooth(1.15, 2.1, p);
export const colourAt = (p) => smooth(2.2, 2.9, p);

/**
 * Prepares a built model: realistic materials, and for every top-level piece its assembled position and an
 * offset pointing away from the machine's centre. Pieces of a monitored part keep their component id; plain
 * body pieces fade as the machine opens, so the parts inside show.
 */
// physically based finishes for the material hints the models carry
const FIN = {
  paint:  { metalness: 0.08, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 },
  metal:  { metalness: 0.92, roughness: 0.34, clearcoat: 0.2, clearcoatRoughness: 0.3 },
  chrome: { metalness: 1, roughness: 0.07, clearcoat: 0.6, clearcoatRoughness: 0.04 },
  rubber: { metalness: 0, roughness: 0.88, clearcoat: 0 },
  carbon: { metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.05 },
  glass:  { metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 },
  gold:   { metalness: 1, roughness: 0.36, clearcoat: 0.1 },
  solar:  { metalness: 0.5, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04 },
};
function finish(hint, base, opacity, zone, map) {
  if (zone) return new THREE.MeshPhysicalMaterial({ color: base, transparent: true, opacity, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const f = FIN[hint] || FIN.paint;
  const tex = (map && TEXTURES[map]?.()) || (hint === 'carbon' ? TEXTURES.carbon() : null);
  return new THREE.MeshPhysicalMaterial({ color: base, map: tex || null, transparent: true, opacity, side: THREE.DoubleSide, envMapIntensity: hint === 'chrome' ? 1.6 : 1.15, ...f });
}

function prepare(model) {
  const g = model.group;
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g), centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const radius = size.length() / 2;
  const pieces = [], comps = {};
  for (const child of g.children) {
    let comp = child.userData.component;
    if (!comp) child.traverse((o) => { if (!comp && o.userData.component) comp = o.userData.component; });
    const b = new THREE.Box3().setFromObject(child), c = b.getCenter(new THREE.Vector3());
    const d = c.clone().sub(centre);
    const dir = d.lengthSq() < 1e-4 ? new THREE.Vector3(0, 1, 0) : d.clone().normalize();
    const out = comp ? dir.multiplyScalar(radius * 0.3).add(d.clone().multiplyScalar(0.42)).add(new THREE.Vector3(0, radius * 0.07, 0)) : d.clone().multiplyScalar(0.1);
    pieces.push({ obj: child, home: child.position.clone(), out, comp });
    if (comp) {
      const e = (comps[comp] ??= { box: new THREE.Box3() });
      e.box.union(b.clone().translate(out));
    }
    child.traverse((o) => {
      if (!o.isMesh) return;
      const old = o.material, body = !o.userData.component, zone = !!o.userData.zone;
      const base = old.color.clone();
      if (o.userData.keep) {                    // a real model keeps its own textured material
        // a real model's texture can carry alpha it was never meant to use: stay opaque unless the part is fading
        o.material = old.clone(); o.userData.origTransparent = old.transparent; o.material.side = THREE.DoubleSide; o.material.envMapIntensity = 1.2;
      } else o.material = finish(o.userData.mat, base, old.opacity, zone, o.userData.map);
      o.castShadow = !zone && o.userData.mat !== 'glass';
      o.receiveShadow = !zone;
      o.userData.baseColor = base;
      o.userData.baseOpacity = old.opacity;
      o.userData.body = body;
      if (!o.userData.keep) old.dispose();
    });
  }
  const parts = Object.fromEntries(Object.entries(comps).map(([k, e]) => {
    const c = e.box.getCenter(new THREE.Vector3()), s = e.box.getSize(new THREE.Vector3()).length() / 2;
    return [k, { centre: c, radius: Math.max(s, radius * 0.06) }];
  }));
  const exploded = pieces.reduce((r, p) => Math.max(r, new THREE.Box3().setFromObject(p.obj).getCenter(new THREE.Vector3()).add(p.out).sub(centre).length()), radius);
  return { pieces, centre, radius, exploded, parts, floor: box.min.y };
}

const tmp = new THREE.Color(), tmpV = new THREE.Vector3(), white = new THREE.Color('#ffffff');

/**
 * The detailed internal cutaway of one part, grown in place of the part's simple shape.
 * Sub-parts take the health colour of the matching sub-part health; labels name each internal piece.
 */
function Internal({ look, id, part, at, r }) {
  const grp = useRef();
  const entry = useMemo(() => internalFor(look, id), [look, id]);
  const { C, p = {} } = entry;
  const subs = part?.subparts || {};
  const colour = (k) => (subs[k] != null ? healthColor(subs[k]) : null);
  const labels = useMemo(() => internalLabels(entry), [entry]);
  const k = (r * 3.6) / 2.2;                          // the internal models are ~2.2 units long; show it larger than the part
  useFrame(() => { if (grp.current) grp.current.scale.lerp(tmpS.setScalar(k), 0.08); });
  return (
    <group ref={grp} position={at} scale={0.001}>
      <C c={colour} {...p} />
      {labels.map(([key, name, pos]) => {
        const h = subs[key];
        return (
          <Html key={key} position={pos} zIndexRange={[30, 20]} style={{ pointerEvents: 'none' }}>
            <div className="int-tag" style={{ '--c': h != null ? healthColor(h) : 'var(--ink2)' }}>
              <i />{name}{h != null && <b>{Math.round(h * 100)}%</b>}
            </div>
          </Html>
        );
      })}
    </group>
  );
}
const tmpS = new THREE.Vector3();

export default function VehicleScene({ model, parts, progress, inspect, sel, hover, onHover, onSelect, flagged, insets, look, focus = null }) {
  const prep = useMemo(() => prepare(model), [model]);
  const light = useTheme() === 'light';
  const BG = light ? '#e9e9ed' : '#0e0e12';
  const spin = useRef();
  const controls = useRef();
  const { camera, size } = useThree();
  const focusN = useRef(0);                 // frames left in the current camera move
  const R = prep.radius;

  useEffect(() => {
    camera.position.set(prep.centre.x + R * 1.7, prep.centre.y + R * 0.8, prep.centre.z + R * 2.5);
    camera.near = R / 60; camera.far = R * 80; camera.updateProjectionMatrix();
    controls.current?.target.copy(prep.centre);
  }, [prep, camera, R]);
  useEffect(() => { focusN.current = 110; }, [sel, inspect, focus]);
  const show = inspect ? sel : focus;            // the part opened up to show its internals

  const off = useRef({ x: 0, y: 0 });
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const p = inspect ? 3.2 : progress.current, e = explodeAt(p), c = colourAt(p);
    // the machine turns slowly with the scroll; in the inspector it settles at a three-quarter view
    if (spin.current) {
      const want = inspect ? 0.55 : -0.35 + p * 0.55 + Math.sin(t * 0.15) * 0.05;
      spin.current.rotation.y = THREE.MathUtils.lerp(spin.current.rotation.y, want, inspect ? 0.05 : 1);
    }
    model.spinners.forEach((s) => { s.rotation.y += dt * (11 - 9 * e); });

    for (const pc of prep.pieces) {
      pc.obj.position.copy(pc.home).addScaledVector(pc.out, e);
      pc.obj.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material, id = o.userData.component;
        if (o.userData.body) {
          m.opacity = (1 - 0.9 * e) * (show ? 0.4 : 1); m.depthWrite = m.opacity > 0.6;
          if (o.userData.keep) { const want = m.opacity < 0.98 || !!o.userData.origTransparent; if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; } }
          return;
        }
        const d = parts[id];
        const hc = d ? healthColor(d.health, d.verdict) : '#94a3b8';
        const isSel = id === sel, isHover = id === hover, isFlag = flagged.includes(id), isShown = id === show && !!look;
        // realistic metal by default; the health colour comes in as a tint and a soft glow
        m.color.copy(o.userData.baseColor).lerp(tmp.set(hc), c * (o.userData.keep ? 0.12 : isSel ? 0.45 : 0.3));
        m.emissive.set(hc);
        m.emissiveIntensity = isSel ? 0.55 + 0.25 * Math.sin(t * 4) : isHover ? 0.45 : isFlag ? c * (0.25 + 0.15 * Math.sin(t * 2.5)) : c * 0.06;
        const ghost = show && id !== show && !isHover;
        const baseOp = o.userData.zone ? Math.max(o.userData.baseOpacity, 0.3 + 0.35 * c) : 1;
        // the opened part hands over to its internal cutaway; the others step back
        m.opacity = THREE.MathUtils.lerp(m.opacity, isShown ? 0 : ghost ? 0.1 : baseOp, 0.15);
        o.visible = m.opacity > 0.02;
        m.depthWrite = m.opacity > 0.6 && !o.userData.zone;
        if (o.userData.keep) {
          const want = m.opacity < 0.98 || !!o.userData.origTransparent;
          if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; }
        }
        if (ghost) m.color.lerp(white, 0.4);
      });
    }

    // camera: frame the whole machine, or fly to the selected part
    const ctl = controls.current;
    if (ctl) {
      const wantTarget = tmpV.copy(prep.centre);
      let wantDist = R * (3.15 + (prep.exploded / R - 1) * 1.55 * e) * (insets.current.zoom || 1);
      if (show && prep.parts[show]) {
        model.group.localToWorld(wantTarget.copy(prep.parts[show].centre));
        wantDist = THREE.MathUtils.clamp(prep.parts[show].radius * (look ? (inspect ? 9 : 6.2) : 9), R * 0.35, R * 2.8);
      }
      const easing = focusN.current > 0; if (easing) focusN.current -= 1;
      ctl.target.lerp(wantTarget, inspect ? 0.14 : focus ? 0.06 : 0.2);
      const dir = camera.position.clone().sub(ctl.target);
      if (!inspect || easing) camera.position.copy(ctl.target).add(dir.setLength(THREE.MathUtils.lerp(dir.length(), wantDist, focus ? 0.05 : 0.11)));
      ctl.update();
    }
    // keep the machine centred in the space the panels leave free
    const ins = insets.current;
    const nudge = focus && !inspect && ins.x < 0 ? -size.width * 0.05 : 0;   // a close-up sits a little further from the hero text
    off.current.x = THREE.MathUtils.lerp(off.current.x, ins.x + nudge, 0.08);
    off.current.y = THREE.MathUtils.lerp(off.current.y, ins.y, 0.08);
    camera.setViewOffset(size.width, size.height, off.current.x, off.current.y, size.width, size.height);
  });

  const pick = (ev) => ev.intersections.find((h) => h.object.userData.component && !h.object.userData.body && h.object.material.opacity > 0.2)?.object.userData.component || null;
  const selInfo = sel && parts[sel], hovInfo = hover && hover !== sel && parts[hover];
  const at = (id) => prep.parts[id]?.centre;

  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, R * (light ? 10 : 6), R * (light ? 28 : 16)]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[R * 2, R * 4, R * 2]} intensity={2.4} color="#fff4e6" castShadow
        shadow-mapSize={[4096, 4096]} shadow-bias={-0.0002} shadow-normalBias={0.02}
        shadow-camera-left={-R * 3} shadow-camera-right={R * 3} shadow-camera-top={R * 3} shadow-camera-bottom={-R * 3} shadow-camera-far={R * 12} />
      <spotLight position={[-R * 3, R * 2, -R * 2]} intensity={40} angle={0.6} penumbra={1} color="#cfe3ff" distance={R * 12} />
      <spotLight position={[R * 3, R * 0.5, -R * 3]} intensity={30} angle={0.7} penumbra={1} color="#e8c99a" distance={R * 12} />
      <Environment resolution={1024}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[12, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.6} position={[-6, 1.5, 1]} rotation-y={Math.PI / 2} scale={[8, 1.2, 1]} color="#cfe9ff" />
        <Lightformer form="rect" intensity={1.2} position={[6, 1, 3]} rotation-y={-Math.PI / 2} scale={[8, 1, 1]} color="#ffe8c7" />
        <Lightformer form="ring" intensity={2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={4} />
      </Environment>

      <group ref={spin} position={[prep.centre.x, 0, prep.centre.z]}>
        <group position={[-prep.centre.x, 0, -prep.centre.z]}>
          <primitive object={model.group}
            onPointerMove={(ev) => { ev.stopPropagation(); const id = pick(ev); if (id !== hover) onHover(id); document.body.style.cursor = id ? 'pointer' : ''; }}
            onPointerOut={() => { onHover(null); document.body.style.cursor = ''; }}
            onClick={(ev) => { ev.stopPropagation(); const id = pick(ev); if (id) onSelect(id); }} />
          {look && show && prep.parts[show] && <Internal key={show} look={look} id={show} part={parts[show]} at={prep.parts[show].centre} r={prep.parts[show].radius} />}
          {selInfo && at(sel) && (
            <Html position={at(sel)} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
              <div className="anno" style={{ '--c': healthColor(selInfo.health, selInfo.verdict) }}>
                <span className="anno-dot" />
                <div className="anno-box"><b>{selInfo.name}</b><span>{Math.round((selInfo.health ?? 0) * 100)}% · {selInfo.verdict}</span></div>
              </div>
            </Html>
          )}
          {hovInfo && at(hover) && (
            <Html position={at(hover)} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
              <div className="hover-tag" style={{ '--c': healthColor(hovInfo.health, hovInfo.verdict) }}>{hovInfo.name}<b>{Math.round((hovInfo.health ?? 0) * 100)}%</b></div>
            </Html>
          )}
        </group>
      </group>

      <mesh rotation-x={-Math.PI / 2} position={[prep.centre.x, prep.floor - R * 0.28, prep.centre.z]}>
        <circleGeometry args={[R * 14, 64]} />
        <MeshReflectorMaterial blur={[400, 120]} resolution={1024} mixBlur={1} mixStrength={2.2} roughness={0.85} depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.3} color={light ? '#dcdce1' : '#101014'} metalness={light ? 0.2 : 0.6} mirror={light ? 0.3 : 0.5} />
      </mesh>
      <ContactShadows position={[prep.centre.x, prep.floor - R * 0.279, prep.centre.z]} scale={R * 7} blur={2.4} far={R * 3} opacity={light ? 0.42 : 0.6} />

      <OrbitControls ref={controls} enableZoom={inspect} enablePan={false} enableDamping dampingFactor={0.08} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.05}
        minDistance={R * 0.3} maxDistance={R * 9} />
      <EffectComposer multisampling={8}>
        <N8AO quality="high" aoRadius={R * 0.3} intensity={2.2} distanceFalloff={0.6} />
        <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.2} intensity={0.7} />
        <Vignette offset={0.28} darkness={light ? 0.25 : 0.68} />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
    </>
  );
}
