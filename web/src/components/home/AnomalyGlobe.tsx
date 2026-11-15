"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { usePrefersReducedMotion } from "@/lib/hooks";
import { useOwnsWebgl, useWebglSlot } from "@/store/webgl-slot";
import type { AnomalyRecord } from "@/types/data";

type LaidOut = {
  record: AnomalyRecord;
  position: [number, number, number];
  color: string;
};

export default function AnomalyGlobe({ anomalies }: { anomalies: AnomalyRecord[] }) {
  const reduced = usePrefersReducedMotion();
  const owns = useOwnsWebgl("globe");
  const setRatio = useWebglSlot((state) => state.setRatio);
  const sectionRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(anomalies[0]?.id ?? "");
  const found = anomalies.filter((item) => item.found).length;

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setRatio("globe", entries[0]?.intersectionRatio ?? 0),
      { threshold: [0, 0.2, 0.45, 0.8] },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      setRatio("globe", 0);
    };
  }, [setRatio]);

  const active = anomalies.find((item) => item.id === selected) ?? anomalies[0];

  return (
    <section id="globe" ref={sectionRef} className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <p className="font-mono text-[10px] tracking-[0.22em] text-cyan uppercase">Anomaly globe</p>
      <h2 className="mt-2 text-3xl text-white sm:text-4xl">105 events, placed by channel and time</h2>
      <p className="sr-only">
        {anomalies.length} anomalies, {found} overlapped by an LSTM flag, {anomalies.length - found} missed.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative h-[460px] border border-white/10 bg-black/40">
          {owns ? (
            <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.4, 5.2], fov: 45 }} gl={{ antialias: true, alpha: true }}>
              <color attach="background" args={["#070910"]} />
              <ambientLight intensity={0.6} />
              <GlobePoints anomalies={anomalies} selectedId={selected} reducedMotion={reduced} onSelect={setSelected} />
            </Canvas>
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-xs text-muted">Globe waits until it is on screen.</div>
          )}
        </div>
        <div className="border border-white/10 p-4">
          <label htmlFor="anomaly-select" className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
            Inspect anomaly
          </label>
          <select
            id="anomaly-select"
            value={active?.id ?? ""}
            onChange={(event) => setSelected(event.target.value)}
            className="mt-2 w-full border border-white/15 bg-[#05060a] px-2 py-2 font-mono text-sm"
          >
            {anomalies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.channel} {item.class} {item.found ? "found" : "missed"}
              </option>
            ))}
          </select>
          {active ? (
            <dl className="mt-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between"><dt className="text-muted">Channel</dt><dd>{active.channel}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Spacecraft</dt><dd>{active.spacecraft}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Class</dt><dd>{active.class}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Range</dt><dd>{active.start}–{active.end}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">LSTM</dt><dd className={active.found ? "text-mint" : "text-magenta"}>{active.found ? "Found" : "Missed"}</dd></div>
            </dl>
          ) : null}
          <p className="mt-4 text-xs leading-5 text-muted">Mint points were overlapped by an LSTM sequence. Magenta points were missed. Angle is the channel. Radius is the event time.</p>
        </div>
      </div>
    </section>
  );
}

function GlobePoints({
  anomalies,
  selectedId,
  reducedMotion,
  onSelect,
}: {
  anomalies: AnomalyRecord[];
  selectedId: string;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const layout = useMemo(() => placeAnomalies(anomalies), [anomalies]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) {
      return;
    }
    layout.forEach((item, index) => {
      const selected = item.record.id === selectedId;
      dummy.position.set(item.position[0], item.position[1], item.position[2]);
      dummy.scale.setScalar(selected ? 2.2 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.set(item.color);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [color, dummy, layout, selectedId]);

  useFrame((_, delta) => {
    if (group.current && !reducedMotion) {
      group.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.55, 24, 16]} />
        <meshBasicMaterial color="#00e5ff" wireframe transparent opacity={0.35} />
      </mesh>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, Math.max(layout.length, 1)]}
        frustumCulled={false}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          const index = event.instanceId;
          const item = index === undefined ? undefined : layout[index];
          if (item) {
            onSelect(item.record.id);
          }
        }}
      >
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function placeAnomalies(anomalies: AnomalyRecord[]): LaidOut[] {
  const channels = [...new Set(anomalies.map((item) => item.channel))];
  const maxEnd = Math.max(1, ...anomalies.map((item) => item.end));
  return anomalies.map((record) => {
    const index = Math.max(0, channels.indexOf(record.channel));
    const angle = (index / Math.max(channels.length, 1)) * Math.PI * 2;
    const radius = 1.55 + (record.start / maxEnd) * 1.25;
    const lift = record.class === "point" ? 0.42 : -0.42;
    return {
      record,
      position: [Math.cos(angle) * radius, lift, Math.sin(angle) * radius],
      color: record.found ? "#35f2a8" : "#ff2e93",
    };
  });
}
