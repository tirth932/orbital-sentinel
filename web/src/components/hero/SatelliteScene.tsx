"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";

import { EarthHologram } from "@/components/hero/EarthHologram";
import { StarField } from "@/components/hero/StarField";
import { TelemetryRing } from "@/components/hero/TelemetryRing";

function SatelliteBody({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const group = ref.current;
    if (!group) {
      return;
    }
    const time = reducedMotion ? 0.8 : state.clock.elapsedTime * 0.16;
    group.position.set(Math.cos(time) * 3.15, Math.sin(time * 2) * 0.38, Math.sin(time) * 3.15);
    group.lookAt(0, 0, 0);
  });

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[0.72, 0.42, 0.42]} />
        <meshStandardMaterial color="#d5e4ea" metalness={0.72} roughness={0.28} emissive="#06323c" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[-1.15, 0, 0]}>
        <boxGeometry args={[1.35, 0.52, 0.04]} />
        <meshStandardMaterial color="#10283a" metalness={0.45} roughness={0.32} emissive="#00e5ff" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[1.15, 0, 0]}>
        <boxGeometry args={[1.35, 0.52, 0.04]} />
        <meshStandardMaterial color="#10283a" metalness={0.45} roughness={0.32} emissive="#7c4dff" emissiveIntensity={0.28} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.42, 10]} />
        <meshStandardMaterial color="#c5d4dc" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.68, 0]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.05, 0.1, 18]} />
        <meshStandardMaterial color="#e8eef2" metalness={0.85} roughness={0.15} emissive="#7c4dff" emissiveIntensity={0.25} />
      </mesh>
      <TelemetryRing reducedMotion={reducedMotion} />
    </group>
  );
}

function SceneRig({ reducedMotion }: { reducedMotion: boolean }) {
  const rig = useRef<THREE.Group>(null);
  const orbit = useMemo(() => {
    const points: [number, number, number][] = [];
    for (let index = 0; index <= 96; index += 1) {
      const angle = (index / 96) * Math.PI * 2;
      points.push([Math.cos(angle) * 3.15, 0, Math.sin(angle) * 3.15]);
    }
    return points;
  }, []);

  useFrame((state, delta) => {
    const group = rig.current;
    if (!group) {
      return;
    }
    const targetX = reducedMotion ? 0 : state.pointer.y * 0.12;
    const targetY = reducedMotion ? 0 : state.pointer.x * 0.22;
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetX, 3, delta);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetY, 3, delta);
  });

  return (
    <group ref={rig}>
      <StarField reducedMotion={reducedMotion} />
      <EarthHologram reducedMotion={reducedMotion} />
      <Line points={orbit} color="#00e5ff" transparent opacity={0.28} />
      <SatelliteBody reducedMotion={reducedMotion} />
    </group>
  );
}

function Effects({ reducedMotion }: { reducedMotion: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const offset = useMemo(() => new THREE.Vector2(0.0006, 0.001), []);
  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 8;
    setEnabled(!reducedMotion && cores >= 6);
  }, [reducedMotion]);
  if (!enabled) {
    return null;
  }
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.5} luminanceThreshold={0.28} mipmapBlur />
      <ChromaticAberration offset={offset} radialModulation={false} modulationOffset={0} />
    </EffectComposer>
  );
}

export default function SatelliteScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.7, 8.6], fov: 38 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#05060a")}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[5, 3, 4]} intensity={18} color="#00e5ff" />
      <pointLight position={[-4, -2, -3]} intensity={10} color="#7c4dff" />
      <SceneRig reducedMotion={reducedMotion} />
      <Effects reducedMotion={reducedMotion} />
    </Canvas>
  );
}
