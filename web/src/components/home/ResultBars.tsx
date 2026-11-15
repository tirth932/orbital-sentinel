"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { pickSlice } from "@/components/home/ComparisonTable";
import { percent } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/hooks";
import type { ModelGroup } from "@/types/data";

export function ResultBars({ lstm, baseline }: { lstm: ModelGroup; baseline: ModelGroup }) {
  const [slice, setSlice] = useState<"overall" | "SMAP" | "MSL" | "point" | "contextual">("overall");
  const reduced = usePrefersReducedMotion();
  const left = pickSlice(lstm, slice);
  const right = pickSlice(baseline, slice);
  const rows = [
    { label: "LSTM precision", value: left.precision, color: "#00e5ff" },
    { label: "LSTM recall", value: left.recall, color: "#35f2a8" },
    { label: "Baseline precision", value: right.precision, color: "#ffb020" },
    { label: "Baseline recall", value: right.recall, color: "#ff2e93" },
  ];
  return (
    <div>
      <label htmlFor="bar-slice" className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
        Bars
      </label>
      <select
        id="bar-slice"
        value={slice}
        onChange={(event) => setSlice(event.target.value as typeof slice)}
        className="mt-2 block border border-white/15 bg-[#05060a] px-3 py-2 font-mono text-sm"
      >
        <option value="overall">Overall</option>
        <option value="SMAP">SMAP</option>
        <option value="MSL">MSL</option>
        <option value="point">Point</option>
        <option value="contextual">Contextual</option>
      </select>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between font-mono text-[11px]">
              <span>{row.label}</span>
              <span>{percent(row.value)}</span>
            </div>
            <div className="h-2 bg-white/10">
              <motion.div
                className="h-full origin-left"
                style={{ background: row.color }}
                initial={{ width: reduced ? `${row.value * 100}%` : 0 }}
                whileInView={{ width: `${row.value * 100}%` }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: reduced ? 0 : 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
