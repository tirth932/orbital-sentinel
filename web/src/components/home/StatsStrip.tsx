"use client";

import { CountUp } from "@/components/hud/CountUp";
import { HudPanel } from "@/components/hud/HudPanel";
import { TiltCard } from "@/components/hud/TiltCard";
import { percent, signedPoints } from "@/lib/format";
import type { Results } from "@/types/data";

export function StatsStrip({ results }: { results: Results }) {
  const recallDelta = results.lstm.overall.recall - results.baseline.overall.recall;
  const precisionDelta = results.lstm.overall.precision - results.baseline.overall.precision;
  const cards = [
    { label: "Channels", value: results.counts.channels, digits: 0, suffix: "", note: "SMAP + MSL" },
    { label: "Anomalies", value: results.counts.anomalies, digits: 0, suffix: "", note: "Point and contextual" },
    {
      label: "LSTM precision",
      value: results.lstm.overall.precision * 100,
      digits: 1,
      suffix: "%",
      note: signedPoints(precisionDelta) + " vs baseline",
    },
    {
      label: "LSTM recall",
      value: results.lstm.overall.recall * 100,
      digits: 1,
      suffix: "%",
      note: signedPoints(recallDelta) + " vs baseline",
    },
    {
      label: "Baseline recall",
      value: results.baseline.overall.recall * 100,
      digits: 1,
      suffix: "%",
      note: percent(results.baseline.overall.precision) + " precision",
    },
  ];

  return (
    <section className="mx-auto grid max-w-6xl gap-3 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-5" aria-label="Run summary">
      {cards.map((card) => (
        <TiltCard key={card.label}>
          <HudPanel title={card.label}>
            <p className="font-mono text-3xl text-white">
              <CountUp value={card.value} digits={card.digits} suffix={card.suffix} />
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted">{card.note}</p>
          </HudPanel>
        </TiltCard>
      ))}
    </section>
  );
}
