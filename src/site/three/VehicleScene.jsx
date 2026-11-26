import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
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
  matte:  { metalness: 0.05, roughness: 0.66, clearcoat: 0.12, clearcoatRoughness: 0.55 },   // military paint
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

/**
 * Where airframe health is watched on each type: the structural hotspot where fatigue cracks start, in model
 * coordinates, with a focus radius. Selecting the airframe flies here and opens the structure cutaway at normal
 * part size, instead of treating the whole shell as one giant part.
 */
const STRUCT_SPOT = {
  helicopter: [[-1.85, 0.55, 0], 0.42],                // tail-boom-to-cabin joint
  fighter_single_engine: [[1.2, 0.85, 0.6], 0.4],      // wing-root attachment (Tejas)
  fighter_twin_engine: [[-0.8, -0.05, 1.05], 0.45],    // wing-root attachment
  male_uav: [[1.22, 0.37, 0.61], 0.3],                 // wing root (Rustom-2)
  airliner_narrowbody: [[0.34, -0.84, 0.67], 0.55],    // wing-to-body joint (A321)
};

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
      const e = (comps[comp] ??= { box: new THREE.Box3(), home: new THREE.Box3(), zone: true });
      e.box.union(b.clone().translate(out)); e.home.union(b);
      child.traverse((o) => { if (o.isMesh && !o.userData.zone) e.zone = false; });   // only a volume: a system inside the shell
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
      if (zone) { o.visible = false; o.userData.hiddenZone = true; }   // systems inside the airframe show as a status dot, not a box
      if (!o.userData.keep) old.dispose();
    });
  }
  const parts = Object.fromEntries(Object.entries(comps).map(([k, e]) => {
    const c = e.box.getCenter(new THREE.Vector3()), s = e.box.getSize(new THREE.Vector3()).length() / 2;
    return [k, { centre: c, home: e.home.getCenter(new THREE.Vector3()), size: e.home.getSize(new THREE.Vector3()), radius: Math.max(s, radius * 0.06), zone: e.zone }];
  }));
  const exploded = pieces.reduce((r, p) => Math.max(r, new THREE.Box3().setFromObject(p.obj).getCenter(new THREE.Vector3()).add(p.out).sub(centre).length()), radius);
  // x-ray outlines: crisp edge lines for the shell, so the see-through airframe still reads as an aircraft
  const edgeMat = new THREE.LineBasicMaterial({ color: '#8fb3d9', transparent: true, opacity: 0, depthWrite: false });
  const edges = [];
  for (const pc of pieces) pc.obj.traverse((o) => {
    if (!o.isMesh || o.userData.hiddenZone || !(o.userData.body || o.userData.component === 'airframe')) return;
    const pos = o.geometry.attributes.position;
    // real models are often one large mesh for the whole airframe: outline those too (the edge pass is linear)
    if (!pos || pos.count > 900000) return;
    // the code-built shells are smooth lofts with few creases: a finer angle draws their frames and panel lines.
    // Only real creases are drawn: three's EdgesGeometry also draws every open seam, and real models are built from
    // many separate skin panels, which turns their skin into a dense mesh of lines. A model can set its own angle
    // and leave areas out (model.edgeAngle, model.edgeSkip)
    const angle = model.edgeAngle ?? (o.userData.keep ? 28 : 11);
    const geo = creaseEdges(o.geometry, angle, model.edgeSkip);
    const line = new THREE.LineSegments(geo, edgeMat);
    line.raycast = () => {};
    line.userData.edge = true;
    o.add(line); edges.push(line);
  });
  return { pieces, centre, radius, exploded, parts, floor: box.min.y, edgeMat, edgeLevel: model.edgeOpacity ?? EDGE_LEVEL };
}

/** how strong the x-ray outline is: a very light blue, so the systems inside stay the focus */
const EDGE_LEVEL = 0.4;

/** the edges where two faces meet at more than `angle` degrees; unlike EdgesGeometry, open edges (seams between
 *  separate panels, holes) are left out, and so is any edge whose midpoint `skip(x, y, z)` rejects */
