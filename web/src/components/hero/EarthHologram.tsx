"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const surfaceVertex = `
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorld = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const surfaceFragment = `
varying vec3 vNormal;
varying vec3 vWorld;
uniform float uTime;
void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorld);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.3);
  vec3 direction = normalize(vWorld);
  float latitude = asin(clamp(direction.y, -1.0, 1.0));
  float longitude = atan(direction.z, direction.x);
  float grid = smoothstep(0.04, 0.0, abs(fract(latitude * 8.0) - 0.5) - 0.47);
  grid += smoothstep(0.04, 0.0, abs(fract(longitude * 10.0 + uTime * 0.02) - 0.5) - 0.47);
  vec3 color = mix(vec3(0.02, 0.18, 0.28), vec3(0.0, 0.9, 1.0), fresnel);
  color += vec3(0.2, 0.55, 1.0) * grid * 0.55;
  gl_FragColor = vec4(color, 0.34 + fresnel * 0.5);
}
`;

const atmosphereFragment = `
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorld);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.8);
  gl_FragColor = vec4(0.0, 0.85, 1.0, fresnel * 0.85);
}
`;

export function EarthHologram({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const surface = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  const atmosphere = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader: atmosphereFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      surface.dispose();
      atmosphere.dispose();
    };
  }, [atmosphere, surface]);

  useFrame((_, delta) => {
    const time = surface.uniforms.uTime;
    if (time) {
      time.value += reducedMotion ? 0 : delta;
    }
    if (group.current && !reducedMotion) {
      group.current.rotation.y += delta * 0.07;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1.35, 64, 64]} />
        <primitive object={surface} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.38, 28, 18]} />
        <meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.22} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.62, 48, 48]} />
        <primitive object={atmosphere} attach="material" />
      </mesh>
    </group>
  );
}
