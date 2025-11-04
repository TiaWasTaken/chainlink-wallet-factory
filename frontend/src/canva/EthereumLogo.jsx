// src/canva/EthereumLogo.jsx
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Bounds, OrbitControls } from "@react-three/drei";
import { Suspense, useMemo, useRef, useEffect } from "react";

function EthereumModel() {
  const { scene } = useGLTF("/models/ethereum_3d_logo.glb");
  const ref = useRef();

  const node = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#A463FF"),
          metalness: 0.25,
          roughness: 0.25,
          emissive: new THREE.Color("#A463FF").multiplyScalar(0.25),
          emissiveIntensity: 0.95,
        });
      }
    });
    return cloned;
  }, [scene]);

  // Posizionamento pulito e frontale
  useEffect(() => {
    if (ref.current) {
      ref.current.rotation.set(0, 0, 0);
      ref.current.position.set(0, 0, 0);
      ref.current.scale.set(1, 1, 1);
    }
  }, []);

  // Rotazione fluida
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.01;
  });

  return <primitive ref={ref} object={node} />;
}

export default function EthereumLogo() {
  return (
    <div className="w-full flex justify-center relative">
      <div className="w-[300px] h-[300px] rounded-2xl overflow-visible relative">
        <Canvas
          camera={{
            position: [0, 0, 2.5],
            fov: 35,
          }}
          gl={{ antialias: true }}
          onCreated={({ camera }) => {
            // 💫 orienta la camera leggermente come il modello era prima
            camera.rotation.set(-0.60, 0, 0);
          }}
        >
          <color attach="background" args={["#F4F5F7"]} />
          <Suspense fallback={null}>
            {/* Luci */}
            <ambientLight intensity={0.9} color="#ffffff" />
            <pointLight position={[0, 0, 2]} intensity={0.7} color="#FFD9FF" />
            <pointLight position={[2, 2, -2]} intensity={1.0} color="#CBA0FF" />
            <pointLight position={[-2, -2, -2]} intensity={0.8} color="#D694FF" />
            <directionalLight position={[0, 3, 2]} intensity={0.9} color="#FFBFFF" />

            <Bounds fit clip margin={1}>
              <EthereumModel />
            </Bounds>

            {/* 👇 OrbitControls ora allineato perfettamente */}
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              target={[0, 0, 0]}
              maxPolarAngle={Math.PI / 2}
              minPolarAngle={Math.PI / 2.5}
            />
          </Suspense>
        </Canvas>

        {/* Glow morbido */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full blur-[150px] bg-gradient-to-br from-pink-300 via-purple-400 to-fuchsia-400 opacity-35" />
        </div>
      </div>
    </div>
  );
}

