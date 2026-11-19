import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { state, radioStatus, STATUS } from '../store';
import { darkMetal, alu, brass, glow } from './materials';

/** A rugged datalink radio: heat-sink fins, connectors, status LEDs. `swap` = the replacement unit. */
export default function Radio({ fresh = false, ...props }) {
  const body = useMemo(() => { const m = darkMetal.clone(); m.emissive = new THREE.Color('#f87171'); m.emissiveIntensity = 0; return m; }, []);
  const led = useMemo(() => glow('#34d399', 4), []);
  const finMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a414b', metalness: 0.85, roughness: 0.35 }), []);
  const ref = useRef();
  useFrame(({ clock }) => {
    const st = fresh ? 'SAFE' : radioStatus(state.t);
    const bad = st === 'NO_GO';
    body.emissiveIntensity = bad ? 0.35 + 0.25 * Math.sin(clock.elapsedTime * 5) : 0;
    led.color.set(STATUS[st].color).multiplyScalar(5);
  });
  return (
    <group ref={ref} {...props}>
      <RoundedBox args={[0.46, 0.18, 0.32]} radius={0.02} smoothness={4} material={body} />
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0, 0.125, -0.14 + i * 0.035]} material={finMat}><boxGeometry args={[0.44, 0.07, 0.01]} /></mesh>
      ))}
      {/* front panel: connectors + LEDs */}
      {[[-0.12, 0.0], [-0.02, 0.0], [0.09, 0.0]].map(([z], i) => (
        <mesh key={i} position={[0.245, -0.02, z + (i - 1) * 0.04]} rotation={[0, 0, Math.PI / 2]} material={i === 1 ? brass : alu}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 20]} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.233, 0.055, -0.1 + i * 0.03]} material={led}><boxGeometry args={[0.01, 0.012, 0.012]} /></mesh>
      ))}
    </group>
  );
}
