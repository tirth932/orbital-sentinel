import { HudPanel } from "@/components/hud/HudPanel";

const LIMITS = [
  "Only SMAP and MSL are in the set. This is not a monitor for other spacecraft.",
  "Labels come from expert anomaly reports, so the score follows those reports.",
  "One LSTM is trained per channel, using that channel's nominal train file only.",
  "The threshold is unsupervised on the test error stream. It is not tuned on the labels.",
  "A labeled event counts as found when any flagged sequence overlaps it. A long flag can cover a short event.",
  "Command columns are model inputs. The network predicts the telemetry value only.",
];

export function Limitations() {
  return (
    <section id="limits" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <p className="font-mono text-[10px] tracking-[0.22em] text-cyan uppercase">Limits</p>
      <h2 className="mt-2 text-3xl text-white sm:text-4xl">What this run does not claim</h2>
      <HudPanel className="mt-6">
        <ul className="space-y-3 text-sm leading-6 text-ink/85">
          {LIMITS.map((item) => (
            <li key={item} className="border-l border-cyan/40 pl-3">
              {item}
            </li>
          ))}
        </ul>
      </HudPanel>
    </section>
  );
}
