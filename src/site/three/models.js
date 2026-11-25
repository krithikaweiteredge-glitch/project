// Detailed procedural 3D models of every vehicle type IVHM has a template for.
//
// Based on the IVHM platform's own models (ivhm/live/static/models.js): the same component ids, so every
// monitored part in the platform has a piece here. This version adds the detail that makes them read as
// real machines: bevelled edges, smooth high-resolution curves, fans, tyres, tapered blades, glass, panel
// textures, and a material hint per piece (paint, metal, chrome, rubber, carbon, glass, gold).
//
// Each monitored part is either one mesh or an assembly (a Group) carrying userData.component, so it
// explodes and lights up as one piece.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const DS = THREE.DoubleSide;
const HAS_DOM = typeof document !== 'undefined';

// ---------- geometry helpers (all high resolution) ----------
const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 4, r ?? Math.min(w, h, d) * 0.22);
const cyl = (rt, rb, h, open = false, seg = 64) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const sph = (r, ...a) => new THREE.SphereGeometry(r, 64, 32, ...a);
const cone = (r, h, open = false) => new THREE.ConeGeometry(r, h, 64, 1, open);
const torus = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 24, 96, arc);
const lathe = (pts, seg = 96) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0005), y)), seg);

// ---------- procedural textures ----------
const texCache = {};
function canvasTex(key, w, h, draw, repeat = [1, 1]) {
  if (!HAS_DOM) return null;
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return (texCache[key] = t);
}
const carbonTex = () => canvasTex('carbon', 64, 64, (g, w, h) => {
  g.fillStyle = '#141518'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) {
    const odd = ((x + y) / 8) % 2;
    const gr = g.createLinearGradient(x, y, odd ? x + 8 : x, odd ? y : y + 8);
    gr.addColorStop(0, '#2a2c31'); gr.addColorStop(0.5, '#3b3e44'); gr.addColorStop(1, '#1b1c20');
    g.fillStyle = gr; g.fillRect(x + 0.5, y + 0.5, 7, 7);
  }
}, [6, 6]);
const solarTex = () => canvasTex('solar', 256, 512, (g, w, h) => {
  g.fillStyle = '#c9ced6'; g.fillRect(0, 0, w, h);
  const cw = w / 4, ch = h / 10;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 10; j++) {
    const gr = g.createLinearGradient(0, j * ch, 0, (j + 1) * ch);
    gr.addColorStop(0, '#1d3566'); gr.addColorStop(1, '#0d1c3d');
    g.fillStyle = gr; g.fillRect(i * cw + 3, j * ch + 3, cw - 6, ch - 6);
    g.strokeStyle = 'rgba(190,205,230,.35)'; g.lineWidth = 1;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(i * cw + 3, j * ch + 3 + (k * (ch - 6)) / 4); g.lineTo((i + 1) * cw - 3, j * ch + 3 + (k * (ch - 6)) / 4); g.stroke(); }
  }
});
const panelTex = () => canvasTex('panels', 512, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(0,0,0,.10)'; g.lineWidth = 1;
  for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  g.beginPath(); g.moveTo(0, h * 0.5); g.lineTo(w, h * 0.5); g.stroke();
}, [4, 1]);

// ---------- builder ----------
class Builder {
  constructor() { this.group = new THREE.Group(); this.parts = {}; this.spinners = []; }
  _mesh(geo, base, mat, opts = {}) {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: base, side: DS, transparent: !!opts.zone, opacity: opts.zone ? 0.3 : 1 }));
    m.userData.base = base; m.userData.mat = mat; m.userData.zone = !!opts.zone; m.userData.map = opts.map;
    return m;
  }
  /** a single-mesh monitored part */
  part(id, geo, pos, rot, base = 0xc9d2dc, opts = {}) {
    const m = this._mesh(geo, base, opts.mat || 'paint', opts);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.userData.component = id;
    (this.parts[id] = this.parts[id] || []).push(m);
    this.group.add(m);
    return m;
  }
  /** a monitored part made of several pieces; returns a function that adds pieces to it */
  asm(id, pos = [0, 0, 0], rot) {
    const g = new THREE.Group(); g.position.set(...pos); if (rot) g.rotation.set(...rot);
    g.userData.component = id; this.group.add(g);
    const add = (geo, p, r, base = 0x8b9198, mat = 'metal', opts = {}) => {
      const m = this._mesh(geo, base, mat, opts);
      if (p) m.position.set(...p); if (r) m.rotation.set(...r);
      m.userData.component = id; (this.parts[id] = this.parts[id] || []).push(m); g.add(m); return m;
    };
    add.group = g;
    return add;
  }
  /** structure that is not monitored (fades away when the machine opens) */
  add(geo, pos, rot, mat = 'paint', base = 0xe9ecef, opts = {}) {
    const m = this._mesh(geo, base, mat, opts);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    this.group.add(m);
    return m;
  }
}

// ---------- shared shapes ----------
function fuselageGeo(length, radius, noseFrac = 0.18, tailFrac = 0.28, squash = 1) {
  const pts = [], n = 90;
  for (let i = 0; i <= n; i++) {
    const s = i / n; let r;
    if (s < noseFrac) r = radius * Math.pow(Math.sin((s / noseFrac) * Math.PI / 2), 0.62);
    else if (s > 1 - tailFrac) r = radius * Math.max(0.1, Math.cos(((s - (1 - tailFrac)) / tailFrac) * Math.PI / 2.15));
    else r = radius;
    pts.push([r, s * length - length / 2]);
  }
  const g = lathe(pts, 96);
  g.rotateZ(-Math.PI / 2);
  if (squash !== 1) g.scale(1, squash, 1);
  return g;
}
function wingGeo(root, tip, span, sweep, thick = 0.08) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(-sweep, span); s.quadraticCurveTo(-sweep - tip * 0.5, span + tip * 0.08, -sweep - tip, span);
  s.lineTo(-root, 0); s.closePath();
  const b = thick * 0.45;
  const g = new THREE.ExtrudeGeometry(s, { depth: thick - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.9, bevelSegments: 5, curveSegments: 16 });
  g.rotateX(Math.PI / 2); g.translate(0, thick / 2 - b, 0);
  g.computeVertexNormals();
  return g;
}
function mirrorZ(geo) {
  const g = geo.clone(); g.scale(1, 1, -1);
  if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } }
  else for (const name of Object.keys(g.attributes)) {
    const at = g.attributes[name], n = at.itemSize, arr = at.array;
    for (let i = 0; i < at.count; i += 3) for (let k = 0; k < n; k++) { const p1 = (i + 1) * n + k, p2 = (i + 2) * n + k, t = arr[p1]; arr[p1] = arr[p2]; arr[p2] = t; }
  }
  g.computeVertexNormals();
  return g;
}
function finGeo(h, root, tip, sweep, thick = 0.07) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(-sweep, h); s.lineTo(-sweep - tip, h); s.lineTo(-root, 0); s.closePath();
  const b = thick * 0.45;
  const g = new THREE.ExtrudeGeometry(s, { depth: thick - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.9, bevelSegments: 4 });
  g.translate(0, 0, -(thick - 2 * b) / 2); g.computeVertexNormals();
  return g;
}
/** tapered, rounded-tip blade lying along +X, chord along Z */
function bladeGeo(len, root, tip, thick = 0.02) {
  const s = new THREE.Shape();
  s.moveTo(0, -root / 2); s.lineTo(len * 0.85, -tip / 2); s.quadraticCurveTo(len, 0, len * 0.85, tip / 2); s.lineTo(0, root / 2); s.closePath();
  const b = thick * 0.4;
  const g = new THREE.ExtrudeGeometry(s, { depth: thick - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 12 });
  g.rotateX(Math.PI / 2); g.translate(0, thick / 2 - b, 0); g.computeVertexNormals();
  return g;
}

