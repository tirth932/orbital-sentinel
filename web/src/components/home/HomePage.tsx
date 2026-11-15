"use client";

import dynamic from "next/dynamic";

import { Hero } from "@/components/hero/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Limitations } from "@/components/home/Limitations";
import { ResultsSection } from "@/components/home/ResultsSection";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SmoothScroll } from "@/components/home/SmoothScroll";
import { StatsStrip } from "@/components/home/StatsStrip";
import type { AnomalyRecord, Results } from "@/types/data";

const AnomalyGlobe = dynamic(() => import("@/components/home/AnomalyGlobe"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto h-[520px] max-w-6xl animate-pulse border border-white/10 bg-white/5" />
  ),
});

export function HomePage({ results, anomalies }: { results: Results; anomalies: AnomalyRecord[] }) {
  return (
    <SmoothScroll>
      <SiteHeader />
      <Hero isSample={results.is_sample} />
      <StatsStrip results={results} />
      <HowItWorks />
      <ResultsSection results={results} />
      <AnomalyGlobe anomalies={anomalies} />
      <Limitations />
      <SiteFooter />
    </SmoothScroll>
  );
}