function creaseEdges(geometry, angle, skip) {
  const pos = geometry.attributes.position, idx = geometry.index;
  const n = idx ? idx.count : pos.count, at = (i) => (idx ? idx.getX(i) : i);
  const cos = Math.cos(THREE.MathUtils.degToRad(angle)), key = (v) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), tri = new THREE.Triangle();
  const seen = new Map(), out = [];
  for (let i = 0; i + 2 < n; i += 3) {
    a.fromBufferAttribute(pos, at(i)); b.fromBufferAttribute(pos, at(i + 1)); c.fromBufferAttribute(pos, at(i + 2));
    const normal = tri.set(a, b, c).getNormal(new THREE.Vector3());
    const v = [a.clone(), b.clone(), c.clone()], k = v.map(key);
    for (let j = 0; j < 3; j++) {
      const p = k[j], q = k[(j + 1) % 3]; if (p === q) continue;
      const id = p < q ? `${p}|${q}` : `${q}|${p}`, other = seen.get(id);
      if (!other) { seen.set(id, normal); continue; }
      const m = v[j], o2 = v[(j + 1) % 3];
      if (other.dot(normal) <= cos && !skip?.((m.x + o2.x) / 2, (m.y + o2.y) / 2, (m.z + o2.z) / 2)) out.push(v[j].x, v[j].y, v[j].z, v[(j + 1) % 3].x, v[(j + 1) % 3].y, v[(j + 1) % 3].z);
      seen.delete(id);
    }
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
}

/** home page: how far the camera moves in once the shell is see-through, for aircraft whose rotor or wingspan
 *  sets the framing (their interior would otherwise sit small in the middle of the view) */
const XRAY_ZOOM = { helicopter: 0.78, male_uav: 0.84, airliner_narrowbody: 0.9 };

/** a see-through shell loses its shine as it fades, or its reflections read as a milky film over the parts inside */
function dimShine(o, m) {
  o.userData.glint ??= [m.envMapIntensity ?? 1, m.clearcoat ?? 0];
  const k = THREE.MathUtils.clamp(m.opacity * 1.6, 0.02, 1);   // never exactly 0: a clearcoat of 0 recompiles the shader
  m.envMapIntensity = o.userData.glint[0] * k;
  if ('clearcoat' in m) m.clearcoat = o.userData.glint[1] * k;
}

const tmp = new THREE.Color(), tmpV = new THREE.Vector3(), white = new THREE.Color('#ffffff'), XRAY = new THREE.Color('#b9cde0');

/**
 * The detailed internal cutaway of one part, grown in place of the part's simple shape.
 * Sub-parts take the health colour of the matching sub-part health; labels name each internal piece.
 */
function Internal({ look, id, part, at, r, floor }) {
  const grp = useRef(), inner = useRef(), low = useRef(null);
  const entry = useMemo(() => internalFor(look, id), [look, id]);
  const { C, p = {} } = entry;
  const subs = part?.subparts || {};
  const colour = (k) => (subs[k] != null ? healthColor(subs[k]) : null);
  const labels = useMemo(() => internalLabels(entry), [entry]);
  const k = (r * 3.6) / 2.2;                          // the internal models are ~2.2 units long; show it larger than the part
  useFrame(() => {
    const g = grp.current; if (!g) return;
    g.scale.lerp(tmpS.setScalar(k), 0.08);
    // the lowest point of the cutaway, in its own units, measured once
    if (low.current == null && inner.current) { g.updateMatrixWorld(true); low.current = (tmpB.setFromObject(inner.current).min.y - g.position.y) / g.scale.y; }
    // lift it so it never sinks into the floor
    const bottom = at.y + (low.current ?? 0) * g.scale.y;
    g.position.y = at.y + (floor != null && bottom < floor ? floor - bottom : 0);
  });
  return (
    <group ref={grp} position={at} scale={0.001}>
      <group ref={inner}><C c={colour} {...p} /></group>
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
const tmpS = new THREE.Vector3(), tmpB = new THREE.Box3();

/** where a part is now: between its assembled and its exploded centre */
const partAt = (pp, e, out) => out.copy(pp.home).lerp(pp.centre, e);

/**
 * Status dots: one per monitored part, green / amber / red by its verdict, with a soft pulsing halo.
 * They are also how the systems without a shape of their own (avionics, fuel, hydraulics...) are clicked.
 */
function Dots({ prep, parts, eRef, showRef, hidden, onSelect, onHover, only }) {
  const R = prep.radius;
  const ids = Object.keys(prep.parts).filter((id) => !only || only.has(id));
  const refs = useRef({});
  const mats = useMemo(() => Object.fromEntries(ids.map((id) => {
    const col = new THREE.Color(parts[id] ? healthColor(parts[id].health, parts[id].verdict) : '#94a3b8');
    return [id, {
      core: new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2), toneMapped: false, transparent: true, depthTest: false }),
      halo: new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false, depthTest: false }),
    }];
  })), [ids.join(), parts]);
  const v = new THREE.Vector3();
  useFrame(({ camera }) => {
    const on = showRef.current;
    for (const id of ids) {
      const g = refs.current[id]; if (!g) continue;
      partAt(prep.parts[id], eRef.current, g.position);
      const vis = on > 0.02 && !hidden;   // a part is open: no dots in the way
      g.visible = vis;
      if (!vis) continue;
      const m = mats[id]; m.core.opacity = on; m.halo.opacity = on * 0.16;   // steady: no pulsing
      // the same size on screen at any zoom, so a dot is always easy to see and to click
      const s = THREE.MathUtils.clamp(camera.position.distanceTo(g.getWorldPosition(v)) * 0.011, R * 0.006, R * 0.03);
      g.scale.setScalar(s);
    }
  });
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 20, 14), []);
  const hit = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }), []);   // a larger, invisible click target
  return (
    <group renderOrder={10}>
      {ids.map((id) => (
        <group key={id} ref={(el) => (refs.current[id] = el)}
          onClick={(ev) => { ev.stopPropagation(); onSelect(id); }}
          onPointerOver={(ev) => { ev.stopPropagation(); onHover(id); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { onHover(null); document.body.style.cursor = ''; }}>
          <mesh geometry={sphere} material={mats[id].core} scale={0.5} renderOrder={11} userData={{ component: id, dot: true }} />
          <mesh geometry={sphere} material={mats[id].halo} scale={0.95} renderOrder={10} userData={{ component: id, dot: true }} />
          <mesh geometry={sphere} material={hit} scale={1.8} userData={{ component: id, dot: true }} />
        </group>
      ))}
    </group>
  );
}