/** turbofan: cowl, intake lip, fan with blades and spinner, exhaust cone - one monitored assembly */
function turbofan(b, id, pos, len = 2.2, r = 0.55) {
  const a = b.asm(id, pos);
  const cowl = lathe([[r * 0.93, -len / 2], [r * 1.0, -len * 0.28], [r * 0.98, len * 0.3], [r * 0.9, len * 0.46], [r * 0.86, len / 2]]);
  cowl.rotateZ(Math.PI / 2);
  a(cowl, null, null, 0xeef0f2, 'paint');
  a(torus(r * 0.88, r * 0.05), [len / 2, 0, 0], [0, Math.PI / 2, 0], 0xd9dde2, 'chrome');
  const mount = new THREE.Group(); mount.position.set(len / 2 - 0.12, 0, 0); mount.rotation.z = -Math.PI / 2; a.group.add(mount);
  const fan = new THREE.Group(); mount.add(fan);                         // spins about its local Y = the engine axis
  const blade = bladeGeo(r * 0.8, 0.16, 0.1, 0.015);
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(blade, new THREE.MeshStandardMaterial({ color: 0x9aa1a9 }));
    m.userData = { component: id, base: 0x9aa1a9, mat: 'metal' };
    const piv = new THREE.Group(); piv.rotation.y = (i / 22) * Math.PI * 2; m.rotation.x = 0.5; piv.add(m); fan.add(piv);
    (b.parts[id] = b.parts[id] || []).push(m);
  }
  const sp = cone(r * 0.22, r * 0.5); sp.rotateZ(-Math.PI / 2);
  a(sp, [len / 2 + 0.05, 0, 0], null, 0x2c2f34, 'chrome');
  const ex = cone(r * 0.38, r * 0.9); ex.rotateZ(Math.PI / 2);
  a(ex, [-len / 2 - r * 0.25, 0, 0], null, 0x6b6f75, 'metal');
  b.spinners.push(fan);
  return a;
}
/** landing gear leg: chrome oleo, metal strut, rubber tyres with hubs */
function gear(b, id, pos, h = 0.9, wheels = 1, wr = 0.22) {
  const a = b.asm(id, pos);
  a(cyl(0.055, 0.055, h * 0.6), [0, -h * 0.3, 0], null, 0x8b9198, 'metal');
  a(cyl(0.035, 0.035, h * 0.45), [0, -h * 0.75, 0], null, 0xe6e9ec, 'chrome');
  a(rbox(0.05, 0.22, 0.03, 0.01), [0.07, -h * 0.62, 0], [0, 0, 0.3], 0x6f757c, 'metal');
  for (let k = 0; k < wheels; k++) {
    const z = wheels > 1 ? (k - (wheels - 1) / 2) * wr * 1.25 : 0;
    a(torus(wr * 0.72, wr * 0.3), [0, -h, z], null, 0x101113, 'rubber');
    a(cyl(wr * 0.48, wr * 0.48, wr * 0.5), [0, -h, z], [Math.PI / 2, 0, 0], 0xb8bdc3, 'metal');
  }
  return a;
}
/** rotor / propeller: hub + tapered blades (spins), faint disc */
function rotor(b, id, pos, r, blades = 2, axis = 'y', chord = 0.12) {
  const hub = new THREE.Group(); hub.position.set(...pos);
  if (axis === 'x') hub.rotation.z = Math.PI / 2;
  hub.userData.component = id;
  const spin = new THREE.Group(); hub.add(spin);                         // spins about the hub's local Y
  const bl = bladeGeo(r, r * chord * 1.5, r * chord * 0.7, Math.max(0.012, r * 0.02));
  for (let i = 0; i < blades; i++) {
    const piv = new THREE.Group(); piv.rotation.y = (i / blades) * Math.PI * 2;
    const m = new THREE.Mesh(bl, new THREE.MeshStandardMaterial({ color: 0x1c1d21 }));
    m.userData = { component: id, base: 0x1c1d21, mat: 'carbon' }; m.rotation.x = 0.18;
    piv.add(m); spin.add(piv); (b.parts[id] = b.parts[id] || []).push(m);
  }
  const cap = new THREE.Mesh(sph(Math.max(r * 0.09, 0.03), 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe6e9ec }));
  cap.userData = { component: id, base: 0xe6e9ec, mat: 'chrome' }; spin.add(cap); (b.parts[id] ||= []).push(cap);
  b.group.add(hub); b.spinners.push(spin);
  return hub;
}
/** a see-through volume for a system that lives inside the airframe */
function zone(b, id, size, pos) { return b.part(id, rbox(...size), pos, null, 0x9fc2e0, { zone: true, mat: 'glass' }); }

// ---------- vehicles ----------
/** industrial multirotor in the class of the DJI Matrice 300: matte body, carbon arms, GPS mast, gimbal camera */
function multirotor(n, ids, o = {}) {
  const b = new Builder(), R = o.arm || 1.0;
  const motor = ids.motor || 'motor', esc = ids.esc || 'esc', prop = ids.prop || 'propeller';
  const BODY = 0x30343a, TRIM = 0x1c1f23;
  b.add(rbox(0.62, 0.2, 0.46, 0.07), [0, 0, 0], null, 'paint', BODY);                          // airframe core
  b.add(rbox(0.5, 0.07, 0.36, 0.03), [0, 0.13, 0], null, 'paint', TRIM);                        // top deck
  b.add(cyl(0.012, 0.012, 0.22, false, 16), [-0.12, 0.27, 0], null, 'metal', 0x8e959d);        // GPS mast
  b.add(cyl(0.07, 0.07, 0.02, false, 32), [-0.12, 0.38, 0], null, 'paint', 0xe6e8eb);           // GPS puck
  for (const z of [0.13, -0.13]) b.add(rbox(0.05, 0.04, 0.04, 0.01), [0.32, 0.02, z], null, 'glass', 0x0c0d10);  // front obstacle sensors
  // gimbal camera under the nose
  b.add(rbox(0.06, 0.12, 0.05, 0.015), [0.22, -0.16, 0], null, 'metal', TRIM);
  b.add(rbox(0.16, 0.12, 0.14, 0.03), [0.24, -0.27, 0], null, 'paint', 0x3a3e44);
  b.add(cyl(0.04, 0.04, 0.03, false, 32), [0.33, -0.27, 0], [0, 0, Math.PI / 2], 'glass', 0x0a0c10);
  for (let i = 0; i < n; i++) {
    const a = (o.offset ?? Math.PI / n) + (i * 2 * Math.PI) / n, x = Math.cos(a) * R, z = Math.sin(a) * R, k = i + 1;
    b.add(rbox(0.08, 0.06, 0.08, 0.015), [x * 0.3, 0.0, z * 0.3], [0, -a, 0], 'metal', TRIM);   // arm hinge
    b.add(cyl(0.028, 0.028, R * 0.7, false, 32), [x * 0.62, 0.0, z * 0.62], [0, -a, Math.PI / 2], 'carbon', 0x1a1b1e);
    // motor: stator base, bell with cooling slots, shaft
    const m = b.asm(`${motor}_${k}`, [x, 0.06, z]);
    m(cyl(0.075, 0.085, 0.05), [0, -0.04, 0], null, TRIM, 'metal');
    m(cyl(0.08, 0.08, 0.08), [0, 0.02, 0], null, 0x6b7077, 'metal');
    for (let j = 0; j < 3; j++) m(torus(0.081, 0.004), [0, -0.005 + j * 0.022, 0], [Math.PI / 2, 0, 0], 0x2a2c30, 'metal');
    m(cyl(0.012, 0.012, 0.07, false, 16), [0, 0.09, 0], null, 0xd9dde2, 'chrome');
    b.part(`${esc}_${k}`, rbox(0.12, 0.035, 0.06, 0.01), [x * 0.82, -0.03, z * 0.82], [0, -a, 0], TRIM, { mat: 'metal' });
    rotor(b, `${prop}_${k}`, [x, 0.17, z], o.prop || 0.46, 2, 'y', 0.12);
  }
  // intelligent flight batteries slot in on top, side by side
  const nb = o.batteries || 1;
  for (let j = 0; j < nb; j++) b.part(nb > 1 ? `battery_${j + 1}` : 'battery', rbox(0.34, 0.09, 0.13, 0.02), [0.02, 0.21, nb > 1 ? (j ? -0.08 : 0.08) : 0], null, 0x4a4f56, { mat: 'paint' });
  b.part('avionics', rbox(0.2, 0.05, 0.14, 0.015), [-0.05, 0.04, 0], null, 0x1f5a45, { mat: 'metal' });
  // landing gear: two legs with skids
  for (const z of [0.2, -0.2]) {
    b.add(cyl(0.018, 0.018, 0.34, false, 16), [0, -0.27, z], [z > 0 ? -0.25 : 0.25, 0, 0], 'carbon', 0x1a1b1e);
    b.add(cyl(0.018, 0.018, 0.6, false, 16), [0, -0.43, z * 1.4], [0, 0, Math.PI / 2], 'paint', TRIM);
  }
  return b;
}

