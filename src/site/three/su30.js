// The twin-engine fighter page uses a real aircraft model:
// "Su-30 MKI loadout#1 [Brahmos]" by abhinab.das000 (Sketchfab), CC BY 4.0 - public/models/su30.
// The model was saved merged by material, so its engines, landing gear and control surfaces are not separate
// objects. composeSu30 splits its triangles into IVHM's monitored parts by where they sit on the real aircraft,
// and adds see-through volumes for the systems inside (avionics, fuel, power, hydraulics, air conditioning, APU).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const SU30_URL = './models/su30/scene.gltf';

// meshes of the weapons (BrahMos, wing missiles, seekers): structure, never monitored
const WEAPON_MATERIALS = ['73seeker', 'AGMMat.001', 'AGMMat.002', 'Material.003', 'Material.004', 'Material.005', 'SovietSeekerDome'];

/**
 * Which monitored part a triangle belongs to, from its centre in the model's own coordinates
 * (x across the wings, y from the nose at -11.7 to the tail at +10.7, z up; measured from the model).
 * Right and left: the model's -x side is the aircraft's right (starboard).
 */
function classify(x, y, z, material) {
  const ax = Math.abs(x), right = x < 0;
  if (material === 'nozzle') return right ? 'engine_2' : 'engine_1';
  if (WEAPON_MATERIALS.includes(material) || material === 'glass' || material.startsWith('cockpit') || material.startsWith('Pilot')) return null;
  if (ax < 0.6 && y > -3.5 && y < -1.0 && z < -1.15) return 'landing_gear_1';                         // nose gear
  if (ax > 1.15 && ax < 2.5 && y > 1.0 && y < 4.5 && z < -1.2) return right ? 'landing_gear_3' : 'landing_gear_2';   // main gear
  if (ax > 5.0 && ax < 7.05 && z > -0.35 && z < 0.1 && y > 4.7 + 0.35 * (ax - 5)) return right ? 'flight_actuator_1' : 'flight_actuator_2';  // ailerons
  if (ax > 2.4 && ax < 4.8 && y > 7.2 && z < -0.55) return right ? 'flight_actuator_3' : 'flight_actuator_4';   // all-moving tailplanes
  if (ax > 2.0 && ax < 2.5 && z > 1.0 && y > 6.55) return right ? 'flight_actuator_5' : 'flight_actuator_6';    // rudders
  return 'airframe';
}

// systems inside the airframe, as see-through volumes (model coordinates: centre, size)
const ZONES = {
  avionics: [[0, -8.2, 0.1], [0.9, 2.2, 0.8]],
  electrical: [[0, -3.0, -0.2], [0.9, 1.4, 0.6]],
  ecs: [[0, -1.2, 0.3], [0.9, 1.2, 0.5]],
  fuel: [[0, 1.8, -0.2], [2.2, 4.4, 0.6]],
  hydraulics_1: [[1.0, 5.6, -0.4], [0.5, 0.9, 0.4]],
  hydraulics_2: [[-1.0, 5.6, -0.4], [0.5, 0.9, 0.4]],
  apu: [[0, 7.0, -0.2], [0.5, 0.9, 0.4]],
};
// the full length of each engine inside its nacelle, so the engine's dot, label and detailed model sit on the
// engine itself and not only on its nozzle
const ENGINE_BODY = { engine_1: [[1.15, 4.4, -0.65], [0.9, 6.6, 0.85]], engine_2: [[-1.15, 4.4, -0.65], [0.9, 6.6, 0.85]] };

// model -> site frame: the nose to +X, up to +Y, right to +Z; scaled to the other fighters' size
const LENGTH = 9.6, SCALE = LENGTH / 22.4;
const toSite = new THREE.Matrix4().set(0, -SCALE, 0, 0, 0, 0, SCALE, 0, -SCALE, 0, 0, 0, 0, 0, 0, 1);

export function composeSu30(gltfScene) {
  const root = gltfScene.clone(true);
  root.updateMatrixWorld(true);
  const group = new THREE.Group(), parts = {};
  const buckets = new Map();   // part (or body) + material -> { positions, normals, uvs }
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

  // work in the model's raw coordinates (the ones the regions were measured in): undo the Z-up -> Y-up turn
  // that Sketchfab puts on its root node
  const base = root.getObjectByName('Sketchfab_model');
  const raw = base ? base.matrixWorld.clone().invert() : new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(raw.clone().multiply(o.matrixWorld));
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    for (let i = 0; i < pos.count; i += 3) {
      for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, i + k);
      const cx = (v[0].x + v[1].x + v[2].x) / 3, cy = (v[0].y + v[1].y + v[2].y) / 3, cz = (v[0].z + v[1].z + v[2].z) / 3;
      const comp = classify(cx, cy, cz, mat.name || '');
      const key = `${comp || '-'}|${mat.uuid}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { comp, mat, p: [], n: [], t: [] }));
      for (let k = 0; k < 3; k++) {
        b.p.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
        if (nor) b.n.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k));
        if (uv) b.t.push(uv.getX(i + k), uv.getY(i + k));
      }
    }
  });

  const holders = {};   // one group per monitored part, so the twin moves and colours it as one piece
  const holder = (comp) => {
    if (!comp) return group;
    if (!holders[comp]) { const h = new THREE.Group(); h.userData.component = comp; group.add(h); holders[comp] = h; }
    return holders[comp];
  };
  for (const { comp, mat, p, n, t } of buckets.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    if (n.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); else g.computeVertexNormals();
    if (t.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(t, 2));
    g.applyMatrix4(toSite);
    const m = new THREE.Mesh(g, mat.clone());
    m.userData = { keep: true, base: mat.color.getHex(), mat: 'paint', ...(comp ? { component: comp } : {}) };
    holder(comp).add(m);
    if (comp) (parts[comp] = parts[comp] || []).push(m);
  }

  const volume = (comp, [c, s]) => {
    // model size [across, length, up] -> site box [length (X), up (Y), across (Z)]
    const b = new THREE.Mesh(new RoundedBoxGeometry(s[1], s[2], s[0], 2, Math.min(...s) * 0.2),
      new THREE.MeshStandardMaterial({ color: 0x9fc2e0, transparent: true, opacity: 0.3 }));
    b.position.set(c[0], c[1], c[2]).applyMatrix4(toSite);
    b.scale.setScalar(SCALE);
    b.userData = { component: comp, base: 0x9fc2e0, mat: 'glass', zone: true };
    holder(comp).add(b); (parts[comp] = parts[comp] || []).push(b);
  };
  for (const [comp, z] of Object.entries(ZONES)) volume(comp, z);
  for (const [comp, z] of Object.entries(ENGINE_BODY)) volume(comp, z);

  return { group, parts, spinners: [], missing: [] };
}
