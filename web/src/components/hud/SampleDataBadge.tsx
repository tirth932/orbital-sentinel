export function SampleDataBadge({ isSample }: { isSample: boolean }) {
  if (!isSample) {
    return null;
  }
  return (
    <span className="inline-flex items-center gap-2 border border-amber/70 bg-amber/15 px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-amber uppercase">
      <span className="h-1.5 w-1.5 bg-amber" aria-hidden="true" />
      Sample data
    </span>
  );
}