function evtol() {
  const b = multirotor(8, { motor: 'motor', esc: 'inverter', prop: 'rotor' }, { arm: 2.4, prop: 0.8, batteries: 4, offset: Math.PI / 8 });
  b.part('airframe', fuselageGeo(3.6, 0.6, 0.32, 0.38, 0.92), [0, 0.3, 0], null, 0xf4f5f6, { mat: 'paint' });
  b.add(sph(0.5, 0, Math.PI * 2, 0, Math.PI / 2), [0.95, 0.48, 0], [0, 0, -0.55], 'glass', 0x0d0f13).scale.set(1.2, 0.7, 0.95);
  return b;
}

function airliner() {
  const b = new Builder();
  b.part('airframe', fuselageGeo(11, 0.62, 0.12, 0.3), [0, 0, 0], null, 0xf5f6f7, { mat: 'paint', map: 'panels' });
  // cockpit windscreen and a row of cabin windows each side
  b.add(rbox(0.5, 0.16, 0.78, 0.05), [4.15, 0.27, 0], [0, 0, -0.42], 'glass', 0x0b0d10);
  const win = rbox(0.12, 0.1, 0.02, 0.035);
  for (let i = 0; i < 26; i++) for (const z of [0.605, -0.605]) b.add(win, [3.2 - i * 0.26, 0.18, z], null, 'glass', 0x0b0d10);
  b.add(rbox(7.2, 0.035, 0.02, 0.01), [-0.3, 0.02, 0.615], null, 'paint', 0x1d3c6e);   // cheat line
  b.add(rbox(7.2, 0.035, 0.02, 0.01), [-0.3, 0.02, -0.615], null, 'paint', 0x1d3c6e);
  const w = wingGeo(2.4, 0.7, 5.2, 1.9, 0.14);
  b.add(w, [1.0, -0.3, 0.45], null, 'paint', 0xe3e6e9); b.add(mirrorZ(w), [1.0, -0.3, -0.45], null, 'paint', 0xe3e6e9);
  const wl = finGeo(0.55, 0.5, 0.2, 0.3, 0.05);
  b.add(wl, [-0.95, -0.3, 5.65], [0.2, 0, 0], 'paint', 0x1d3c6e); b.add(wl.clone(), [-0.95, -0.3, -5.65], [-0.2, 0, 0], 'paint', 0x1d3c6e);
  const h = wingGeo(1.1, 0.45, 1.9, 0.9, 0.07);
  b.add(h, [-4.0, 0.25, 0.2], null, 'paint', 0xe3e6e9); b.add(mirrorZ(h), [-4.0, 0.25, -0.2], null, 'paint', 0xe3e6e9);
  b.add(finGeo(2.0, 1.6, 0.6, 1.0, 0.09), [-3.6, 0.45, 0], null, 'paint', 0x1d3c6e);
  turbofan(b, 'engine_1', [1.1, -0.85, 1.9]); turbofan(b, 'engine_2', [1.1, -0.85, -1.9]);
  b.add(rbox(1.1, 0.42, 0.09, 0.03), [0.55, -0.45, 1.9], null, 'paint', 0xe3e6e9); b.add(rbox(1.1, 0.42, 0.09, 0.03), [0.55, -0.45, -1.9], null, 'paint', 0xe3e6e9);
  const apu = b.asm('apu', [-5.5, 0.18, 0]);
  const ac = cone(0.17, 0.55); ac.rotateZ(Math.PI / 2); apu(ac, null, null, 0x8e959d, 'metal');
  apu(cyl(0.07, 0.07, 0.1), [-0.3, 0, 0], [0, 0, Math.PI / 2], 0x2a2c30, 'metal');
  gear(b, 'landing_gear_1', [3.6, -0.55, 0], 0.7, 2, 0.16); gear(b, 'landing_gear_2', [0.2, -0.5, 1.0], 0.75, 2, 0.24); gear(b, 'landing_gear_3', [0.2, -0.5, -1.0], 0.75, 2, 0.24);
  // control surfaces = flight actuators: ailerons, flaps, elevators, rudder, spoiler
  const surf = (id, size, pos) => b.part(id, rbox(...size, 0.02), pos, null, 0xd6dade, { mat: 'paint' });
  surf('flight_actuator_1', [0.35, 0.06, 1.1], [-1.75, -0.27, 4.4]); surf('flight_actuator_2', [0.35, 0.06, 1.1], [-1.75, -0.27, -4.4]);
  surf('flight_actuator_3', [0.45, 0.06, 1.5], [-1.15, -0.27, 2.2]); surf('flight_actuator_4', [0.45, 0.06, 1.5], [-1.15, -0.27, -2.2]);
  surf('flight_actuator_5', [0.3, 0.05, 1.2], [-4.85, 0.27, 1.2]); surf('flight_actuator_6', [0.3, 0.05, 1.2], [-4.85, 0.27, -1.2]);
  surf('flight_actuator_7', [0.4, 1.3, 0.07], [-5.25, 1.6, 0]); surf('flight_actuator_8', [0.4, 0.05, 1.0], [-0.6, -0.25, 3.4]);
  zone(b, 'avionics', [0.8, 0.5, 0.8], [3.6, -0.1, 0]);
  zone(b, 'electrical', [0.9, 0.4, 0.8], [2.4, -0.3, 0]);
  zone(b, 'ecs_1', [1.0, 0.25, 0.5], [0.6, -0.5, 0.3]); zone(b, 'ecs_2', [1.0, 0.25, 0.5], [0.6, -0.5, -0.3]);
  zone(b, 'hydraulics_1', [0.6, 0.3, 0.5], [-0.4, -0.4, 0.3]); zone(b, 'hydraulics_2', [0.6, 0.3, 0.5], [-0.4, -0.4, -0.3]);
  zone(b, 'hydraulics_3', [0.6, 0.3, 0.5], [-1.2, -0.4, 0]);
  zone(b, 'fuel', [1.6, 0.1, 6.0], [0.0, -0.25, 0]);
  b.part('wing_panel_1', rbox(0.9, 0.035, 0.8, 0.012), [0.85, -0.16, 1.55], null, 0xd6dade, { mat: 'metal' });
  b.part('wing_panel_2', rbox(0.9, 0.035, 0.8, 0.012), [0.85, -0.16, -1.55], null, 0xd6dade, { mat: 'metal' });
  return b;
}