/**
 * Callouts for the home page: the key components of each type named like a technical illustration. A small
 * marker on the part, a thin leader line pushed outward from the aircraft, and a label with the part's name
 * and health. They follow the parts as the aircraft splits and rejoins.
 */
const CALLOUTS = {
  helicopter: [['main_rotor', 'Main rotor'], ['main_gearbox', 'Main gearbox'], ['engine_1', 'Shakti turboshaft'], ['tail_rotor', 'Tail rotor'],
    ['tail_gearbox', 'Tail gearbox'], ['drive_bearing_2', 'Tail drive shaft'], ['landing_gear', 'Skid gear']],
  fighter_single_engine: [['engine', 'F404 turbofan'], ['flight_actuator_3', 'Elevon actuator'], ['flight_actuator_5', 'Rudder actuator'],
    ['landing_gear_1', 'Nose gear'], ['landing_gear_2', 'Main gear'], ['fuel', 'Fuel system']],
  fighter_twin_engine: [['engine_1', 'AL-31FP turbofan'], ['flight_actuator_3', 'All-moving tailplane'], ['flight_actuator_5', 'Rudder actuator'],
    ['flight_actuator_1', 'Aileron actuator'], ['landing_gear_1', 'Nose gear'], ['landing_gear_2', 'Main gear'], ['apu', 'APU']],
  male_uav: [['engine_1', 'Rotax 914 engine'], ['propeller_1', 'Propeller'], ['actuator_1', 'Aileron actuator'], ['actuator_3', 'Elevator actuator'],
    ['actuator_4', 'Rudder actuator'], ['landing_gear', 'Landing gear'], ['avionics', 'Avionics']],
  quadcopter: [['motor_1', 'Brushless motor'], ['propeller_2', 'Propeller'], ['esc_3', 'Speed controller'], ['battery', 'Battery pack'], ['avionics', 'Flight controller']],
  hexacopter: [['motor_1', 'Brushless motor'], ['propeller_3', 'Propeller'], ['esc_4', 'Speed controller'], ['battery_1', 'Battery pack'], ['avionics', 'Flight controller']],
  airliner_narrowbody: [['engine_1', 'CFM56 turbofan'], ['apu', 'APU'], ['landing_gear_2', 'Main gear'], ['landing_gear_1', 'Nose gear'],
    ['flight_actuator_7', 'Rudder actuator'], ['flight_actuator_1', 'Aileron actuator'], ['wing_panel_1', 'Wing panel']],
};

/**
 * Home page: every system shown as its detailed model (the same ones the inspector opens) in place of its simple
 * shape or volume, sized to the space it fills, while the shell is see-through. A drone battery shows its cells and
 * wiring, an engine its compressor and turbine, a flight controller its boards, instead of a box.
 */
/** parts drawn as plain shapes (a box, a cylinder, a zone) that get their detailed model on the home page; rotors,
 *  propellers, skids, gear and shafts already have their real shape and stay as they are */
const SWAP = ['engine', 'apu', 'motor', 'esc', 'inverter', 'battery', 'avionics', 'electrical', 'hydraulics', 'fuel', 'ecs',
  'main_gearbox', 'tail_gearbox', 'gearbox', 'flight_actuator', 'actuator'];
