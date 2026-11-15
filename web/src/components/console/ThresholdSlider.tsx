"use client";

export function ThresholdSlider({
  min,
  max,
  value,
  locked,
  onChange,
  onReset,
}: {
  min: number;
  max: number;
  value: number;
  locked: boolean;
  onChange: (value: number) => void;
  onReset: () => void;
}) {
  const step = Math.max((max - min) / 200, 0.0001);
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="threshold" className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
          Threshold {value.toFixed(4)}
        </label>
        <button
          type="button"
          onClick={onReset}
          className="border border-cyan/40 px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-cyan uppercase"
        >
          Reset to model threshold
        </button>
      </div>
      <input
        id="threshold"
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampValue(value, min, max)}
        disabled={locked}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-amber disabled:opacity-40"
      />
      {locked ? (
        <p className="mt-2 flex items-center gap-2 font-mono text-xs text-amber">
          <LockIcon />
          Full-resolution error was not exported for this channel. The line is the saved model threshold.
        </p>
      ) : (
        <p className="mt-2 font-mono text-[11px] text-muted">
          Dragging recomputes raw threshold crossings and the 13% prune, then rescores this channel.
        </p>
      )}
    </div>
  );
}

function clampValue(value: number, min: number, max: number): number {
  if (max <= min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2" y="6" width="10" height="7" fill="none" stroke="currentColor" />
      <path d="M4 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" />
    </svg>
  );
}