function fighter(twin) {
  const b = new Builder();
  b.part('airframe', fuselageGeo(8, 0.5, 0.32, 0.12, 0.9), [0, 0, 0], null, 0x8c949c, { mat: 'paint' });
  const can = b.add(sph(0.34, 0, Math.PI * 2, 0, Math.PI / 2), [2.05, 0.3, 0], null, 'glass', 0x2a3540); can.scale.set(2.2, 0.85, 0.9);
  for (const z of [0.42, -0.42]) b.add(rbox(1.6, 0.36, 0.26, 0.08), [0.7, -0.08, z], null, 'paint', 0x7c848c);   // intakes
  const w = wingGeo(3.6, 0.5, 2.6, 2.6, 0.09);
  b.add(w, [1.2, -0.05, 0.3], null, 'paint', 0x8c949c); b.add(mirrorZ(w), [1.2, -0.05, -0.3], null, 'paint', 0x8c949c);
  const h = wingGeo(1.2, 0.4, 1.3, 0.8, 0.06);
  b.add(h, [-2.6, 0, 0.3], null, 'paint', 0x8c949c); b.add(mirrorZ(h), [-2.6, 0, -0.3], null, 'paint', 0x8c949c);
  const fg = finGeo(1.4, 1.6, 0.5, 0.9, 0.07);
  if (twin) { b.add(fg, [-2.2, 0.3, 0.45], [0.22, 0, 0], 'paint', 0x7c848c); b.add(fg.clone(), [-2.2, 0.3, -0.5], [-0.22, 0, 0], 'paint', 0x7c848c); }
  else b.add(fg, [-2.2, 0.4, 0], null, 'paint', 0x7c848c);
  const nz = (id, z) => {
    const a = b.asm(id, [-4.1, 0, z]);
    a(cyl(0.32, 0.38, 0.8, true), null, [0, 0, Math.PI / 2], 0x4c5057, 'metal');
    for (let i = 0; i < 14; i++) a(rbox(0.36, 0.012, 0.11, 0.004), [-0.5, Math.sin((i / 14) * Math.PI * 2) * 0.31, Math.cos((i / 14) * Math.PI * 2) * 0.31], [(i / 14) * Math.PI * 2, 0, 0.12], 0x6b6f75, 'metal');
    const ic = cone(0.2, 0.5); ic.rotateZ(Math.PI / 2); a(ic, [-0.15, 0, 0], null, 0x2a2c30, 'metal');
  };
  if (twin) { nz('engine_1', 0.38); nz('engine_2', -0.38); } else nz('engine', 0);
  gear(b, 'landing_gear_1', [2.4, -0.45, 0], 0.6, 1, 0.14); gear(b, 'landing_gear_2', [-0.6, -0.4, 0.8], 0.6, 1, 0.2); gear(b, 'landing_gear_3', [-0.6, -0.4, -0.8], 0.6, 1, 0.2);
  const n = twin ? 6 : 5;
  const spots = [[-1.2, -0.05, 2.0], [-1.2, -0.05, -2.0], [-3.1, 0.0, 1.0], [-3.1, 0.0, -1.0], [-3.2, 1.0, 0.45], [-3.2, 1.0, -0.5]];
  for (let i = 0; i < n; i++) b.part(`flight_actuator_${i + 1}`, rbox(0.35, 0.05, 0.7, 0.015), spots[i], null, 0xa7aeb5, { mat: 'paint' });
  zone(b, 'avionics', [0.8, 0.4, 0.5], [2.8, 0, 0]); zone(b, 'electrical', [0.6, 0.3, 0.5], [1.4, -0.2, 0]);
  zone(b, 'ecs', [0.6, 0.3, 0.5], [0.8, -0.2, 0]); zone(b, 'fuel', [1.8, 0.3, 0.6], [-0.3, 0.0, 0]);
  zone(b, 'hydraulics_1', [0.5, 0.3, 0.4], [-1.6, -0.15, 0.2]); zone(b, 'hydraulics_2', [0.5, 0.3, 0.4], [-1.6, -0.15, -0.2]);
  if (twin) b.part('apu', rbox(0.4, 0.25, 0.3, 0.05), [-2.4, -0.3, 0], null, 0x8e959d, { mat: 'metal' });
  return b;
}

function turboprop() {
  const b = new Builder();
  b.part('airframe', fuselageGeo(9, 0.7, 0.14, 0.32), [0, 0, 0], null, 0xf5f6f7, { mat: 'paint', map: 'panels' });
  b.add(rbox(0.5, 0.18, 0.9, 0.06), [3.95, 0.33, 0], [0, 0, -0.45], 'glass', 0x0b0d10);
  const win = rbox(0.14, 0.14, 0.02, 0.05);
  for (let i = 0; i < 16; i++) for (const z of [0.685, -0.685]) b.add(win, [2.6 - i * 0.34, 0.18, z], null, 'glass', 0x0b0d10);
  const w = wingGeo(1.6, 0.9, 6.0, 0.4, 0.14);
  b.add(w, [0.8, 0.55, 0.4], null, 'paint', 0xe3e6e9); b.add(mirrorZ(w), [0.8, 0.55, -0.4], null, 'paint', 0xe3e6e9);
  const h = wingGeo(0.9, 0.5, 1.8, 0.4, 0.07);
  b.add(h, [-3.9, 1.8, 0.05], null, 'paint', 0xe3e6e9); b.add(mirrorZ(h), [-3.9, 1.8, -0.05], null, 'paint', 0xe3e6e9);
  b.add(finGeo(1.4, 1.6, 0.6, 0.8, 0.09), [-3.2, 0.45, 0], null, 'paint', 0xc8402e);
  for (const [k, z] of [[1, 2.2], [2, -2.2]]) {
    const e = b.asm(`engine_${k}`, [0.5, 0.45, z]);
    const cowl = lathe([[0.3, -1.0], [0.4, -0.5], [0.42, 0.4], [0.3, 1.0]]); cowl.rotateZ(Math.PI / 2);
    e(cowl, null, null, 0xf0f2f4, 'paint');
    e(cyl(0.07, 0.09, 0.3, true), [-0.6, -0.33, 0], [0, 0, Math.PI / 2 + 0.3], 0x4c5057, 'metal');
    b.part(`reduction_gearbox_${k}`, cyl(0.25, 0.35, 0.4), [1.65, 0.45, z], [0, 0, Math.PI / 2], 0x8e959d, { mat: 'metal' });
    rotor(b, `propeller_${k}`, [1.95, 0.45, z], 1.25, 6, 'x', 0.12);
  }
  gear(b, 'landing_gear_1', [3.2, -0.6, 0], 0.6, 2, 0.15); gear(b, 'landing_gear_2', [0.3, -0.6, 0.8], 0.6, 2, 0.22); gear(b, 'landing_gear_3', [0.3, -0.6, -0.8], 0.6, 2, 0.22);
  zone(b, 'avionics', [0.7, 0.5, 0.8], [3.4, -0.1, 0]); zone(b, 'electrical', [0.7, 0.4, 0.8], [2.4, -0.3, 0]);
  zone(b, 'ecs', [0.9, 0.3, 0.6], [0.6, -0.55, 0]); zone(b, 'fuel', [1.0, 0.1, 9.0], [0.3, 0.58, 0]);
  zone(b, 'hydraulics_1', [0.6, 0.3, 0.5], [-0.6, -0.45, 0.25]); zone(b, 'hydraulics_2', [0.6, 0.3, 0.5], [-0.6, -0.45, -0.25]);
  return b;
}

function maleUav() {
  const b = new Builder();
  b.part('airframe', fuselageGeo(5.5, 0.38, 0.26, 0.3, 0.95), [0, 0, 0], null, 0xb9bfc5, { mat: 'paint' });
  const dome = b.add(sph(0.36, 0, Math.PI * 2, 0, Math.PI / 2), [2.05, 0.08, 0], [0, 0, -0.2], 'paint', 0xc5cbd1); dome.scale.set(1.6, 0.9, 0.95);
  b.add(sph(0.16), [1.8, -0.36, 0], null, 'glass', 0x10151c);                                   // sensor ball
  const w = wingGeo(0.7, 0.35, 6.5, 0.2, 0.07);
  b.add(w, [0.4, 0.15, 0.3], null, 'paint', 0xb9bfc5); b.add(mirrorZ(w), [0.4, 0.15, -0.3], null, 'paint', 0xb9bfc5);
  const v = wingGeo(0.6, 0.3, 1.2, 0.3, 0.05);
  const v1 = b.add(v, [-2.3, 0.2, 0.1], null, 'paint', 0xb9bfc5); v1.rotation.x = -0.7;
  const v2 = b.add(mirrorZ(v), [-2.3, 0.2, -0.1], null, 'paint', 0xb9bfc5); v2.rotation.x = 0.7;
  const e = b.asm('engine', [-2.2, 0, 0]);
  e(cyl(0.25, 0.3, 0.7), null, [0, 0, Math.PI / 2], 0x4c5057, 'metal');
  for (let i = 0; i < 8; i++) e(torus(0.29, 0.012), [0.25 - i * 0.065, 0, 0], [0, Math.PI / 2, 0], 0x7d838a, 'metal');
  rotor(b, 'propeller', [-2.75, 0, 0], 0.7, 3, 'x', 0.14);
  gear(b, 'landing_gear', [1.4, -0.35, 0], 0.5, 1, 0.12);
  const spots = [[-0.05, 0.15, 5.0], [-0.05, 0.15, -5.0], [-2.75, 0.75, 0.7], [-2.75, 0.75, -0.7]];
  spots.forEach((p, i) => b.part(`actuator_${i + 1}`, rbox(0.2, 0.05, 0.9, 0.015), p, null, 0xa7aeb5, { mat: 'paint' }));
  zone(b, 'avionics', [0.6, 0.3, 0.4], [1.8, 0.05, 0]); zone(b, 'fuel', [1.2, 0.35, 0.45], [0.2, 0, 0]);
  zone(b, 'electrical', [0.5, 0.25, 0.35], [-1.2, 0, 0]);
  return b;
}