const swaps = (id) => SWAP.some((p) => id === p || id.startsWith(p + '_'));

/** the size of a detailed model in its own units (at scale 1, unrotated), measured from its meshes */
function ownSize(root) {
  root.updateMatrixWorld(true);
  const inv = tmpM.copy(root.matrixWorld).invert(), box = new THREE.Box3(), b = new THREE.Box3();
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.union(b.copy(o.geometry.boundingBox).applyMatrix4(tmpM2.multiplyMatrices(inv, o.matrixWorld)));
  });
  return box.isEmpty() ? null : box.getSize(new THREE.Vector3());   // (in the root's own frame, so its scale drops out)
}
const tmpM = new THREE.Matrix4(), tmpM2 = new THREE.Matrix4();

function Detailed({ prep, parts, eRef, showRef, look, hide = null, onSelect, onHover }) {
  const items = useMemo(() => Object.keys(prep.parts).filter(swaps).map((id) => ({ id, entry: internalFor(look, id) })), [look, prep]);
  const refs = useRef([]), own = useRef([]);
  useFrame(() => {
    const on = showRef.current;
    items.forEach(({ id }, i) => {
      const g = refs.current[i]; if (!g) return;
      const pp = prep.parts[id];
      partAt(pp, eRef.current, g.position);
      // fit the detailed model (~2.2 units across) into the real space of the part it replaces; a system that is
      // only a volume inside the shell (avionics, fuel, a battery bay...) is kept inside that volume
      const sz = pp.size;
      let fit = Math.max(sz.x, sz.y, sz.z) / 2.2;
      // an actuator is sized like an actuator, the same on every surface of an aircraft: not stretched to a long
      // aileron, and not shrunk where the simplified model leaves only a sliver of the surface
      if (id.includes('actuator')) fit = (prep.radius * 0.14) / 2.2;
      const k = Math.max(on, 0.001);
      const engine = id === 'engine' || id === 'apu' || id.startsWith('engine_');
      if (pp.zone || engine) {
        own.current[i] ??= ownSize(g);
        const m = own.current[i];
        if (m && engine) {
          // an engine fills its bay along its length but is only as wide as the nacelle: scaled evenly to the bay's
          // length, a long slim bay (the Su-30's) would grow its fan rings taller than the whole aircraft
          const across = Math.min(sz.y / Math.max(m.y, 1e-3), sz.z / Math.max(m.z, 1e-3)) * 1.15;
          const along = Math.min(sz.x / Math.max(m.x, 1e-3), across * 3);
          g.scale.set(along * k, across * k, across * k);
          g.visible = on > 0.02 && !hide;
          return;
        }
        if (m) fit = Math.min(fit, Math.min(sz.x / Math.max(m.x, 1e-3), sz.y / Math.max(m.y, 1e-3), sz.z / Math.max(m.z, 1e-3)) * 1.5);
      }
      g.scale.setScalar(fit * k);
      g.visible = on > 0.02 && !hide;   // (a part opened in the inspector shows its own close-up; the rest step back)
    });
  });
  return items.map(({ id, entry: { C, p = {} } }, i) => {
    const subs = parts[id]?.subparts || {};
    const colour = (key) => (subs[key] != null ? healthColor(subs[key]) : null);
    return (
      <group key={id} ref={(el) => (refs.current[i] = el)}
        onClick={onSelect && ((ev) => { ev.stopPropagation(); onSelect(id); })}
        onPointerOver={onHover && ((ev) => { ev.stopPropagation(); onHover(id); document.body.style.cursor = 'pointer'; })}
        onPointerOut={onHover && (() => { onHover(null); document.body.style.cursor = ''; })}>
        <C c={colour} {...p} />
      </group>
    );
  });
}

