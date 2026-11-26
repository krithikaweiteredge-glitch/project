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

export const composeRustom = (scene) => splitModel(scene, { classify, zones: ZONES, rawLength: 19.7, length: 6, axes: AXES });
