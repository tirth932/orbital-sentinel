"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 800;

function randomUnit(rng: () => number): THREE.Vector3 {
  const z = rng() * 2 - 1;
  const angle = rng() * Math.PI * 2;
  const radius = Math.sqrt(Math.max(0, 1 - z * z));
  return new THREE.Vector3(Math.cos(angle) * radius, z, Math.sin(angle) * radius);
}

export function StarField({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    let seed = 42;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    return Array.from({ length: COUNT }, () => {
      const direction = randomUnit(next);
      const distance = 8 + next() * 16;
      return {
        position: direction.multiplyScalar(distance),
        scale: 0.008 + next() * 0.02,
        phase: next() * Math.PI * 2,
      };
    });
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) {
      return;
    }
    const dummy = new THREE.Object3D();
    seeds.forEach((star, index) => {
      dummy.position.copy(star.position);
      dummy.scale.setScalar(star.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [seeds]);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh || reducedMotion) {
      return;
    }
    mesh.rotation.y = state.clock.elapsedTime * 0.012;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 4, 3]} />
      <meshBasicMaterial color="#d7f7ff" />
    </instancedMesh>
  );
}