function Callouts({ prep, parts, eRef, showRef, look, onSelect, avoid }) {
  const { camera, size, gl } = useThree();
  const items = useMemo(() => (CALLOUTS[look] || Object.keys(prep.parts).slice(0, 6).map((id) => [id, parts[id]?.name || id]))
    .filter(([id]) => prep.parts[id]), [look, prep, parts]);
  const anchors = useRef([]), boxes = useRef([]), keep = useRef({ n: 0, rect: null });
  const v = useMemo(() => new THREE.Vector3(), []), c = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const on = showRef.current;
    const parent = anchors.current.find(Boolean)?.parent;
    if (!parent) return;
    // the page text to keep clear of (e.g. the hero headline), in canvas pixels; re-read twice a second
    if (avoid && keep.current.n-- <= 0) {
      keep.current.n = 30;
      const t = document.querySelector(avoid)?.getBoundingClientRect(), cv = gl.domElement.getBoundingClientRect();
      keep.current.rect = t ? { l: t.left - cv.left - 12, r: t.right - cv.left + 12, t: t.top - cv.top - 12, b: t.bottom - cv.top + 12 } : null;
    }
    const hits = (a, b) => b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
    c.copy(prep.centre); parent.localToWorld(c); c.project(camera);
    const placed = [];
    items.forEach(([id], i) => {
      const g = anchors.current[i], el = boxes.current[i];
      if (!g || !el) return;
      partAt(prep.parts[id], eRef.current, g.position);
      g.getWorldPosition(v).project(camera);
      const ax = (v.x + 1) / 2 * size.width, ay = (1 - v.y) / 2 * size.height;
      // push the label outward from the aircraft's centre on screen, never straight up or down
      let dx = (v.x - c.x) * size.width, dy = -(v.y - c.y) * size.height;
      const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      if (Math.abs(dy) > 0.92) { dx = (dx >= 0 ? 1 : -1) * 0.45; dy = Math.sign(dy) * 0.9; }
      const tag = el.lastChild, w = (tag?.offsetWidth || 120) + 8, h = (tag?.offsetHeight || 22) + 6;
      const anchorBox = { l: ax - 6, r: ax + 6, t: ay - 6, b: ay + 6 };
      // try straight out from the aircraft first, then four diagonals, at three line lengths; skip the label if
      // every option would cover the page text, leave the view, or overlap a label already placed
      const dirs = [[dx, dy], [0.94, -0.34], [0.94, 0.34], [-0.94, -0.34], [-0.94, 0.34]];
      let ok = null;
      if (!hits(anchorBox, keep.current.rect)) {
        search: for (const [ux, uy] of dirs) for (const L of [56, 84, 112]) {
          const ex = ax + ux * L, ey = ay + uy * L, right = ux >= 0;
          const box = right ? { l: ex, r: ex + w, t: ey - h / 2, b: ey + h / 2 } : { l: ex - w, r: ex, t: ey - h / 2, b: ey + h / 2 };
          const inside = box.l > 4 && box.r < size.width - 4 && box.t > 4 && box.b < size.height - 4;
          if (inside && !hits(box, keep.current.rect) && !placed.some((p) => hits(box, p))) { ok = { L, box, ux, uy, right }; break search; }
        }
      }
      if (!ok) { el.style.opacity = '0'; el.style.visibility = 'hidden'; return; }
      placed.push(ok.box);
      el.style.visibility = 'visible'; el.style.opacity = on.toFixed(3);
      el.style.setProperty('--len', `${ok.L}px`); el.style.setProperty('--ang', `${Math.atan2(ok.uy, ok.ux)}rad`);
      el.style.setProperty('--tx', `${ok.ux * ok.L}px`); el.style.setProperty('--ty', `${ok.uy * ok.L}px`);
      el.dataset.side = ok.right ? 'r' : 'l';
    });
  });
  return items.map(([id, name], i) => {
    const d = parts[id], col = d ? healthColor(d.health, d.verdict) : '#94a3b8';
    return (
      <group key={id} ref={(el) => (anchors.current[i] = el)}>
        <Html zIndexRange={[15, 5]} style={{ pointerEvents: 'none' }}>
          <div className="callout" ref={(el) => (boxes.current[i] = el)} style={{ '--c': col, opacity: 0 }}>
            <i className="co-mark" />
            <span className="co-line" />
            <button className="co-tag" style={{ pointerEvents: 'auto' }} onClick={() => onSelect?.(id)}>
              <b>{name}</b>{d?.health != null && <em>{Math.round(d.health * 100)}%</em>}
            </button>
          </div>
        </Html>
      </group>
    );
  });
}

/**
 * The 3D twin.
 *  inspect  - the interactive inspector: see-through airframe, components highlighted, dots, click to select
 *  explode  - optional ref: true to take the aircraft apart in the inspector (the site's inspector keeps it
 *             assembled, every part in its real place); outside the inspector `progress` drives it
 *  dots     - show status dots once the parts are coloured (home page)
 *  cmd      - ref: { zoom: factor, reset: bool } from the zoom buttons
 *  quality  - 'lite' for the home page (fast), 'full' for the inspector
 */
