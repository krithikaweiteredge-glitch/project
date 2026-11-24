// Real 3D models from NASA 3D Resources (public domain, github.com/nasa/NASA-3D-Resources), in public/models/nasa.
// The real hardware replaces the shape-built skin; IVHM's monitored parts that the real model has no separate
// piece for (engines, actuators, wheels, avionics...) stay as the detailed pieces from models.js.
import * as THREE from 'three';
import { buildModel } from './models';

export const NASA = {
  hubble: './models/nasa/hubble.glb',
  et: './models/nasa/external_tank.glb',
  srb: './models/nasa/srb.glb',
};
export const DRACO = './draco/';                 // decoder served with the site (no CDN)

/** marks every mesh of a real model: keep its own textured material, belong to a component (or to the structure) */
function adopt(root, comp, parts) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.userData = { keep: true, base: o.material.color?.getHex?.() ?? 0xffffff, ...(comp ? { component: comp } : {}) };
    if (comp) (parts[comp] ||= []).push(o);
  });
  if (comp) root.userData.component = comp;
  return root;
}
/** wraps a model so its long axis lies along `axis`, scaled to `length`, centred on `at` */
function fit(scene, { length, axis = 'x', at = [0, 0, 0], rotate }) {
  const inner = scene.clone(true);
  if (rotate) inner.rotation.set(...rotate);
  const g = new THREE.Group(); g.add(inner);
  g.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3());
  if (!rotate) {                                  // turn the longest axis onto the wanted one
    const long = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
    if (long !== axis) {
      if (axis === 'x') inner.rotation.set(long === 'y' ? 0 : 0, long === 'z' ? Math.PI / 2 : 0, long === 'y' ? Math.PI / 2 : 0);
      if (axis === 'y') inner.rotation.set(long === 'z' ? Math.PI / 2 : 0, 0, long === 'x' ? Math.PI / 2 : 0);
      g.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(g); size = box.getSize(new THREE.Vector3());
    }
  }
  const k = length / Math.max(size.x, size.y, size.z);
  g.scale.setScalar(k);
  const c = box.getCenter(new THREE.Vector3()).multiplyScalar(k);
  g.position.set(at[0] - c.x, at[1] - c.y, at[2] - c.z);
  g.updateMatrixWorld(true);
  return { group: g, size: size.multiplyScalar(k) };
}
const topChild = (m, id) => m.group.children.find((c) => c.userData.component === id);
function strip(m, keep) {
  for (const child of [...m.group.children]) {
    const id = child.userData.component || [...(child.children || [])].find((c) => c.userData.component)?.userData.component;
    if (!id || !keep(id)) m.group.remove(child);
  }
  for (const id of Object.keys(m.parts)) if (!keep(id)) delete m.parts[id];
  m.spinners = m.spinners.filter((s) => { let ok = false; s.traverseAncestors((a) => { if (a === m.group) ok = true; }); return ok; });
}

