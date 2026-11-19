import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Sunset above a sea of clouds, all made here in code (no downloads).
 *
 * The clouds are volumetric: for every pixel we march a ray through a slab of 3D noise
 * under the aircraft and work out how much sunlight gets through (Beer–Lambert), how much
 * scatters toward the camera (strong forward scattering = bright rims toward the sun),
 * plus "powder" darkening in thick cores and a sky-coloured ambient term.
 */

// Low sun, ahead and to the right of the opening shot
export const SUN_DIR = new THREE.Vector3(0.12, 0.1, -1).normalize();
export const HAZE = '#d39a72';

const CLOUD_TOP = -8, CLOUD_BOTTOM = -24;

// ---------- the sky colour (shared by the cloud shader and the reflection dome) ----------
const SKY_GLSL = /* glsl */`
  uniform vec3 sunDir;
  vec3 skyColor(vec3 d) {
    float h = d.y;
    vec3 zenith = vec3(0.07, 0.15, 0.32), mid = vec3(0.28, 0.40, 0.62), horizon = vec3(1.0, 0.56, 0.28);
    vec3 c = mix(mid, zenith, smoothstep(0.06, 0.5, h));
    c = mix(horizon, c, smoothstep(-0.02, 0.14, h));
    float s = max(dot(d, sunDir), 0.0);
    c += vec3(1.0, 0.55, 0.25) * (pow(s, 8.0) * 0.45 + pow(s, 64.0) * 0.9);
    return c;
  }
  vec3 sunDisc(vec3 d) {
    float s = dot(d, sunDir);
    return vec3(1.0, 0.9, 0.75) * smoothstep(0.9995, 0.9998, s) * 5.0;
  }
`;

/** simple gradient dome, only used to light the aircraft's reflections */
export function SkyDome() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: SKY_GLSL + `varying vec3 vDir; void main(){ vec3 d = normalize(vDir);
      vec3 c = d.y < -0.02 ? mix(vec3(0.95, 0.72, 0.58), vec3(0.55, 0.47, 0.55), smoothstep(-0.02, -0.5, d.y)) : skyColor(d);
      gl_FragColor = vec4(c, 1.0); }`,
  }), []);
  return <mesh material={mat}><sphereGeometry args={[100, 32, 16]} /></mesh>;
}

// ---------- tileable 3D noise, baked once into a texture ----------
function noiseTexture(N = 64) {
  let seed = 1337;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // value-noise lattices with periods that divide N, so the texture tiles
  const lattice = (P) => { const a = new Float32Array(P * P * P); for (let i = 0; i < a.length; i++) a[i] = rnd(); return a; };
  const periods = [4, 8, 16, 32];
  const lats = periods.map(lattice);
  const sm = (t) => t * t * (3 - 2 * t);
  const value = (lat, P, x, y, z) => {
    const fx = x * P, fy = y * P, fz = z * P;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
    const tx = sm(fx - x0), ty = sm(fy - y0), tz = sm(fz - z0);
    const L = (i, j, k) => lat[((i % P) * P + (j % P)) * P + (k % P)];
    const a = L(x0, y0, z0) + (L(x0 + 1, y0, z0) - L(x0, y0, z0)) * tx;
    const b = L(x0, y0 + 1, z0) + (L(x0 + 1, y0 + 1, z0) - L(x0, y0 + 1, z0)) * tx;
    const c = L(x0, y0, z0 + 1) + (L(x0 + 1, y0, z0 + 1) - L(x0, y0, z0 + 1)) * tx;
    const d = L(x0, y0 + 1, z0 + 1) + (L(x0 + 1, y0 + 1, z0 + 1) - L(x0, y0 + 1, z0 + 1)) * tx;
    const e = a + (b - a) * ty, f = c + (d - c) * ty;
    return e + (f - e) * tz;
  };
  // Worley (cell) noise: gives the round, billowy cauliflower lumps of cumulus
  const cells = (C) => { const pts = []; for (let i = 0; i < C * C * C; i++) pts.push([rnd(), rnd(), rnd()]); return pts; };
  const worleyC = [4, 8, 16], worleyP = worleyC.map(cells);
  const worley = (C, pts, x, y, z) => {
    const fx = x * C, fy = y * C, fz = z * C;
    const cx = Math.floor(fx), cy = Math.floor(fy), cz = Math.floor(fz);
    let best = 9;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const X = cx + i, Y = cy + j, Z = cz + k;
      const p = pts[(((X % C) + C) % C * C + (((Y % C) + C) % C)) * C + (((Z % C) + C) % C)];
      const dx = X + p[0] - fx, dy = Y + p[1] - fy, dz = Z + p[2] - fz;
      best = Math.min(best, dx * dx + dy * dy + dz * dz);
    }
    return 1 - Math.min(1, Math.sqrt(best));
  };
  const raw = new Float32Array(N * N * N * 2);
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, w = z / N;
    const per = value(lats[0], 4, u, v, w) * 0.5 + value(lats[1], 8, u, v, w) * 0.25 + value(lats[2], 16, u, v, w) * 0.15 + value(lats[3], 32, u, v, w) * 0.1;
    const wor = worley(4, worleyP[0], u, v, w) * 0.625 + worley(8, worleyP[1], u, v, w) * 0.25 + worley(16, worleyP[2], u, v, w) * 0.125;
    // "Perlin-Worley": soft large shapes carved into round billows
    const base = Math.max(0, Math.min(1, (per - (1 - wor)) / (1 - (1 - wor) + 1e-4) * 0.5 + per * 0.5));
    const i = ((z * N + y) * N + x) * 2;
    raw[i] = base;
    raw[i + 1] = wor;
  }
  // stretch each channel to the full 0..1 range so the shader's thresholds mean something
  const data = new Uint8Array(raw.length);
  for (let ch = 0; ch < 2; ch++) {
    let lo = 1, hi = 0;
    for (let i = ch; i < raw.length; i += 2) { lo = Math.min(lo, raw[i]); hi = Math.max(hi, raw[i]); }
    for (let i = ch; i < raw.length; i += 2) data[i] = Math.round(((raw[i] - lo) / (hi - lo)) * 255);
  }
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGFormat;
  tex.type = THREE.UnsignedByteType;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

