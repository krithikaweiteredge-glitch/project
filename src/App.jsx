import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll } from '@react-three/drei';
import Scene from './scene/Scene';
import Overlay from './ui/Overlay';
import { Chrome, Loader } from './ui/Chrome';
import { SECTIONS } from './store';

export default function App() {
  return (
    <>
      <Canvas
        className="canvas"
        dpr={[1, 2]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [9.6, 3.0, 13.8], fov: 32, near: 0.05, far: 200 }}
      >
        <Suspense fallback={null}>
          <ScrollControls pages={SECTIONS} damping={0.22}>
            <Scene />
            <Scroll html style={{ width: '100%' }}>
              <Overlay />
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>
      <Chrome />
      <Loader />
    </>
  );
}
