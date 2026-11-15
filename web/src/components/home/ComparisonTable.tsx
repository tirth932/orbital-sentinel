"use client";

import { useState } from "react";

import { percent } from "@/lib/format";
import type { Metrics, ModelGroup } from "@/types/data";

type Slice = "overall" | "SMAP" | "MSL" | "point" | "contextual";

const TABS: { id: Slice; label: string }[] = [
  { id: "overall", label: "Overall" },
  { id: "SMAP", label: "SMAP" },
  { id: "MSL", label: "MSL" },
  { id: "point", label: "Point" },
  { id: "contextual", label: "Contextual" },
];

export function pickSlice(group: ModelGroup, slice: Slice): Metrics {
  if (slice === "overall") {
    return group.overall;
  }
  if (slice === "SMAP" || slice === "MSL") {
    return group.spacecraft[slice];
  }
  return group.class[slice];
}

export function ComparisonTable({ lstm, baseline }: { lstm: ModelGroup; baseline: ModelGroup }) {
  const [slice, setSlice] = useState<Slice>("overall");
  const left = pickSlice(lstm, slice);
  const right = pickSlice(baseline, slice);
  return (
    <div>
      <div role="tablist" aria-label="Result breakdown" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={slice === tab.id}
            onClick={() => setSlice(tab.id)}
            className={`px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase ${
              slice === tab.id ? "bg-cyan text-[#041016]" : "border border-white/15"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left font-mono text-sm">
          <caption className="mb-3 text-left text-xs tracking-[0.14em] text-muted uppercase">
            Event-level scores, {slice}
          </caption>
          <thead>
            <tr className="text-muted">
              <th className="py-2 font-normal">Model</th>
              <th className="py-2 font-normal">Precision</th>
              <th className="py-2 font-normal">Recall</th>
              <th className="py-2 font-normal">F1</th>
              <th className="py-2 font-normal">TP</th>
              <th className="py-2 font-normal">FP</th>
              <th className="py-2 font-normal">FN</th>
            </tr>
          </thead>
          <tbody>
            <MetricRow name="LSTM" metrics={left} />
            <MetricRow name="Baseline z-score" metrics={right} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricRow({ name, metrics }: { name: string; metrics: Metrics }) {
  return (
    <tr className="border-t border-white/10">
      <th className="py-2 pr-3 font-normal text-white" scope="row">
        {name}
      </th>
      <td>{percent(metrics.precision)}</td>
      <td>{percent(metrics.recall)}</td>
      <td>{percent(metrics.f1)}</td>
      <td>{metrics.tp}</td>
      <td>{metrics.fp}</td>
      <td>{metrics.fn}</td>
    </tr>
  );
}