/** flat planform from [x, z] points (x forward, z outboard), extruded to a thin rounded slab - wings that a
 *  simple trapezoid can't describe (compound deltas, LERX) */
function planGeo(pts, thick = 0.08) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const [x, z] of pts.slice(1)) s.lineTo(x, z); s.closePath();
  const b = thick * 0.45;
  const g = new THREE.ExtrudeGeometry(s, { depth: thick - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.9, bevelSegments: 4 });
  g.rotateX(Math.PI / 2); g.translate(0, thick / 2 - b, 0); g.computeVertexNormals();
  return g;
}
/** one undercarriage leg added to an existing assembly (for aircraft whose whole gear is one monitored part) */
function legInto(a, [x, y, z], h, wr, wheels = 1) {
  a(cyl(0.035, 0.035, h * 0.6), [x, y - h * 0.3, z], null, 0x8b9198, 'metal');
  a(cyl(0.024, 0.024, h * 0.45), [x, y - h * 0.75, z], null, 0xe6e9ec, 'chrome');
  for (let k = 0; k < wheels; k++) {
    const dz = wheels > 1 ? (k - (wheels - 1) / 2) * wr * 1.3 : 0;
    a(torus(wr * 0.72, wr * 0.3), [x, y - h, z + dz], null, 0x101113, 'rubber');
    a(cyl(wr * 0.48, wr * 0.48, wr * 0.5), [x, y - h, z + dz], [Math.PI / 2, 0, 0], 0xb8bdc3, 'metal');
  }
}
/** a fighter's afterburning exhaust: nozzle petals and the turbine face - one monitored part */
function fighterNozzle(b, id, pos, r = 0.34) {
  const a = b.asm(id, pos);
  a(cyl(r, r * 1.12, 0.8, true), null, [0, 0, Math.PI / 2], 0x4c5057, 'metal');
  for (let i = 0; i < 16; i++) a(rbox(0.38, 0.012, 0.1, 0.004), [-0.5, Math.sin((i / 16) * Math.PI * 2) * r * 0.95, Math.cos((i / 16) * Math.PI * 2) * r * 0.95], [(i / 16) * Math.PI * 2, 0, 0.12], 0x6b6f75, 'metal');
  const ic = cone(r * 0.6, 0.5); ic.rotateZ(Math.PI / 2); a(ic, [-0.15, 0, 0], null, 0x2a2c30, 'metal');
  return a;
}

/** HAL Tejas: tailless compound-delta wing, one large swept fin, side intakes, one GE F404 */
function tejas() {
  const b = new Builder(), grey = 0x8f989f, dark = 0x737c84;
  b.part('airframe', fuselageGeo(8.2, 0.44, 0.27, 0.12, 0.95), [0, 0, 0], null, grey, { mat: 'paint' });
  const can = b.add(sph(0.3, 0, Math.PI * 2, 0, Math.PI / 2), [2.05, 0.3, 0], null, 'glass', 0x2a3540); can.scale.set(2.3, 0.85, 0.85);
  for (const z of [0.42, -0.42]) b.add(rbox(1.5, 0.4, 0.28, 0.09), [0.55, -0.12, z], null, 'paint', dark);    // side intakes
  // compound delta: steep inner leading edge, shallower outer, straight trailing edge, no tailplane
  const wing = [[0, 0], [-1.25, 0.8], [-3.95, 2.6], [-4.35, 2.6], [-4.5, 0]];
  b.add(planGeo(wing, 0.1), [1.9, -0.05, 0.3], null, 'paint', grey);
  b.add(planGeo(wing.map(([x, z]) => [x, -z]), 0.1), [1.9, -0.05, -0.3], null, 'paint', grey);
  b.add(finGeo(1.75, 2.1, 0.55, 1.6, 0.07), [-1.95, 0.32, 0], null, 'paint', dark);
  fighterNozzle(b, 'engine', [-4.1, 0, 0], 0.34);
  gear(b, 'landing_gear_1', [2.5, -0.42, 0], 0.62, 1, 0.13); gear(b, 'landing_gear_2', [-0.9, -0.38, 0.85], 0.6, 1, 0.19); gear(b, 'landing_gear_3', [-0.9, -0.38, -0.85], 0.6, 1, 0.19);
  // flight controls: inboard and outboard elevons on each side, and the rudder
  const ev = (id, z, w) => b.part(id, rbox(0.32, 0.05, w, 0.015), [-2.45, -0.05, z], null, 0xa7aeb5, { mat: 'paint' });
  ev('flight_actuator_1', 1.0, 0.9); ev('flight_actuator_2', -1.0, 0.9); ev('flight_actuator_3', 2.05, 0.9); ev('flight_actuator_4', -2.05, 0.9);
  b.part('flight_actuator_5', rbox(0.32, 0.95, 0.06, 0.015), [-3.8, 1.05, 0], null, 0xa7aeb5, { mat: 'paint' });
  zone(b, 'avionics', [0.8, 0.4, 0.5], [2.9, 0, 0]); zone(b, 'electrical', [0.6, 0.3, 0.5], [1.3, -0.2, 0]);
  zone(b, 'ecs', [0.6, 0.3, 0.5], [0.7, 0.15, 0]); zone(b, 'fuel', [1.8, 0.3, 0.6], [-0.6, 0.0, 0]);
  zone(b, 'hydraulics_1', [0.5, 0.3, 0.4], [-1.8, -0.15, 0.2]); zone(b, 'hydraulics_2', [0.5, 0.3, 0.4], [-1.8, -0.15, -0.2]);
  return b;
}

/** Sukhoi Su-30MKI: long nose, canards, lifting centre-body, two widely spaced AL-31FP engines, twin vertical
 *  fins on the nacelles, all-moving tailplanes, tandem two-seat canopy */
