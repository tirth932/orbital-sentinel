import { GITHUB_URL, LINKEDIN_URL, PAPER_CITATION } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-cyan uppercase">Orbital Sentinel</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Dataset credit: NASA JPL SMAP and MSL telemetry, Hundman et al. 2018. {PAPER_CITATION}
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-4 font-mono text-xs tracking-wider text-cyan uppercase">
          <a href={GITHUB_URL}>GitHub</a>
          <a href={LINKEDIN_URL}>LinkedIn</a>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-6xl font-mono text-[11px] text-muted">MIT License</p>
    </footer>
  );
}
