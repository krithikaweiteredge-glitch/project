// The twin-engine fighter: "Su-30 MKI loadout#1 [Brahmos]" by abhinab.das000 (Sketchfab), CC BY 4.0 -
// public/models/su30. Saved merged by material, so it is split into IVHM's 19 monitored parts by position
// (raw model coordinates, see realsplit.js: nose at y -11.7, tail at +10.7, z up; measured from the model).
import { splitModel } from './realsplit';

export const SU30_URL = './models/su30/scene.gltf';

// meshes of the weapons (BrahMos, wing missiles, seekers), the canopy and the crew: structure, never monitored
const STRUCTURE = ['73seeker', 'AGMMat.001', 'AGMMat.002', 'Material.003', 'Material.004', 'Material.005', 'SovietSeekerDome', 'glass'];

function classify(x, y, z, material) {
  const ax = Math.abs(x), right = x < 0;
  if (material === 'nozzle') return right ? 'engine_2' : 'engine_1';
  if (STRUCTURE.includes(material) || material.startsWith('cockpit') || material.startsWith('Pilot')) return null;
  if (ax < 0.6 && y > -3.5 && y < -1.0 && z < -1.15) return 'landing_gear_1';                                   // nose gear
  if (ax > 1.15 && ax < 2.5 && y > 1.0 && y < 4.5 && z < -1.2) return right ? 'landing_gear_3' : 'landing_gear_2'; // main gear
  if (ax > 5.0 && ax < 7.05 && z > -0.35 && z < 0.1 && y > 4.7 + 0.35 * (ax - 5)) return right ? 'flight_actuator_1' : 'flight_actuator_2';  // ailerons
  if (ax > 2.4 && ax < 4.8 && y > 7.2 && z < -0.55) return right ? 'flight_actuator_3' : 'flight_actuator_4';  // all-moving tailplanes
  if (ax > 2.0 && ax < 2.5 && z > 1.0 && y > 6.55) return right ? 'flight_actuator_5' : 'flight_actuator_6';   // rudders
  return 'airframe';
}

const ZONES = {
  avionics: [[0, -8.2, 0.1], [0.9, 2.2, 0.8]],
  electrical: [[0, -3.0, -0.2], [0.9, 1.4, 0.6]],
  ecs: [[0, -1.2, 0.3], [0.9, 1.2, 0.5]],
  fuel: [[0, 1.8, -0.2], [2.2, 4.4, 0.6]],
  hydraulics_1: [[1.0, 5.6, -0.4], [0.5, 0.9, 0.4]],
  hydraulics_2: [[-1.0, 5.6, -0.4], [0.5, 0.9, 0.4]],
  apu: [[0, 7.0, -0.2], [0.5, 0.9, 0.4]],
  // each engine's full length inside its nacelle, so its dot, label and detailed model sit on the engine
  engine_1: [[1.15, 4.4, -0.65], [0.9, 6.6, 0.85]],
  engine_2: [[-1.15, 4.4, -0.65], [0.9, 6.6, 0.85]],
};

export const composeSu30 = (scene) => splitModel(scene, { classify, zones: ZONES, rawLength: 22.4, length: 9.6 });