function su30() {
  const b = new Builder(), grey = 0x8e9ba6, dark = 0x6d7a85;
  b.part('airframe', fuselageGeo(9.8, 0.4, 0.26, 0.1, 0.92), [0.4, 0.05, 0], null, grey, { mat: 'paint' });
  b.add(rbox(4.6, 0.3, 1.6, 0.12), [-1.2, -0.08, 0], null, 'paint', grey);                                       // lifting centre-body
  const can = b.add(sph(0.3, 0, Math.PI * 2, 0, Math.PI / 2), [2.85, 0.32, 0], null, 'glass', 0x2a3540); can.scale.set(3.0, 0.85, 0.85);
  for (const z of [0.78, -0.78]) {
    const nac = cyl(0.33, 0.3, 4.6); nac.rotateZ(Math.PI / 2);
    b.add(nac, [-1.5, -0.2, z], null, 'paint', grey);                                                             // engine nacelle
    b.add(rbox(1.3, 0.45, 0.5, 0.06), [1.25, -0.28, z], null, 'paint', dark);                                     // intake under the LERX
  }
  const wing = [[0, 0], [-1.7, 0.55], [-4.0, 3.65], [-4.85, 3.65], [-5.25, 0.55], [-5.25, 0]];                    // LERX + cropped delta
  b.add(planGeo(wing, 0.1), [2.15, -0.05, 0.4], null, 'paint', grey);
  b.add(planGeo(wing.map(([x, z]) => [x, -z]), 0.1), [2.15, -0.05, -0.4], null, 'paint', grey);
  const cn = wingGeo(0.7, 0.28, 0.85, 0.5, 0.05);
  b.add(cn, [2.3, 0.12, 0.4], null, 'paint', grey); b.add(mirrorZ(cn), [2.3, 0.12, -0.4], null, 'paint', grey);  // canards
  const fin = finGeo(1.75, 1.9, 0.55, 1.4, 0.07);
  b.add(fin, [-2.2, 0.1, 0.85], null, 'paint', dark); b.add(fin.clone(), [-2.2, 0.1, -0.85], null, 'paint', dark);
  b.add(cyl(0.05, 0.05, 1.2), [-4.3, 0.0, 0], [0, 0, Math.PI / 2], 'metal', 0x6b6f75);                         // tail sting
  fighterNozzle(b, 'engine_1', [-4.0, -0.2, 0.78], 0.33); fighterNozzle(b, 'engine_2', [-4.0, -0.2, -0.78], 0.33);
  gear(b, 'landing_gear_1', [3.6, -0.42, 0], 0.68, 2, 0.13); gear(b, 'landing_gear_2', [-1.0, -0.45, 1.3], 0.65, 1, 0.22); gear(b, 'landing_gear_3', [-1.0, -0.45, -1.3], 0.65, 1, 0.22);
  // flight controls: ailerons, all-moving tailplanes (the whole surface is the monitored part), rudders
  b.part('flight_actuator_1', rbox(0.3, 0.05, 1.1, 0.015), [-2.55, -0.05, 3.3], null, 0xa7aeb5, { mat: 'paint' });
  b.part('flight_actuator_2', rbox(0.3, 0.05, 1.1, 0.015), [-2.55, -0.05, -3.3], null, 0xa7aeb5, { mat: 'paint' });
  const tp = wingGeo(1.35, 0.45, 1.35, 0.95, 0.06);
  b.part('flight_actuator_3', tp, [-2.85, -0.12, 1.1], null, 0xa7aeb5, { mat: 'paint' });
  b.part('flight_actuator_4', mirrorZ(tp), [-2.85, -0.12, -1.1], null, 0xa7aeb5, { mat: 'paint' });
  b.part('flight_actuator_5', rbox(0.3, 0.95, 0.06, 0.015), [-3.9, 0.95, 0.85], null, 0xa7aeb5, { mat: 'paint' });
  b.part('flight_actuator_6', rbox(0.3, 0.95, 0.06, 0.015), [-3.9, 0.95, -0.85], null, 0xa7aeb5, { mat: 'paint' });
  zone(b, 'avionics', [0.9, 0.4, 0.5], [3.7, 0.05, 0]); zone(b, 'electrical', [0.6, 0.3, 0.5], [1.6, -0.15, 0]);
  zone(b, 'ecs', [0.6, 0.3, 0.5], [1.0, 0.1, 0]); zone(b, 'fuel', [2.0, 0.25, 1.2], [-0.6, -0.05, 0]);
  zone(b, 'hydraulics_1', [0.5, 0.3, 0.4], [-2.0, -0.15, 0.78]); zone(b, 'hydraulics_2', [0.5, 0.3, 0.4], [-2.0, -0.15, -0.78]);
  b.part('apu', rbox(0.4, 0.25, 0.3, 0.05), [-2.9, 0.0, 0], null, 0x8e959d, { mat: 'metal' });
  return b;
}

/** IAI Heron 1: slender pod with nose turret and satcom mast, long high wing, twin booms with twin fins joined by
 *  the tailplane at the bottom, Rotax 914 driving a pusher propeller, tricycle undercarriage */
function heron() {
  const b = new Builder(), grey = 0x7f8a94, dark = 0x66717b;
  b.part('airframe', fuselageGeo(4.7, 0.36, 0.2, 0.34, 1.0), [0.55, 0, 0], null, grey, { mat: 'paint' });
  b.add(sph(0.16), [2.6, -0.3, 0], null, 'glass', 0x10151c);                                                    // sensor turret
  b.add(cyl(0.07, 0.09, 0.12), [2.6, -0.2, 0], null, 'metal', dark);
  b.add(cyl(0.028, 0.028, 0.34), [1.55, 0.5, 0], null, 'paint', grey);                                          // satcom mast
  const dome = b.add(sph(0.16, 0, Math.PI * 2, 0, Math.PI / 2), [1.55, 0.67, 0], null, 'paint', grey); dome.scale.set(1, 0.45, 1);
  const pod = b.add(sph(0.3), [0.55, -0.3, 0], null, 'paint', 0xcfb43c); pod.scale.set(1.9, 0.55, 0.85);       // belly fairing
  const w = wingGeo(0.62, 0.36, 5.1, 0.12, 0.07);
  b.add(w, [0.75, 0.28, 0.3], null, 'paint', grey); b.add(mirrorZ(w), [0.75, 0.28, -0.3], null, 'paint', grey);
  for (const z of [1.05, -1.05]) {
    b.add(cyl(0.055, 0.055, 3.4), [-1.4, 0.24, z], [0, 0, Math.PI / 2], 'paint', grey);                            // tail boom
    b.add(finGeo(0.85, 0.66, 0.42, 0.26, 0.05), [-2.6, 0.24, z], null, 'paint', grey);                          // fin, above
    b.add(finGeo(0.36, 0.66, 0.52, 0.1, 0.05), [-2.6, 0.24, z], [Math.PI, 0, 0], 'paint', grey);                // fin, below
  }
  b.add(rbox(0.5, 0.05, 2.2, 0.015), [-2.95, -0.1, 0], null, 'paint', grey);                                     // tailplane joining the fins
  const e = b.asm('engine', [-1.75, 0, 0]);
  e(cyl(0.21, 0.24, 0.55), null, [0, 0, Math.PI / 2], 0x4c5057, 'metal');
  for (let i = 0; i < 6; i++) e(torus(0.235, 0.01), [0.2 - i * 0.07, 0, 0], [0, Math.PI / 2, 0], 0x7d838a, 'metal');
  rotor(b, 'propeller', [-2.12, 0, 0], 0.62, 2, 'x', 0.13);
  const g = b.asm('landing_gear', [0, 0, 0]);
  legInto(g, [2.15, -0.3, 0], 0.5, 0.12); legInto(g, [0.25, -0.3, 0.42], 0.5, 0.15); legInto(g, [0.25, -0.3, -0.42], 0.5, 0.15);
  b.part('actuator_1', rbox(0.18, 0.04, 1.5, 0.012), [0.22, 0.28, 4.3], null, 0xa7aeb5, { mat: 'paint' });      // ailerons
  b.part('actuator_2', rbox(0.18, 0.04, 1.5, 0.012), [0.22, 0.28, -4.3], null, 0xa7aeb5, { mat: 'paint' });
  b.part('actuator_3', rbox(0.16, 0.04, 2.0, 0.012), [-3.25, -0.1, 0], null, 0xa7aeb5, { mat: 'paint' });       // elevator
  b.part('actuator_4', rbox(0.16, 0.6, 0.035, 0.012), [-3.2, 0.55, 1.05], null, 0xa7aeb5, { mat: 'paint' });    // rudder
  zone(b, 'avionics', [0.6, 0.3, 0.4], [1.9, 0.05, 0]); zone(b, 'fuel', [1.0, 0.3, 0.45], [0.4, 0.05, 0]);
  zone(b, 'electrical', [0.5, 0.25, 0.35], [-1.1, 0, 0]);
  return b;
}

