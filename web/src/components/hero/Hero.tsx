"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

import { GlitchText } from "@/components/hud/GlitchText";
import { SampleDataBadge } from "@/components/hud/SampleDataBadge";
import { TypeLine } from "@/components/hud/TypeLine";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { GITHUB_URL } from "@/lib/site";
import { useOwnsWebgl, useWebglSlot } from "@/store/webgl-slot";

const SatelliteScene = dynamic(() => import("@/components/hero/SatelliteScene"), {
  ssr: false,
  loading: () => <HeroSkeleton />,
});

function HeroSkeleton() {
  return <div className="absolute inset-0 bg-[#05060a]" />;
}

function LiteBackdrop({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="dust absolute inset-0 bg-[#05060a]" aria-hidden="true">
      <div className="absolute top-[58%] left-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/50 shadow-[0_0_80px_rgba(0,229,255,0.35)] sm:h-56 sm:w-56">
        <div className="absolute inset-3 rounded-full border border-dashed border-cyan/30" />
        <div className="absolute inset-8 rounded-full bg-cyan/10" />
      </div>
      <div className="absolute top-[58%] left-1/2">
        <div className={reducedMotion ? "sat-parked" : "orbit-sat"}>
          <div className="h-2.5 w-8 -translate-x-1/2 bg-cyan shadow-[0_0_16px_#00e5ff] sm:h-3 sm:w-10" />
        </div>
      </div>
    </div>
  );
}

export function Hero({ isSample }: { isSample: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<"pending" | "full" | "lite">("pending");
  const ownsCanvas = useOwnsWebgl("hero");
  const setRatio = useWebglSlot((state) => state.setRatio);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 768px) and (pointer: coarse)").matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    let webgl = false;
    try {
      const canvas = document.createElement("canvas");
      webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webgl = false;
    }
    setMode(!webgl || mobile || cores < 4 ? "lite" : "full");
  }, []);

  useEffect(() => {
    const node = document.getElementById("hero");
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setRatio("hero", entries[0]?.intersectionRatio ?? 0),
      { threshold: [0, 0.15, 0.4, 0.75, 1] },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      setRatio("hero", 0);
    };
  }, [setRatio]);

  const showScene = mode === "full" && ownsCanvas;

  return (
    <section id="hero" className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0">
        {showScene ? <SatelliteScene reducedMotion={reduced} /> : <LiteBackdrop reducedMotion={reduced} />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05060a] via-[#05060a]/20 to-[#05060a]/50" />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pt-2 pb-4 sm:px-10 sm:pb-8 lg:px-16">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <p className="font-mono text-[10px] tracking-[0.28em] text-cyan uppercase">Sys.orbital / listening</p>
          <SampleDataBadge isSample={isSample} />
        </div>
        <h1 className="max-w-5xl text-3xl leading-none font-semibold tracking-tight text-white [@media(min-height:640px)]:text-5xl [@media(min-height:860px)]:text-7xl">
          <GlitchText text="ORBITAL SENTINEL" />
        </h1>
        <p className="mt-3 hidden max-w-2xl text-base text-ink/80 [@media(min-height:760px)]:block sm:text-lg">
          LSTM anomaly detection on real NASA SMAP and Curiosity telemetry.
        </p>
        <div className="mt-3 hidden [@media(min-height:560px)]:block">
          <TypeLine text="> LISTENING TO 82 CHANNELS..." />
        </div>
        <div className="pointer-events-auto mt-4 flex flex-wrap gap-3">
          <Link
            href="/console"
            className="bg-cyan px-5 py-3 font-mono text-xs tracking-[0.16em] text-[#041016] uppercase"
          >
            Open Mission Console
          </Link>
          <a
            href={GITHUB_URL}
            className="border border-cyan/50 px-5 py-3 font-mono text-xs tracking-[0.16em] text-cyan uppercase"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
