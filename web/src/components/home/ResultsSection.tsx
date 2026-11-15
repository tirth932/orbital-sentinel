"use client";

import { HudPanel } from "@/components/hud/HudPanel";
import { ComparisonTable } from "@/components/home/ComparisonTable";
import { ResultBars } from "@/components/home/ResultBars";
import { PAPER_CITATION, PAPER_PRECISION, PAPER_RECALL } from "@/lib/site";
import { percent } from "@/lib/format";
import type { Results } from "@/types/data";

export function ResultsSection({ results }: { results: Results }) {
  return (
    <section id="results" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <p className="font-mono text-[10px] tracking-[0.22em] text-cyan uppercase">Results</p>
      <h2 className="mt-2 text-3xl text-white sm:text-4xl">LSTM against a 3-sigma baseline</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/80">{results.comparison_note}</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <HudPanel title="Event scores">
          <ComparisonTable lstm={results.lstm} baseline={results.baseline} />
        </HudPanel>
        <HudPanel title="Recall and precision">
          <ResultBars lstm={results.lstm} baseline={results.baseline} />
        </HudPanel>
      </div>
      <HudPanel className="mt-4" title="Separate from this run">
        <p className="text-sm leading-6 text-ink/85">
          Hundman et al. reported {percent(PAPER_PRECISION, 1)} precision and {percent(PAPER_RECALL, 1)} recall
          in the NASA JPL paper. Those figures are not measurements from this repository.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Curiosity (MSL) telemetry is treated as the harder mission in that study. Read the MSL column on its
          own instead of assuming the overall score applies to both spacecraft.
        </p>
        <p className="mt-3 font-mono text-[11px] text-muted">{PAPER_CITATION}</p>
      </HudPanel>
    </section>
  );
}
