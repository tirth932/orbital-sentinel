"use client";

import { HudPanel } from "@/components/hud/HudPanel";
import { StepDiagram } from "@/components/home/StepDiagram";

const STEPS = [
  {
    kind: "window" as const,
    title: "Window",
    body: "Each example is the last 250 steps of telemetry and command columns. The target is the next telemetry value.",
  },
  {
    kind: "predict" as const,
    title: "Predict",
    body: "A two-layer LSTM with 80 units forecasts that next value. One model is trained per channel on nominal data only.",
  },
  {
    kind: "smooth" as const,
    title: "Smooth error",
    body: "Absolute forecast error is smoothed with an EWMA of span 30 so isolated noise does not become an event.",
  },
  {
    kind: "threshold" as const,
    title: "Dynamic threshold",
    body: "Epsilon is chosen from the error stream itself, then sequences that are not a 13% step down in peak error are pruned.",
  },
];

export function HowItWorks() {
  return (
    <section id="method" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <p className="font-mono text-[10px] tracking-[0.22em] text-cyan uppercase">Method</p>
      <h2 className="mt-2 text-3xl text-white sm:text-4xl">How a channel becomes a flag</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {STEPS.map((step, index) => (
          <HudPanel key={step.kind} title={`0${index + 1} ${step.title}`}>
            <StepDiagram kind={step.kind} />
            <p className="mt-3 text-sm leading-6 text-ink/85">{step.body}</p>
          </HudPanel>
        ))}
      </div>
    </section>
  );
}
