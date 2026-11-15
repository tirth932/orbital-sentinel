"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 72;

export function TelemetryRing({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) {
      return;
    }
    const time = state.clock.elapsedTime;
    const bursting = !reducedMotion && time % 4.8 < 0.7;
    const pulse = bursting ? Math.sin(((time % 4.8) / 0.7) * Math.PI) : 0;
    const hotIndex = Math.floor(time) % COUNT;
    for (let index = 0; index < COUNT; index += 1) {
      const angle = (index / COUNT) * Math.PI * 2;
      const hot = bursting && Math.abs(index - hotIndex) < 4;
      const radius = 1.05 + (hot ? 0.42 * pulse : 0);
      dummy.position.set(Math.cos(angle) * radius, Math.sin(angle * 2) * 0.05, Math.sin(angle) * radius * 0.72);
      dummy.scale.setScalar(hot ? 1.7 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.set(hot ? "#ff2e93" : "#00e5ff");
      mesh.setColorAt(index, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[0.028, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
