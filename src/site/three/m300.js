// The quadcopter: "Quadcopter DJI Matrice 300 RTK" by 19vitali99 (Sketchfab), CC BY 4.0 - public/models/m300.
// A modelled (not scanned) M300 with its propellers out. For the web the carry case it stands on is dropped and the
// mesh simplified (888k -> 103k triangles, meshoptimizer). The body, arms, legs and camera are the see-through
// shell; the four motor pods and propellers are monitored parts of their own; the speed controllers in the arms,
// the batteries on top and the flight controller in the body are volumes inside the shell.
// Raw model coordinates (see realsplit.js): x across (-x is the drone's right), y along (nose, the camera side, at
// -y), z up; the legs stand at z 4.1, the arms are at z 6.6-7.9, the body top at z 9.
import { splitModel } from './realsplit';

export const M300_URL = './models/m300/scene.gltf';

// motor pod centres, numbered like the site's quadcopter: 1 front-right, 2 rear-right, 3 rear-left, 4 front-left
const PODS = [[-3.8, -3.0], [-3.4, 3.36], [3.41, 3.37], [3.8, -3.0]];
const nearest = (x, y) => PODS.reduce((b, p, i) => (Math.hypot(x - p[0], y - p[1]) < Math.hypot(x - PODS[b][0], y - PODS[b][1]) ? i : b), 0);

function classify(x, y, z, material) {
  const k = nearest(x, y), [px, py] = PODS[k], d = Math.hypot(x - px, y - py), r = Math.hypot(x, y);
  if (material === 'lambert20' && r > 2.3) return `propeller_${k + 1}`;   // the blades
  if (d < 0.62 && z > 6.5) return `motor_${k + 1}`;                        // the motor pod at the arm tip
  return null;                                                              // body, arms, legs, camera: the shell
}

// volumes inside the shell: [centre], [across, length, up]
const zone = (k) => {
  const [px, py] = PODS[k];
  return [[px * 0.55, py * 0.55, 7.05], [0.55, 0.55, 0.3]];               // speed controller, inside the arm
};
const ZONES = {
  esc_1: zone(0), esc_2: zone(1), esc_3: zone(2), esc_4: zone(3),
  battery: [[0, -0.3, 8.35], [2.2, 1.6, 0.9]],                               // the two TB60 batteries on top
  avionics: [[0, 0.3, 7.4], [2.0, 2.4, 0.6]],                                // flight controller and electronics
};

export const composeM300 = (scene) => splitModel(scene, { classify, zones: ZONES, rawLength: 11, length: 2.4 });
