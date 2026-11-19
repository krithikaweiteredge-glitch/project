import * as THREE from 'three';

// Fuselage radius along the body (x = nose +, tail -). Smooth Catmull-Rom through control points.
const CTRL = [
  [4.38, 0.0], [4.28, 0.13], [4.05, 0.3], [3.65, 0.47], [3.05, 0.62], [2.3, 0.72], [1.0, 0.77],
  [-0.6, 0.76], [-1.8, 0.7], [-2.7, 0.6], [-3.4, 0.44], [-3.9, 0.24], [-4.06, 0.12], [-4.1, 0.0],
];
const radiusCurve = new THREE.SplineCurve(CTRL.map(([x, r]) => new THREE.Vector2(x, r)));
const samples = radiusCurve.getSpacedPoints(400);
export function radiusAt(x) {
  let best = samples[0];
  for (const p of samples) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
  return Math.max(0, best.y);
}

/** A slice of the fuselage between x0 and x1 (x0 > x1), optionally only part of the way round. */
export function fuselageSlice(x0, x1, phiStart = 0, phiLength = Math.PI * 2, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = x1 + (x0 - x1) * (i / steps);
    pts.push(new THREE.Vector2(radiusAt(x), x));
  }
  const g = new THREE.LatheGeometry(pts, 72, phiStart, phiLength);
  g.rotateZ(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}
// Upper half: phi in [PI, 2PI] ends up on +y after the rotation above.
export const UPPER = [Math.PI, Math.PI];
export const LOWER = [0, Math.PI];

/** A flat planform extruded with rounded (bevelled) edges: wings, tail fins, antenna blade. */
export function planform(pts, depth, bevel = 0.03) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach((p) => s.lineTo(p[0], p[1]));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

export function wingGeometry() {
  const g = planform([[0.75, 0], [0.55, 7.2], [0.05, 7.4], [-0.45, 7.2], [-0.55, 0], [-0.45, -7.2], [0.05, -7.4], [0.55, -7.2]], 0.07, 0.035);
  g.rotateX(Math.PI / 2);
  return g;
}
export function finGeometry(side) {
  const g = planform([[0.0, 0], [-0.55, 1.6], [-0.95, 1.65], [-1.0, 0]], 0.05, 0.025);
  g.rotateX(side * -0.75);
  return g;
}
export function bladeGeometry() {
  return planform([[0.0, 0], [-0.18, -0.42], [-0.32, -0.42], [-0.3, 0]], 0.03, 0.012);
}
