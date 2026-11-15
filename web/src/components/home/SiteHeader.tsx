import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#05060a]/90 px-4 py-3 pr-5 backdrop-blur-md sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link href="/#hero" className="shrink-0 font-mono text-xs tracking-[0.2em] text-cyan uppercase">
          Orbital Sentinel
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-3">
          <nav
            aria-label="Primary"
            className="flex min-w-0 items-center gap-x-3 overflow-x-auto font-mono text-[11px] tracking-[0.14em] text-ink uppercase"
          >
            <a href="#method">Method</a>
            <a href="#results">Results</a>
            <a href="#globe">Globe</a>
            <a href="#limits">Limits</a>
          </nav>
          <Link href="/console" className="shrink-0 border border-cyan/50 px-2 py-1 font-mono text-[11px] tracking-[0.14em] text-cyan uppercase">
            Console
          </Link>
        </div>
      </div>
    </header>
  );
}
