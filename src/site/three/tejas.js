// The single-engine fighter: "HAL Tejas" by dimal965 (Sketchfab), CC BY 4.0 - public/models/tejas
// (textures reduced to 2048 px JPEG for the web). The whole airframe is one mesh, so it is split into IVHM's
// 16 monitored parts by position (raw model coordinates, see realsplit.js: nose at y -9.75, tail at +3.16,
// z up with the wheels at z 0; measured from the model).
import { splitModel } from './realsplit';

export const TEJAS_URL = './models/tejas/scene.gltf';

function classify(x, y, z, material) {
  const ax = Math.abs(x), right = x < 0;
  if (material === 'HAL_Tejas_glass') return null;                                                       // canopy glazing
  if (y > 2.3 && z < 2.35 && ax < 0.8) return 'engine';                                                  // F404 exhaust nozzle
  if (ax < 0.3 && y > -5.6 && y < -4.6 && z < 0.85) return 'landing_gear_1';                              // nose gear
  if (ax > 0.6 && ax < 1.25 && y > -1.95 && y < -0.75 && z < 0.9) return right ? 'landing_gear_3' : 'landing_gear_2';   // main gear
  if (z > 1.0 && z < 1.85 && y > 1.15 && ax > 1.6 && ax < 2.8) return right ? 'flight_actuator_1' : 'flight_actuator_2';  // inboard elevons
  if (z > 1.0 && z < 1.85 && y > 1.15 && ax >= 2.8 && ax < 4.05) return right ? 'flight_actuator_3' : 'flight_actuator_4'; // outboard elevons
  if (ax < 0.2 && z > 2.65 && z < 4.05 && y > 2.25) return 'flight_actuator_5';                           // rudder
  return 'airframe';
}

const ZONES = {
  avionics: [[0, -8.3, 1.5], [0.6, 1.6, 0.6]],
  ecs: [[0, -4.0, 1.9], [0.6, 0.9, 0.5]],
  electrical: [[0, -3.2, 1.3], [0.6, 1.0, 0.5]],
  fuel: [[0, -1.0, 1.4], [2.4, 3.0, 0.4]],
  hydraulics_1: [[0.45, 0.6, 1.2], [0.4, 0.7, 0.35]],
  hydraulics_2: [[-0.45, 0.6, 1.2], [0.4, 0.7, 0.35]],
  // the F404's full length inside the fuselage, so its dot, label and detailed model sit on the engine
  engine: [[0, 0.2, 1.65], [0.9, 4.6, 0.9]],
};

export const composeTejas = (scene) => splitModel(scene, { classify, zones: ZONES, rawLength: 12.9, length: 8.2 });