const cloudMaterial = (noise) => new THREE.ShaderMaterial({
  depthWrite: false, depthTest: false, fog: false,
  uniforms: {
    sunDir: { value: SUN_DIR },
    noise: { value: noise },
    time: { value: 0 },
    projInv: { value: new THREE.Matrix4() },
    camWorld: { value: new THREE.Matrix4() },
    camPos: { value: new THREE.Vector3() },
  },
  vertexShader: /* glsl */`
    uniform mat4 projInv, camWorld;
    varying vec3 vRay;
    void main() {
      vec4 v = projInv * vec4(position.xy, 1.0, 1.0);
      vRay = (camWorld * vec4(v.xyz / v.w, 0.0)).xyz;
      gl_Position = vec4(position.xy, 1.0, 1.0);
    }`,
  fragmentShader: /* glsl */`
    precision highp float;
    precision highp sampler3D;
    uniform sampler3D noise;
    uniform float time;
    uniform vec3 camPos;
    varying vec3 vRay;
    ${SKY_GLSL}
    const float TOP = ${CLOUD_TOP.toFixed(2)}, BOT = ${CLOUD_BOTTOM.toFixed(2)};

    float remap(float v, float a, float b, float c, float d) { return c + (v - a) / (b - a) * (d - c); }

    float density(vec3 p, bool cheap) {
      float h = clamp((p.y - BOT) / (TOP - BOT), 0.0, 1.0);
      vec3 wind = vec3(time * 0.35, 0.0, time * 0.12);
      vec2 big = texture(noise, (p + wind) * vec3(0.0034, 0.011, 0.0034)).rg;
      // coverage varies across the sea: open gaps here, piled-up banks there
      float cover = smoothstep(0.1, 0.55, texture(noise, (p + wind * 0.5) * vec3(0.0011, 0.0, 0.0011) + 0.37).r);
      float shape = big.r + cover * 0.3 - 0.04;
      // each column rises as high as its noise value: rounded domes, flat-ish bottoms
      float d = (shape * 1.25 - h) * smoothstep(0.0, 0.08, h);
      if (d <= 0.0) return 0.0;
      if (cheap) return clamp(d * 2.5, 0.0, 1.0);
      // small billows eat into the surface: cauliflower tops, wispy bottoms
      float detail = texture(noise, (p + wind * 1.6) * vec3(0.045, 0.07, 0.045)).g;
      detail = detail * 0.7 + texture(noise, (p + wind * 2.0) * 0.13).g * 0.3;
      float erode = mix(1.0 - detail, detail, clamp(h * 2.0, 0.0, 1.0)) * 0.2;
      return clamp((d - erode) * 2.5, 0.0, 1.0);
    }

    float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    vec3 filmic(vec3 c) { return clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0); }

    void main() {
      vec3 rd = normalize(vRay), ro = camPos;
      vec3 sky = skyColor(rd) * 1.15 + sunDisc(rd);
      vec3 hazeCol = skyColor(normalize(vec3(rd.x, 0.0, rd.z))) * 1.15;
      if (rd.y >= 0.0) { gl_FragColor = vec4(filmic(sky), 1.0); return; }

      // enter and leave the cloud slab
      float t0 = (TOP - ro.y) / rd.y, t1 = (BOT - ro.y) / rd.y;
      float tMax = 420.0;
      t1 = min(t1, tMax);
      float steps = 56.0;
      float dt = max((t1 - t0) / steps, 0.25);
      float t = t0 + dt * hash(gl_FragCoord.xy);

      float cosT = dot(rd, sunDir);
      float phase = mix(hg(cosT, 0.65), hg(cosT, -0.15), 0.35);
      vec3 sunCol = vec3(1.0, 0.64, 0.36) * 13.0;
      vec3 T = vec3(1.0), L = vec3(0.0);
      float tHit = -1.0;
      for (int i = 0; i < 72; i++) {
        if (t > t1 || T.r < 0.02) break;
        vec3 p = ro + rd * t;
        float d = density(p, false);
        if (d > 0.002) {
          if (tHit < 0.0) tHit = t;
          // light reaching this point from the sun
          float od = 0.0;
          for (int j = 1; j <= 4; j++) od += density(p + sunDir * float(j * j) * 0.9, true) * float(j * 2 - 1) * 0.9;
          float sigma = 1.3;
          float beer = exp(-od * sigma) + 0.08 * exp(-od * sigma * 0.2); // + a little multiple scattering
          float powder = 1.0 - exp(-d * sigma * 6.0);
          float h = clamp((p.y - BOT) / (TOP - BOT), 0.0, 1.0);
          vec3 ambient = mix(vec3(0.03, 0.03, 0.06), vec3(0.20, 0.21, 0.34), h * h);
          vec3 S = sunCol * phase * beer * mix(0.6, 1.0, powder) + ambient;
          float a = exp(-d * 1.3 * dt);
          L += T * (1.0 - a) * S;
          T *= a;
        }
        t += dt;
      }
      // below the clouds: dim warm haze
      vec3 under = vec3(0.07, 0.06, 0.10);
      vec3 col = L + T * under;
      // aerial perspective: distant clouds melt into the horizon glow, with no seam at the horizon
      float dist = tHit > 0.0 ? tHit : t1;
      float f = 1.0 - exp(-max(dist - 60.0, 0.0) * 0.0028);
      col = mix(col, hazeCol, f);
      col = mix(col, sky, smoothstep(-0.035, 0.0, rd.y));
      gl_FragColor = vec4(filmic(col), 1.0);
    }`,
});