/** utility helicopter in the class of the HAL Dhruv (ALH): Army olive, twin turboshafts, four-blade hingeless rotor */
function helicopter() {
  const b = new Builder();
  const OLIVE = 0x4d5733, DARK = 0x2a2e26;
  // cabin: a lathe that runs from a rounded nose to the root of the tail boom, a little narrower than tall
  const prof = [];
  for (let i = 0; i <= 60; i++) {
    const s = i / 60, x = 3.0 - s * 4.6;                                  // nose at +3.0, boom root at -1.6
    const r = s < 0.2 ? 1.0 * Math.pow(Math.sin((s / 0.2) * Math.PI / 2), 0.55) : s > 0.7 ? 1.0 - ((s - 0.7) / 0.3) * 0.58 : 1.0;
    prof.push([Math.max(r, 0.02), x]);
  }
  const cab = lathe(prof, 96); cab.rotateZ(-Math.PI / 2); cab.rotateX(0); cab.scale(1, 1, 0.82);
  // the lathe ran along -Y; flip so the nose points +X
  cab.rotateZ(Math.PI); cab.rotateY(Math.PI);
  b.part('airframe', cab, [0, 0, 0], null, OLIVE, { mat: 'paint' });
  // glazing: windscreen, chin windows, cabin windows and the sliding door frame
  const ws = b.add(sph(0.98, 0, Math.PI * 2, 0, Math.PI / 2.6), [2.05, 0.08, 0], [0, 0, -1.15], 'glass', 0x0b1016); ws.scale.set(1, 1.0, 0.8);
  for (const z of [0.79, -0.79]) {
    for (let i = 0; i < 3; i++) b.add(rbox(0.5, 0.42, 0.03, 0.08), [0.9 - i * 0.62, 0.2, z * (1 - i * 0.02)], null, 'glass', 0x0b1016);
    b.add(rbox(1.5, 0.05, 0.03, 0.01), [0.3, -0.42, z * 1.01], null, 'metal', DARK);            // door rail
  }
  // upper deck: engine and transmission fairing with intakes and exhausts
  b.add(rbox(2.6, 0.5, 1.15, 0.22), [-0.1, 0.98, 0], null, 'paint', OLIVE);
  for (const z of [0.58, -0.58]) {
    b.add(rbox(0.5, 0.26, 0.04, 0.06), [0.7, 1.0, z], null, 'metal', DARK);                      // intake grilles
    b.add(cyl(0.12, 0.14, 0.36, true, 32), [-1.25, 1.05, z * 0.8], [0, 0, Math.PI / 2 - 0.35], 'metal', 0x3a3d42);  // exhausts
  }
  // tail boom, rising slightly, with a swept fin and a stabiliser with end plates
  const boom = cyl(0.16, 0.42, 5.0, false, 48); boom.rotateZ(Math.PI / 2 + 0.05);
  b.add(boom, [-4.05, 0.42, 0], null, 'paint', OLIVE);
  b.add(finGeo(1.35, 1.0, 0.55, 0.65, 0.09), [-6.0, 0.58, 0], null, 'paint', OLIVE);
  const st = wingGeo(0.6, 0.45, 0.75, 0.15, 0.06);
  b.add(st, [-5.2, 0.5, 0.12], null, 'paint', OLIVE); b.add(mirrorZ(st), [-5.2, 0.5, -0.12], null, 'paint', OLIVE);
  for (const z of [0.9, -0.9]) b.add(finGeo(0.45, 0.55, 0.4, 0.12, 0.04), [-5.25, 0.32, z], null, 'paint', OLIVE);
  // drive train along the top of the boom
  b.part('drivetrain', cyl(0.045, 0.045, 4.6, false, 32), [-3.9, 0.66, 0], [0, 0, Math.PI / 2 + 0.05], 0xd9dde2, { mat: 'chrome' });
  for (let i = 0; i < 4; i++) b.part(`drive_bearing_${i + 1}`, torus(0.085, 0.028), [-2.2 - i * 1.0, 0.66 + i * 0.05, 0], [0, Math.PI / 2, 0], 0x8e959d, { mat: 'metal' });
  b.part('main_gearbox', rbox(0.8, 0.5, 0.66, 0.1), [0.15, 1.2, 0], null, 0x8e959d, { mat: 'metal' });
  b.add(cyl(0.08, 0.1, 0.55, false, 32), [0.15, 1.65, 0], null, 'metal', 0x6b7077);              // rotor mast
  rotor(b, 'main_rotor', [0.15, 1.95, 0], 4.1, 4, 'y', 0.055);
  b.part('tail_gearbox', rbox(0.3, 0.3, 0.26, 0.06), [-6.55, 1.62, 0.02], null, 0x8e959d, { mat: 'metal' });
  const tr = rotor(b, 'tail_rotor', [-6.6, 1.68, 0.26], 0.82, 4, 'y', 0.1); tr.rotation.x = Math.PI / 2;
  for (const [k, z] of [[1, 0.3], [2, -0.3]]) {
    const e = b.asm(`engine_${k}`, [-0.2, 1.0, z]);
    e(cyl(0.18, 0.18, 1.1, false, 40), null, [0, 0, Math.PI / 2], 0x55606b, 'metal');
    e(cyl(0.1, 0.13, 0.25, true, 32), [-0.62, 0, 0], [0, 0, Math.PI / 2], 0x2a2c30, 'metal');
  }
  // skids with curved cross tubes
  const sk = b.asm('landing_gear', [0.2, -1.2, 0]);
  for (const z of [0.88, -0.88]) {
    sk(cyl(0.05, 0.05, 3.3, false, 32), [0, 0, z], [0, 0, Math.PI / 2], DARK, 'paint');
    sk(cyl(0.05, 0.05, 0.4, false, 24), [1.75, 0.12, z], [0, 0, Math.PI / 2 - 0.55], DARK, 'paint');   // upturned toe
  }
  for (const x of [0.9, -0.6]) {
    const ct = new THREE.TorusGeometry(0.9, 0.04, 12, 48, Math.PI);
    sk(ct, [x, 0.02, 0], [0, Math.PI / 2, 0], DARK, 'paint');
  }
  zone(b, 'avionics', [0.6, 0.4, 0.8], [2.1, -0.15, 0]); zone(b, 'electrical', [0.6, 0.4, 0.8], [1.2, -0.5, 0]);
  zone(b, 'hydraulics_1', [0.4, 0.3, 0.3], [0.7, 0.85, 0.3]); zone(b, 'hydraulics_2', [0.4, 0.3, 0.3], [0.7, 0.85, -0.3]);
  return b;
}

function launchVehicle() {
  const b = new Builder();
  b.part('structure', cyl(0.55, 0.55, 8), [0, 0, 0], null, 0xf4f5f6, { mat: 'paint' });
  for (const y of [-3.2, -0.4, 2.4]) b.add(cyl(0.565, 0.565, 0.08), [0, y, 0], null, 'metal', 0x2a2c30);   // interstage bands
  b.add(lathe([[0.55, 0], [0.55, 0.5], [0.45, 1.2], [0.25, 1.7], [0.02, 2.0]]), [0, 4.0, 0], null, 'paint', 0xf4f5f6); // fairing
  const bell = (id, x) => {
    const a = b.asm(id, [x, -4.35, 0]);
    a(lathe([[0.08, 0.25], [0.1, 0.1], [0.16, -0.1], [0.24, -0.35]], 64), null, null, 0x6b5a48, 'metal');
    a(cyl(0.12, 0.12, 0.2), [0, 0.35, 0], null, 0x3a3d42, 'metal');
  };
  bell('liquid_engine_1', 0.22); bell('liquid_engine_2', -0.22);
  for (const [k, z] of [[1, 0.88], [2, -0.88]]) {
    b.part(`solid_booster_${k}`, cyl(0.28, 0.28, 5), [0, -1.2, z], null, 0xf4f5f6, { mat: 'paint' });
    b.add(cone(0.28, 0.6), [0, 1.6, z], null, 'paint', 0xf4f5f6);
    b.add(lathe([[0.12, 0], [0.18, -0.2], [0.24, -0.35]], 48), [0, -3.7, z], null, 'metal', 0x3a3d42);
  }
  [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].forEach(([x, z], i) =>
    b.part(`actuator_${i + 1}`, rbox(x ? 0.42 : 0.05, 0.6, z ? 0.42 : 0.05, 0.02), [x * 1.2, -3.6, z * 1.2], null, 0x2a2c30, { mat: 'metal' }));
  zone(b, 'avionics', [0.9, 0.4, 0.9], [0, 3.6, 0]); zone(b, 'thermal', [1.05, 1.2, 1.05], [0, 2.6, 0]);
  return b;
}

