// The airliner: "Air India A321 Exteriors + Interiors" by harshpriyanshu22 (Sketchfab), CC BY 4.0 -
// public/models/a321. An A320-family jet in Air India colours (vertex colours, no textures) with its cabin modelled
// inside, so the x-ray shows the seat rows around the systems. Simplified for the web (475k -> 117k triangles).
// The model is saved Y-up with the nose at +Z and in large units; AXES turns it into the raw frame of realsplit.js
// (x across, -x the right wing; y along, nose at -y; z up). Positions below are in units of U (1e4 model units):
// the jet is 98 U long, the wings span 75 U, the fuselage axis is at z -5.5.
import * as THREE from 'three';
import { splitModel } from './realsplit';

export const A321_URL = './models/a321/scene.gltf';
const U = 1e4;
const AXES = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);

const wingTE = (ax) => 2.8 + (ax - 6) * 0.24;            // trailing edge of the wing, measured from the model
const stabTE = (ax) => 46.4 + (ax - 3) * 0.15;           // trailing edge of the tailplane

function classify(rx, ry, rz) {
  const x = rx / U, y = ry / U, z = rz / U, ax = Math.abs(x), right = x < 0;
  const side = (r, l) => (right ? r : l);
  // engines: the CFM56 nacelles under the wings
  if (Math.hypot(ax - 12.6, z + 10.3) < 3.4 && y > -16.6 && y < -6.4) return side('engine_1', 'engine_2');
  // landing gear: nose gear under the cockpit, main gear under the wing roots
  if (z < -10.2 && ax < 1.6 && y < -33 && y > -41) return 'landing_gear_1';
  if (z < -10.2 && ax > 4 && ax < 9 && y > -4.5 && y < 1.5) return side('landing_gear_2', 'landing_gear_3');
  // wing: ailerons outboard, flaps inboard, a spoiler on the right wing, an inboard panel each side
  const onWing = ax > 6.5 && z > -9.6 && z < -2.5 && y > -16 && y < 11;
  if (onWing) {
    const te = wingTE(ax);
    if (ax > 26 && ax < 35 && y > te - 1.6) return side('flight_actuator_1', 'flight_actuator_2');
    if (ax > 13 && ax < 23 && y > te - 1.6) return side('flight_actuator_3', 'flight_actuator_4');
    if (right && ax > 15 && ax < 22 && y > te - 3.2 && y <= te - 1.6 && z > -7.3) return 'flight_actuator_8';
    if (ax > 7 && ax < 12.5 && y > -3 && y < -0.5 && z > -7.6) return side('wing_panel_1', 'wing_panel_2');
  }
  // tail: elevators on the tailplane, rudder on the fin
  if (ax > 3.5 && ax < 15.5 && z > -3.4 && z < -2.1 && y > stabTE(ax) - 1.5) return side('flight_actuator_5', 'flight_actuator_6');
  if (ax < 1 && z > 0.5 && z < 12.6 && y > 47.4 - z * 0.05) return 'flight_actuator_7';
  return 'airframe';                                      // the skin, wings, tail and cabin: the see-through shell
}

// systems inside the fuselage and wing box: [centre], [across, length, up], in U
const Z = {
  avionics: [[0, -40, -8.4], [3.2, 4.5, 1.6]],              // avionics bay under the cockpit
  electrical: [[0, -33, -8.6], [3, 4, 1.4]],
  ecs_1: [[-1.8, -4.5, -9.0], [2, 5, 1.3]], ecs_2: [[1.8, -4.5, -9.0], [2, 5, 1.3]],   // air-conditioning packs
  hydraulics_1: [[-2.6, 3.5, -8.8], [1.6, 2.6, 1.2]], hydraulics_2: [[2.6, 3.5, -8.8], [1.6, 2.6, 1.2]],
  hydraulics_3: [[0, 28, -7.2], [1.6, 2.6, 1.2]],
  fuel: [[0, -2.5, -8.0], [9, 5, 1.0]],                     // centre and inner wing tanks
  apu: [[0, 46.5, -3.4], [2, 3.2, 1.8]],                    // the APU in the tail cone
};
const ZONES = Object.fromEntries(Object.entries(Z).map(([k, [c, s]]) => [k, [c.map((v) => v * U), s.map((v) => v * U)]]));

export const composeA321 = (scene) => splitModel(scene, { classify, zones: ZONES, rawLength: 98.3 * U, length: 11, axes: AXES });