/**
 * The clouds are soft, so they are ray-marched at half resolution into their own buffer
 * (a quarter of the pixels) and then stretched over the background of the main scene.
 */
const RES = 0.5;
export function CloudSea() {
  const { gl, size, viewport } = useThree();
  const noise = useMemo(() => noiseTexture(64), []);
  const mat = useMemo(() => cloudMaterial(noise), [noise]);
  const [target, cloudScene] = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    const sc = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    sc.add(quad);
    return [rt, sc];
  }, [mat]);
  useEffect(() => {
    target.setSize(Math.max(1, Math.round(size.width * viewport.dpr * RES)), Math.max(1, Math.round(size.height * viewport.dpr * RES)));
  }, [size, viewport.dpr, target]);
  useEffect(() => () => target.dispose(), [target]);
  const show = useMemo(() => new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false, fog: false,
    uniforms: { map: { value: target.texture } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0); }`,
  }), [target]);

  useFrame(({ clock, camera }) => {
    const u = mat.uniforms;
    u.time.value = clock.elapsedTime;
    camera.updateMatrixWorld();
    u.projInv.value.copy(camera.projectionMatrixInverse);
    u.camWorld.value.copy(camera.matrixWorld);
    u.camPos.value.setFromMatrixPosition(camera.matrixWorld);
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.render(cloudScene, camera);
    gl.setRenderTarget(prev);
  });
  return (
    <mesh material={show} frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
