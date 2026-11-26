// The MALE UAV: "DRDO Rustom 2 UAV" by Priyajit Bera (Sketchfab), CC BY 4.0 - public/models/rustom2. India's
// Rustom-2 (TAPAS-BH-201): a long straight wing, a T-tail on a slim boom, two Rotax 914 engines turning tractor
// propellers at the front of the wing nacelles, the main gear folding into the nacelles, a sensor turret under the
// nose. Simplified for the web (2.03M -> 198k triangles); the four underwing weapon pods are left out.
// The model is saved with the nose at +X and the span along Y; AXES turns it into the raw frame of realsplit.js
// (x across, -x the right wing; y along, nose at -y; z up). Measured there: nose at y -12, tail at +7.7, wing
// from y -5.7 to -2.2 at z 0.8-1.5 spanning 41, nacelles at |x| 4.5, propeller discs at y -8.8 to -7.4.
import * as THREE from 'three';
import { splitModel } from './realsplit';

export const RUSTOM_URL = './models/rustom2/scene.gltf';
const AXES = new THREE.Matrix4().set(0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

const GEAR = ['tire', 'steel', 'cable'];

function classify(x, y, z, material) {
  const ax = Math.abs(x), right = x < 0;
  const side = (r, l) => (right ? r : l);
  if (material === 'Material.002' || material === 'MISSILE_ENGINE') return false;      // the weapon pods
  if (material === 'Material' && z < 0.7 && ax > 6.5 && y > -6.5 && y < -1) return false;  // and their pylons
  if (GEAR.includes(material) || (material === 'Metalic' && z < -1.1)) return 'landing_gear';
  if (y > -8.95 && y < -7.35 && ax > 2.3 && ax < 6.6) return side('propeller_1', 'propeller_2');   // propeller discs
  if (ax > 13.5 && ax < 19.6 && y > -2.9 && z > 0.7 && z < 1.7) return side('actuator_1', 'actuator_2');  // ailerons
  if (z > 4.4 && ax > 0.5 && y > 6.0) return 'actuator_3';                              // elevator on the T-tail
  if (ax < 0.45 && z > 1.6 && z < 4.5 && y > 6.0) return 'actuator_4';                  // rudder
  return 'airframe';                                                                    // the see-through shell
}

// systems inside the shell: [centre], [across, length, up]
const ZONES = {
  engine_1: [[-4.5, -6.6, 0.25], [1.2, 2.4, 1.2]],          // Rotax 914s in the front of the nacelles
  engine_2: [[4.5, -6.6, 0.25], [1.2, 2.4, 1.2]],
  avionics: [[0, -10.4, 0.5], [1.5, 2.0, 1.1]],              // flight computer and datalink in the nose
  electrical: [[0, -7.4, 0.4], [1.5, 1.6, 0.9]],
  fuel: [[0, -4.0, 0.7], [2.6, 3.0, 1.0]],                   // tank in the wing box
};

const RAW_LENGTH = 19.7, LENGTH = 6, S = LENGTH / RAW_LENGTH;
/** raw model point -> site point (the same turn and scale splitModel applies) */
const site = (x, y, z) => new THREE.Vector3(-y * S, z * S, -x * S);

// the model's own materials are flat and brownish: give it the Rustom-2's light-grey scheme and real finishes
const FINISH = {
  Material: [0xc6cbd0, 0.1, 0.55],      // airframe paint: [colour, metalness, roughness]
  'Material.001': [0xc6cbd0, 0.1, 0.55],
  Metalic: [0x8e949b, 0.6, 0.4],        // nacelles and gear legs
  steel: [0xb9bec4, 0.9, 0.28],
  tire: [0x1b1c1f, 0, 0.9],
  cable: [0x2b2d31, 0.2, 0.6],
  Sensor: [0x22262c, 0.3, 0.35],        // propeller blades and the sensor turret
  white: [0xe9ebed, 0.1, 0.45],
};

/** Indian Air Force roundel: saffron, white and green rings */
function roundel(r) {
  const g = new THREE.Group();
  [[r, 0xff9933], [r * 0.66, 0xffffff], [r * 0.33, 0x138808]].forEach(([rr, c], i) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(rr, 48), decal(c));
    m.position.z = i * 0.002; g.add(m);
  });
  return g;
}
/** fin flash: saffron, white and green bands, saffron leading */
function finFlash(w, h) {
  const g = new THREE.Group();
  [0xff9933, 0xffffff, 0x138808].forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w / 3, h), decal(c));
    m.position.x = (1 - i) * (w / 3); g.add(m);
  });
  return g;
}
const decal = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });

/** markings as meshes of the airframe, so they fade, tint and outline with the shell */
function mark(model) {
  const shell = model.group.children.find((c) => c.userData.component === 'airframe');
  if (!shell) return;
  const put = (obj) => {
    obj.updateMatrixWorld(true);
    const meshes = []; obj.traverse((o) => o.isMesh && meshes.push(o));   // (collect first: adding to the shell moves them)
    for (const o of meshes) {
      o.geometry.applyMatrix4(o.matrixWorld); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
      o.userData = { keep: true, base: o.material.color.getHex(), component: 'airframe' };
      shell.add(o); model.parts.airframe.push(o);
    }
  };
  for (const x of [-15, 15]) {                                  // on top of each outer wing
    const r = roundel(1.05 * S); r.position.copy(site(x, -3.85, 1.535)); r.rotation.x = -Math.PI / 2; put(r);
  }
  for (const x of [-0.25, 0.25]) {                              // both sides of the fin
    const f = finFlash(1.2 * S, 0.7 * S); f.position.copy(site(x, 5.35, 3.0)); put(f);   // a plane faces across the aircraft already
  }
}

export function composeRustom(scene) {
  const model = splitModel(scene, { classify, zones: ZONES, rawLength: RAW_LENGTH, length: LENGTH, axes: AXES });
  model.group.traverse((o) => {
    const f = o.isMesh && !o.userData.zone && FINISH[o.material.name];
    if (!f) return;
    o.material.color.setHex(f[0]); o.material.metalness = f[1]; o.material.roughness = f[2];
    o.userData.base = f[0];
  });
  mark(model);
  return model;
}