function satellite() {
  const b = new Builder();
  b.part('thermal', rbox(1.4, 1.4, 1.4, 0.06), [0, 0, 0], null, 0xd9b45a, { mat: 'gold' });
  for (const z of [1, -1]) {
    const sp = b.part('solar_power', rbox(1.2, 0.035, 3.2, 0.01), [0, 0, z * 2.45], null, 0xffffff, { mat: 'solar', map: 'solar' });
    void sp;
    b.add(cyl(0.03, 0.03, 0.85, false, 24), [0, 0, z * 0.8], [Math.PI / 2, 0, 0], 'chrome', 0xd9dde2);
  }
  [[0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]].forEach(([x, z], i) => {
    const a = b.asm(`reaction_wheel_${i + 1}`, [x, 0.76, z]);
    a(cyl(0.16, 0.16, 0.08), null, null, 0x8e959d, 'metal'); a(torus(0.16, 0.012), [0, 0.04, 0], [Math.PI / 2, 0, 0], 0xc9a87c, 'metal');
  });
  [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]].forEach(([x, z], i) =>
    b.part(`thruster_${i + 1}`, lathe([[0.03, 0.12], [0.04, 0.04], [0.08, -0.1]], 48), [x, -0.82, z], null, 0x4c5057, { mat: 'metal' }));
  b.part('battery', rbox(0.5, 0.3, 0.4, 0.04), [0.45, -0.45, 0.72], null, 0x3b3f46, { mat: 'metal' });
  b.part('avionics', rbox(0.5, 0.3, 0.4, 0.04), [-0.45, -0.45, 0.72], null, 0x2b5f4f, { mat: 'metal' });
  const dish = lathe(Array.from({ length: 14 }, (_, i) => [i * 0.045, (i * 0.045) ** 2 * 0.9]), 96);
  b.add(dish, [0, 0.72, 0], [Math.PI, 0, 0], 'paint', 0xf2f3f4);
  b.add(cyl(0.02, 0.02, 0.5, false, 24), [0, 0.95, 0], null, 'chrome', 0xd9dde2);
  return b;
}

function windTurbine() {
  const b = new Builder();
  b.add(cyl(0.18, 0.36, 9), [0, -4.5, 0], null, 'paint', 0xf2f3f4);
  b.part('drivetrain', fuselageGeo(1.9, 0.38, 0.2, 0.25, 1), [-0.3, 0.3, 0], null, 0xf2f3f4, { mat: 'paint' });
  b.part('main_bearing', torus(0.26, 0.07), [0.6, 0.3, 0], [0, Math.PI / 2, 0], 0x8e959d, { mat: 'metal' });
  rotor(b, 'rotor', [0.88, 0.3, 0], 4.4, 3, 'x', 0.09);
  b.part('electrical', rbox(0.8, 0.6, 0.6, 0.06), [0.9, -8.7, 0], null, 0x3b3f46, { mat: 'metal' });
  return b;
}

function missileRound() {
  const b = new Builder();
  b.part('canister', new THREE.CylinderGeometry(0.62, 0.62, 7.2, 96, 1, true, 0, Math.PI * 1.3), [0, 0, 0], [0, 0, Math.PI / 2], 0x4f5d4a, { mat: 'paint' });
  for (const x of [3.6, -3.6]) b.add(torus(0.62, 0.05), [x, 0, 0], [0, Math.PI / 2, 0], 'metal', 0x3a3d42);
  b.part('airframe', cyl(0.32, 0.32, 4.6), [0, 0, 0], [0, 0, Math.PI / 2], 0xdfe3e7, { mat: 'paint' });
  b.part('seeker', lathe(Array.from({ length: 20 }, (_, i) => [0.32 * Math.sqrt(1 - i / 19), (i / 19) * 1.1]), 96), [2.3, 0, 0], [0, 0, -Math.PI / 2], 0xf0f2f4, { mat: 'paint' });
  b.part('warhead_section', cyl(0.33, 0.33, 0.7), [1.8, 0, 0], [0, 0, Math.PI / 2], 0x8c7a4a, { mat: 'paint' });
  b.part('guidance', cyl(0.33, 0.33, 0.45), [1.15, 0, 0], [0, 0, Math.PI / 2], 0x3b4148, { mat: 'paint' });
  b.part('rocket_motor', cyl(0.33, 0.33, 2.0), [-1.0, 0, 0], [0, 0, Math.PI / 2], 0x4c5057, { mat: 'metal' });
  b.part('battery', rbox(0.35, 0.18, 0.2, 0.03), [0.6, 0.36, 0], null, 0x3b3f46, { mat: 'metal' });
  b.part('nozzle', lathe([[0.12, 0.2], [0.16, 0], [0.26, -0.3]], 64), [-2.55, 0, 0], [0, 0, Math.PI / 2], 0x2a2c30, { mat: 'metal' });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    b.part(`control_fin_${i + 1}`, finGeo(0.5, 0.7, 0.3, 0.35, 0.035), [-1.65, Math.sin(a) * 0.3, Math.cos(a) * 0.3], [a - Math.PI / 2, 0, 0], 0xc3c9cf, { mat: 'paint' });
  }
  b.part('storage_logger', rbox(0.4, 0.25, 0.3, 0.04), [2.6, -0.78, 0], null, 0x2b5f4f, { mat: 'metal' });
  return b;
}

function machine() {
  const b = new Builder();
  b.add(rbox(6.4, 0.25, 2.2, 0.05), [0, -1.35, 0], null, 'paint', 0x2a2d33);
  for (const x of [-2.4, 0, 2.4]) b.add(rbox(0.2, 0.9, 1.6, 0.04), [x, -0.8, 0], null, 'paint', 0x3a3d44);
  b.part('compressor', lathe([[0.75, -0.9], [0.85, -0.3], [0.95, 0.9]]).rotateZ(Math.PI / 2), [1.6, 0, 0], null, 0xd6dade, { mat: 'metal' });
  b.part('combustor', cyl(0.85, 0.85, 1.1), [0.1, 0, 0], [0, 0, Math.PI / 2], 0xb9773c, { mat: 'metal' });
  b.part('turbine', cyl(0.8, 0.65, 1.2), [-1.1, 0, 0], [0, 0, Math.PI / 2], 0x55606b, { mat: 'metal' });
  b.add(cyl(0.55, 0.45, 1.0, true), [-2.2, 0, 0], [0, 0, Math.PI / 2], 'metal', 0x2a2c30);
  b.part('bearing_front', torus(0.35, 0.09), [2.65, 0, 0], [0, Math.PI / 2, 0], 0x8e959d, { mat: 'chrome' });
  b.part('bearing_rear', torus(0.35, 0.09), [-1.85, 0, 0], [0, Math.PI / 2, 0], 0x8e959d, { mat: 'chrome' });
  b.part('gearbox', rbox(0.9, 0.8, 0.9, 0.1), [3.2, -0.6, 0], null, 0x8e959d, { mat: 'metal' });
  b.part('oil_pump', cyl(0.22, 0.22, 0.5), [2.2, -1.0, 0.7], null, 0x2f7d6d, { mat: 'paint' });
  b.part('fuel_pump', cyl(0.2, 0.2, 0.45), [0.6, -1.0, 0.75], null, 0x8c6a2f, { mat: 'paint' });
  b.part('generator', cyl(0.45, 0.45, 0.9), [3.2, 0.45, 0], [0, 0, Math.PI / 2], 0x4b5966, { mat: 'paint' });
  return b;
}

function generic(componentIds) {
  const b = new Builder(); const n = componentIds.length, cols = Math.ceil(Math.sqrt(n));
  componentIds.forEach((id, i) => b.part(id, rbox(0.8, 0.4, 0.8, 0.08),
    [(i % cols) * 1.1 - (cols - 1) * 0.55, 0, Math.floor(i / cols) * 1.1 - (Math.ceil(n / cols) - 1) * 0.55], null, 0xc9d2dc, { mat: 'metal' }));
  return b;
}

export function buildModel(look, componentIds) {
  const t = {
    quadcopter: () => multirotor(4, {}, {}), hexacopter: () => multirotor(6, {}, { arm: 1.2, batteries: 2, offset: 0 }),
    evtol, airliner_narrowbody: airliner, fighter_single_engine: tejas, fighter_twin_engine: su30,
    turboprop_transport: turboprop, male_uav: heron, helicopter, launch_vehicle: launchVehicle, satellite, wind_turbine: windTurbine,
    missile_round: missileRound, custom: machine,
  }[look];
  const b = t ? t() : generic(componentIds);
  const missing = componentIds.filter((c) => !b.parts[c]);
  return { group: b.group, parts: b.parts, spinners: b.spinners, missing };
}

/** the textures a material hint can carry */
export const TEXTURES = { carbon: carbonTex, solar: solarTex, panels: panelTex };

export const LOOKS = ['quadcopter', 'hexacopter', 'evtol', 'airliner_narrowbody', 'fighter_single_engine', 'fighter_twin_engine',
  'turboprop_transport', 'male_uav', 'helicopter', 'launch_vehicle', 'satellite', 'wind_turbine', 'missile_round', 'custom'];
