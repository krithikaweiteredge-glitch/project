// The quadcopter: "DJI Matrice M300 RTK + DJI Zenmuse P1" by FCCKudo (Sketchfab), CC BY 4.0 - public/models/m300
// (a 3D scan; texture reduced to 2048 px for the web). The scan is one mesh that includes the landing pad and
// ground it was scanned on: those are dropped, and the drone is split into IVHM's 14 monitored parts by position.
// Raw model coordinates (see realsplit.js): x and y across, z up; the drone sits on the pad at z -0.07.
import { splitModel } from './realsplit';

export const M300_URL = './models/m300/scene.gltf';

// the four arms, by direction seen from above (degrees, measured from the scan)
const ARMS = [-105, -25, 85, 170];

function classify(x, y, z) {
  if (z < -0.07) return false;                                   // the landing pad and the ground: not part of the drone
  const r = Math.hypot(x, y), a = (Math.atan2(-y, x) * 180) / Math.PI;
  if (r < 0.22) {
    if (z > 0.15) return 'battery';                              // the battery slots on top
    if (z < 0.0) return null;                                    // landing legs and the Zenmuse P1 camera: structure
    return 'avionics';                                           // the body: flight controller and electronics
  }
  const k = ARMS.reduce((best, c, i) => (Math.abs(((a - c + 540) % 360) - 180) < Math.abs(((a - ARMS[best] + 540) % 360) - 180) ? i : best), 0) + 1;
  // the motor is the compact pod at the arm tip; the folded propeller blades hang beside and below it
  if (r >= 0.40) return r < 0.50 && z > 0.02 && z < 0.14 ? `motor_${k}` : `propeller_${k}`;
  return `esc_${k}`;                                             // the arm, where the speed controller sits
}

export const composeM300 = (scene) => splitModel(scene, { classify, rawLength: 1, length: 2.1 });