export default function VehicleScene({ model, parts, progress, inspect, sel, hover, onHover, onSelect, flagged, insets, look,
  focus = null, dots = false, explode, cmd, quality = 'full' }) {
  const prep = useMemo(() => {
    const p = prepare(model), spot = STRUCT_SPOT[look];
    if (spot && p.parts.airframe) { const v = new THREE.Vector3(...spot[0]); p.parts.airframe = { home: v, centre: v.clone(), radius: spot[1] }; }
    return p;
  }, [model, look]);
  // development only: the prepared parts, for checking where each one sits (window.__ivhmTwin in the console)
  if (import.meta.env.DEV && inspect) window.__ivhmTwin = { look, prep };
  const light = useTheme() === 'light';
  const BG = light ? '#e9e9ed' : '#0e0e12';
  const lite = quality === 'lite';
  const spin = useRef();
  const controls = useRef();
  const { camera, size } = useThree();
  const focusN = useRef(0);                 // frames left in the current camera move
  const eRef = useRef(0), showRef = useRef(0);
  const R = prep.radius;

  useEffect(() => {
    camera.position.set(prep.centre.x + R * 1.7, prep.centre.y + R * 0.8, prep.centre.z + R * 2.5);
    camera.near = R / 60; camera.far = R * 80; camera.updateProjectionMatrix();
    controls.current?.target.copy(prep.centre);
  }, [prep, camera, R]);
  useEffect(() => { focusN.current = 110; }, [sel, inspect, focus]);
  const show = inspect ? sel : focus;            // the part opened up to show its internals
  // the systems shown as their detailed models, on the home page and in the inspector alike
  const swapIds = useMemo(() => new Set(dots || inspect ? Object.keys(prep.parts).filter(swaps) : []), [dots, inspect, prep]);
  // inspector: a status dot only where there is nothing real to see or click (the airframe hotspot, a volume
  // without a detailed model); every other part is its own model
  const dotIds = useMemo(() => new Set(Object.keys(prep.parts).filter((id) => !swapIds.has(id) && (prep.parts[id].zone || id === 'airframe'))), [prep, swapIds]);

  const off = useRef({ x: 0, y: 0 });
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    let e, c, rev;
    if (inspect) {                               // the inspector: assembled unless the user takes it apart; always coloured
      e = THREE.MathUtils.lerp(eRef.current, explode?.current ? 1 : 0, 0.06); c = 1; rev = e;
    } else {
      // home page (dots): an x-ray reveal - every part stays exactly where it is in the aircraft while the shell
      // turns see-through; elsewhere the aircraft still comes apart
      const p = progress.current; rev = explodeAt(p); e = dots ? 0 : rev; c = colourAt(p);
    }
    eRef.current = e;
    const only = inspect && !!explode?.current, frameOpen = show === 'airframe';   // exploded in the inspector: components only, no shell
    // (EDGE_LEVEL, or model.edgeOpacity, scales it)
    prep.edgeMat.opacity = THREE.MathUtils.lerp(prep.edgeMat.opacity, prep.edgeLevel * (inspect && !only && (!show || frameOpen) ? (light ? 0.62 : 0.52) : !inspect && dots ? rev * (light ? 0.5 : 0.4) : 0), 0.1);
    prep.edgeMat.color.set(light ? '#3d5f86' : '#8fb3d9'); prep.edgeMat.visible = prep.edgeMat.opacity > 0.01;
    showRef.current = THREE.MathUtils.lerp(showRef.current, inspect ? 1 : dots ? c : 0, 0.1);
    if (spin.current) {
      const want = inspect ? 0.55 : -0.35 + (progress.current ?? 1) * 0.55 + Math.sin(t * 0.15) * 0.05;
      spin.current.rotation.y = THREE.MathUtils.lerp(spin.current.rotation.y, want, inspect ? 0.05 : 1);
    }
    model.spinners.forEach((s) => { s.rotation.y += dt * (11 - 9 * e); });

    for (const pc of prep.pieces) {
      pc.obj.position.copy(pc.home).addScaledVector(pc.out, e);
      pc.obj.traverse((o) => {
        if (!o.isMesh || o.userData.hiddenZone) return;   // (edge lines are LineSegments, not meshes)
        const m = o.material, id = o.userData.component;
        if (o.userData.body) {
          // the airframe: solid on the home page, a ghost in the inspector so the components inside show
          m.opacity = THREE.MathUtils.lerp(m.opacity, inspect ? (only || (show && !frameOpen) ? 0 : 0.16) : (1 - 0.88 * rev) * (show ? 0.4 : 1), 0.12);
          if (inspect) m.color.lerp(XRAY, 0.2);
          m.depthWrite = m.opacity > 0.6;
          dimShine(o, m);
          o.visible = !inspect || m.opacity > 0.01;
          if (o.userData.keep || inspect) { const want = m.opacity < 0.98 || !!o.userData.origTransparent; if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; } }
          return;
        }
        const d = parts[id];
        const swap = swapIds.has(id);                 // its detailed model takes its place
        const hc = d ? healthColor(d.health, d.verdict) : '#94a3b8';
        const isSel = id === sel, isHover = id === hover, isFlag = flagged.includes(id), isShown = id === show && !!look;
        // the airframe skin of a real model is a component too: in the inspector it is the ghost
        // the airframe is the whole shell: never tint it by health (a Caution would turn the whole aircraft yellow).
        // Its status shows on its dot at the structural hotspot; in the inspector the shell is the see-through outline.
        const shell = id === 'airframe', skin = inspect && shell;
        if (skin) m.color.copy(o.userData.baseColor).lerp(XRAY, 0.6);
        else m.color.copy(o.userData.baseColor).lerp(tmp.set(hc), shell ? 0 : c * (o.userData.keep ? 0.12 : isSel ? 0.35 : inspect ? 0.22 : 0.3));
        m.emissive.set(hc);
        m.emissiveIntensity = skin || shell ? 0 : isSel ? 0.45 : isHover ? 0.35 : isFlag ? c * 0.25 : c * (inspect ? 0.08 : 0.05);
        const ghost = show && id !== show && !isHover;
        // outside the inspector the shell fades like the unmonitored structure, so the components inside show
        const shellFade = (1 - 0.88 * rev) * (show ? 0.4 : 1);
        m.opacity = THREE.MathUtils.lerp(m.opacity, (isShown && !skin) || (skin && (only || (show && !frameOpen))) ? 0 : skin ? 0.16 : shell ? shellFade : ghost ? (inspect ? 0 : 0.12) : swap ? 1 - c : 1, inspect && ghost ? 0.25 : 0.15);
        o.visible = m.opacity > 0.02;
        m.depthWrite = m.opacity > 0.6;
        if (shell) dimShine(o, m);
        const want = m.opacity < 0.98 || !!o.userData.origTransparent;
        if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; }
        if (ghost) m.color.lerp(white, 0.4);
      });
    }

    // camera: frame the whole machine, or fly to the selected part; zoom buttons and reset
    const ctl = controls.current;
    if (ctl) {
      const wantTarget = tmpV.copy(prep.centre);
      let wantDist = R * (3.15 + (prep.exploded / R - 1) * 1.55 * e) * (insets.current.zoom || 1);
      if (dots && !inspect) wantDist *= THREE.MathUtils.lerp(1, XRAY_ZOOM[look] ?? 1, c);   // move in on the interior as the shell clears
      if (show && prep.parts[show]) {
        model.group.localToWorld(partAt(prep.parts[show], e, wantTarget));
        wantDist = THREE.MathUtils.clamp(prep.parts[show].radius * (show === 'airframe' && STRUCT_SPOT[look] ? 17 : look ? (inspect ? 9 : 6.2) : 9), R * 0.35, R * 2.8);   // the airframe hotspot is shown in context
      }
      if (cmd?.current?.reset) { focusN.current = 110; cmd.current.reset = false; }
      const easing = focusN.current > 0; if (easing) focusN.current -= 1;
      ctl.target.lerp(wantTarget, inspect ? 0.14 : focus ? 0.06 : 0.2);
      const dir = camera.position.clone().sub(ctl.target);
      if (!inspect || easing) camera.position.copy(ctl.target).add(dir.setLength(THREE.MathUtils.lerp(dir.length(), wantDist, focus ? 0.05 : 0.11)));
      else if (cmd?.current && cmd.current.zoom !== 1) {
        const z = cmd.current.zoom; cmd.current.zoom = 1;
        camera.position.copy(ctl.target).add(dir.multiplyScalar(z));
      }
      ctl.update();
    }
    const ins = insets.current;
    off.current.x = THREE.MathUtils.lerp(off.current.x, ins.x, 0.08);
    off.current.y = THREE.MathUtils.lerp(off.current.y, ins.y, 0.08);
    camera.setViewOffset(size.width, size.height, off.current.x, off.current.y, size.width, size.height);
  });

  const pick = (ev) => ev.intersections.find((h) => h.object.userData.dot && h.object.parent?.visible)?.object.userData.component   // a dot wins, even behind the shell
    ?? (ev.intersections.find((h) => h.object.userData.component && !h.object.userData.body && !h.object.userData.hiddenZone
    && h.object.visible && h.object.material.opacity > 0.2 && !(inspect && h.object.userData.component === 'airframe'))?.object.userData.component || null);
  const selInfo = sel && parts[sel], hovInfo = hover && hover !== sel && parts[hover];
  const posOf = (id) => prep.parts[id] && partAt(prep.parts[id], inspect ? (explode?.current ? 1 : 0) : 1, new THREE.Vector3());

  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, R * (light ? 10 : 6), R * (light ? 28 : 16)]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[R * 2, R * 4, R * 2]} intensity={2.4} color="#fff4e6" castShadow={!lite}
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} shadow-normalBias={0.02}
        shadow-camera-left={-R * 3} shadow-camera-right={R * 3} shadow-camera-top={R * 3} shadow-camera-bottom={-R * 3} shadow-camera-far={R * 12} />
      <spotLight position={[-R * 3, R * 2, -R * 2]} intensity={40} angle={0.6} penumbra={1} color="#cfe3ff" distance={R * 12} />
      <Environment resolution={lite ? 256 : 512}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[12, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.6} position={[-6, 1.5, 1]} rotation-y={Math.PI / 2} scale={[8, 1.2, 1]} color="#cfe9ff" />
        <Lightformer form="rect" intensity={1.2} position={[6, 1, 3]} rotation-y={-Math.PI / 2} scale={[8, 1, 1]} color="#ffe8c7" />
      </Environment>

      <group ref={spin} position={[prep.centre.x, 0, prep.centre.z]}>
        <group position={[-prep.centre.x, 0, -prep.centre.z]}>
          <primitive object={model.group}
            onPointerMove={(ev) => { ev.stopPropagation(); const id = pick(ev); if (id !== hover) onHover(id); document.body.style.cursor = id ? 'pointer' : ''; }}
            onPointerOut={() => { onHover(null); document.body.style.cursor = ''; }}
            onClick={(ev) => { ev.stopPropagation(); const id = pick(ev); if (id) onSelect(id); }} />
          {inspect && <Dots prep={prep} parts={parts} eRef={eRef} showRef={showRef} hidden={show} onSelect={onSelect} onHover={onHover} only={dotIds} />}
          {dots && !inspect && <Detailed prep={prep} parts={parts} eRef={eRef} showRef={showRef} look={look} />}
          {inspect && look && <Detailed prep={prep} parts={parts} eRef={eRef} showRef={showRef} look={look} hide={show} onSelect={onSelect} onHover={onHover} />}
          {dots && !inspect && <Callouts prep={prep} parts={parts} eRef={eRef} showRef={showRef} look={look} onSelect={onSelect} avoid=".hero3d-copy" />}
          {look && show && prep.parts[show] && <Internal key={show} look={look} id={show} part={parts[show]} at={posOf(show)} r={prep.parts[show].radius} floor={prep.floor - R * 0.27} />}
          {selInfo && posOf(sel) && !look && (
            <Html position={posOf(sel)} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
              <div className="anno" style={{ '--c': healthColor(selInfo.health, selInfo.verdict) }}>
                <span className="anno-dot" />
                <div className="anno-box"><b>{selInfo.name}</b><span>{Math.round((selInfo.health ?? 0) * 100)}% · {selInfo.verdict}</span></div>
              </div>
            </Html>
          )}
          {hovInfo && posOf(hover) && !dots && (
            <Html position={posOf(hover)} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
              <div className="hover-tag" style={{ '--c': healthColor(hovInfo.health, hovInfo.verdict) }}>{hovInfo.name}<b>{Math.round((hovInfo.health ?? 0) * 100)}%</b></div>
            </Html>
          )}
        </group>
      </group>

      {lite ? (
        <ContactShadows position={[prep.centre.x, prep.floor - R * 0.279, prep.centre.z]} scale={R * 7} blur={2.4} far={R * 3} opacity={light ? 0.35 : 0.5} resolution={256} frames={1} />
      ) : (
        <>
          <mesh rotation-x={-Math.PI / 2} position={[prep.centre.x, prep.floor - R * 0.28, prep.centre.z]} receiveShadow>
            <circleGeometry args={[R * 14, 64]} />
            <meshStandardMaterial color={light ? '#dddde2' : '#121216'} roughness={0.9} metalness={0.1} />
          </mesh>
          <ContactShadows position={[prep.centre.x, prep.floor - R * 0.279, prep.centre.z]} scale={R * 7} blur={2.4} far={R * 3} opacity={light ? 0.42 : 0.6} resolution={512} />
        </>
      )}

      <OrbitControls ref={controls} enableZoom={inspect} enablePan={false} enableDamping dampingFactor={0.08} minPolarAngle={0.2} maxPolarAngle={Math.PI / 1.9}
        minDistance={R * 0.25} maxDistance={R * 9} />
      {!lite && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.6} />
          <ToneMapping mode={ToneMappingMode.AGX} />
        </EffectComposer>
      )}
    </>
  );
}
