import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, useScroll } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { easing } from 'maath';
import * as THREE from 'three';
import Drone, { exploded } from './Drone';
import { SkyDome, CloudSea, SUN_DIR, HAZE } from './Sky';
import { setT, state, SECTIONS, smooth, fixed } from '../store';

const eng = exploded('engine'), rad = exploded('radio');
// one camera keyframe per section: where the camera is, and what it looks at
const SHOTS = [
  { p: [9.6, 3.0, 13.8], at: [-0.8, 0.1, 0] },                                  // 0 hero
  { p: [8.4, 6.0, 19.5], at: [0.9, 0.3, 0] },                                // 1 exploded view
  { p: [eng[0] + 1.6, eng[1] + 1.0, 2.75], at: [eng[0], eng[1] - 0.05, eng[2]] },                     // 2 engine
  { p: [rad[0] + 1.2, rad[1] + 0.65, rad[2] + 2.0], at: rad },            // 3 datalink radio
  { p: [0.15, -0.75, 4.6], at: [-1.4, -1.5, 1.6] },                        // 4 oil sensor
  { p: [-3.2, 3.6, 13.2], at: [0, 0.2, 0] },                               // 5 remaining life
  { p: [10.5, 1.4, 9.6], at: [0, 0, 0] },                                   // 6 ready to fly
  { p: [5.0, 3.6, 3.6], at: [1.95, 0.1, 0] },                             // 7 the repair
  { p: [-1, 8.5, 16.5], at: [0, -0.4, 0] },                                // 8 fleet
  { p: [-10, 3.2, 17.5], at: [0, 0, 0] },                                 // 9 closing
];
const P = SHOTS.map((s) => new THREE.Vector3(...s.p));
const A = SHOTS.map((s) => new THREE.Vector3(...s.at));
const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3(), look = new THREE.Vector3();

function Rig() {
  const scroll = useScroll();
  const { camera, size } = useThree();
  useEffect(() => {
    const wide = size.width / size.height > 1 && size.width > 820;
    if (wide) camera.setViewOffset(size.width, size.height, -size.width * 0.17, 0, size.width, size.height);
    else camera.setViewOffset(size.width, size.height, 0, size.height * 0.2, size.width, size.height);
    camera.fov = wide ? 32 : 48;
    camera.updateProjectionMatrix();
  }, [size, camera]);

  useFrame(({ clock }, dt) => {
    const t = scroll.offset * (SECTIONS - 1);
    setT(t);
    const i = Math.min(SECTIONS - 2, Math.floor(t)), f = t - i;
    const m = smooth(0.4, 1, f); // hold on each shot, then glide to the next
    camTarget.lerpVectors(P[i], P[i + 1], m);
    lookTarget.lerpVectors(A[i], A[i + 1], m);
    const time = clock.elapsedTime;
    camTarget.x += Math.sin(time * 0.21) * 0.12;
    camTarget.y += Math.sin(time * 0.27) * 0.08;
    easing.damp3(camera.position, camTarget, 0.35, dt);
    easing.damp3(look, lookTarget, 0.3, dt);
    camera.lookAt(look);
  });
  return null;
}

function Mood() {
  // red light for NO-GO, green once fixed
  const red = useRef(), green = useRef(), drone = useRef();
  useFrame(({ clock }) => {
    const t = state.t, time = clock.elapsedTime;
    red.current.intensity = smooth(5.6, 6.0, t) * (1 - smooth(6.5, 6.8, t)) * 60;
    green.current.intensity = smooth(7.2, 7.5, t) * (1 - smooth(8.0, 8.4, t)) * 50 + smooth(8.8, 9.2, t) * 25;
    const hero = 1 - smooth(0.3, 0.9, t) + smooth(8.6, 9.2, t);
    drone.current.rotation.y = Math.sin(time * 0.22) * 0.32 * hero;
    drone.current.rotation.x = Math.sin(time * 0.5) * 0.03 * hero;
    drone.current.position.y = Math.sin(time * 0.7) * 0.08 * hero;
  });
  return (
    <>
      <pointLight ref={red} position={[3, 2.5, 4]} color="#ff3b3b" distance={14} />
      <pointLight ref={green} position={[3, 2.5, 4]} color="#34d399" distance={14} />
      <group ref={drone}><Drone /></group>
    </>
  );
}

export default function Scene() {
  return (
    <>
      <color attach="background" args={[HAZE]} />
      <fog attach="fog" args={[HAZE, 28, 120]} />
      <hemisphereLight args={['#9db8de', '#6b4a3a', 0.55]} />
      {/* the low sun, plus a cool fill from the open sky behind the camera */}
      <directionalLight position={SUN_DIR.clone().multiplyScalar(30).toArray()} intensity={3.2} color="#ffc48a" />
      <directionalLight position={[8, 10, 6]} intensity={0.9} color="#dfe8ff" />
      <Environment resolution={256} frames={1}>
        <SkyDome />
        <Lightformer form="rect" intensity={1.5} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#ffc48a" position={SUN_DIR.clone().multiplyScalar(8).toArray()} scale={[10, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      <Rig />
      {/* after the camera rig, so the clouds use this frame's camera */}
      <CloudSea />
      <Mood />
      <EffectComposer multisampling={4} disableNormalPass>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={1.15} luminanceSmoothing={0.2} />
        <Noise opacity={0.045} blendFunction={BlendFunction.OVERLAY} />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </>
  );
}