/** launch vehicle: real Space Shuttle external tank as the core stage, two real solid rocket boosters, IVHM's engines below */
export function composeLaunch(etScene, srbScene) {
  const m = buildModel('launch_vehicle', []);
  strip(m, (id) => !['structure', 'solid_booster_1', 'solid_booster_2'].includes(id));
  // both models lie along X with the nose at +X: a quarter turn stands them up
  const H = 8.6;
  const et = fit(etScene, { length: H, rotate: [0, 0, Math.PI / 2], at: [0, 0.15, 0] });
  m.group.add(adopt(et.group, 'structure', m.parts));
  const r = et.size.x / 2;
  const srbLen = H * (1781 / 1880);                // real proportions: booster 45.5 m, tank 47 m
  for (const [k, z] of [[1, 1], [2, -1]]) {
    const b = fit(srbScene, { length: srbLen, rotate: [0, 0, Math.PI / 2], at: [0, 0.15 - (H - srbLen) / 2, 0] });
    b.group.position.z += z * (r * 0.86 + b.size.x / 2);
    m.group.add(adopt(b.group, `solid_booster_${k}`, m.parts));
  }
  // engines, actuators and avionics sit at the base and top of the real core stage
  const base = 0.15 - H / 2;
  for (const [id, x] of [['liquid_engine_1', 0.26], ['liquid_engine_2', -0.26]]) { const c = topChild(m, id); if (c) c.position.set(x, base - 0.35, 0); }
  ['actuator_1', 'actuator_2', 'actuator_3', 'actuator_4'].forEach((id, i) => {
    const c = topChild(m, id); if (!c) return;
    const a = (i / 4) * Math.PI * 2; c.position.set(Math.cos(a) * r * 0.75, base + 0.25, Math.sin(a) * r * 0.75);
  });
  const av = topChild(m, 'avionics'); if (av) av.position.set(0, 0.15 + H * 0.33, 0);
  const th = topChild(m, 'thermal'); if (th) th.position.set(0, 0.15 + H * 0.2, 0);
  return m;
}

/** satellite: the real Hubble Space Telescope; its solar arrays become the solar_power part */
export function composeSatellite(hubbleScene) {
  const m = buildModel('satellite', []);
  strip(m, (id) => !['thermal', 'solar_power'].includes(id));
  const hb = fit(hubbleScene, { length: 5.2, axis: 'x' });
  const L = hb.size.x;
  // split the real model: thin, wide pieces are the solar arrays; everything else is the insulated body
  const total = new THREE.Box3().setFromObject(hb.group).getSize(new THREE.Vector3());
  hb.group.traverse((o) => {
    if (!o.isMesh) return;
    const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    const dims = [s.x, s.y, s.z].sort((a, b) => a - b);
    // in NASA's Hubble model the two solar arrays are the 'hbltel_3' material
    const solar = o.material.name === 'hbltel_3' || (dims[0] / dims[2] < 0.06 && dims[2] > 0.35 * Math.max(total.y, total.z));
    o.userData = { keep: true, base: o.material.color?.getHex?.() ?? 0xffffff, component: solar ? 'solar_power' : 'thermal' };
    (m.parts[o.userData.component] ||= []).push(o);
  });
  // the solar meshes and the body explode separately: move solar meshes into their own top-level group
  const solarGroup = new THREE.Group(); solarGroup.userData.component = 'solar_power';
  const bodyGroup = hb.group; bodyGroup.userData.component = 'thermal';
  const solarMeshes = []; bodyGroup.traverse((o) => { if (o.isMesh && o.userData.component === 'solar_power') solarMeshes.push(o); });
  for (const o of solarMeshes) { const w = new THREE.Matrix4().copy(o.matrixWorld); o.removeFromParent(); w.decompose(o.position, o.quaternion, o.scale); solarGroup.add(o); }
  m.group.add(bodyGroup); if (solarMeshes.length) m.group.add(solarGroup);
  if (!solarMeshes.length) delete m.parts.solar_power;
  // wheels, thrusters, battery and avionics inside the aft equipment section
  const aft = -L * 0.32;
  [0, 1, 2, 3].forEach((i) => { const c = topChild(m, `reaction_wheel_${i + 1}`); if (c) c.position.set(aft + (i % 2 ? 0.25 : -0.25), (i < 2 ? 1 : -1) * 0.22, (i % 2 ? -1 : 1) * 0.22); });
  [0, 1, 2, 3].forEach((i) => { const c = topChild(m, `thruster_${i + 1}`); if (c) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; c.position.set(-L / 2 + 0.05, Math.cos(a) * 0.55, Math.sin(a) * 0.55); c.rotation.set(0, 0, Math.PI / 2); } });
  const bat = topChild(m, 'battery'); if (bat) bat.position.set(aft + 0.55, 0, 0.3);
  const av = topChild(m, 'avionics'); if (av) av.position.set(aft + 0.55, 0, -0.3);
  return m;
}
