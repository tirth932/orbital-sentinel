import type { Verdict } from "@/lib/detector";

const COPY: Record<Verdict, { label: string; className: string }> = {
  found: { label: "Found", className: "border-mint/70 text-mint bg-mint/10" },
  missed: { label: "Missed", className: "border-magenta/70 text-magenta bg-magenta/10" },
  false_alarm: { label: "False alarm", className: "border-amber/70 text-amber bg-amber/10" },
  partial: { label: "Partial", className: "border-cyan/70 text-cyan bg-cyan/10" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const item = COPY[verdict];
  return (
    <span
      className={`inline-flex border px-2 py-1 font-mono text-[10px] tracking-[0.16em] uppercase ${item.className}`}
    >
      {item.label}
    </span>
  );
}
