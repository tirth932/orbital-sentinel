import type { ReactNode } from "react";

export function HudPanel({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={`hud-frame ${className}`}>
      <div className="hud-panel h-full p-4 sm:p-5">
        <span className="corner corner-tl" aria-hidden="true" />
        <span className="corner corner-tr" aria-hidden="true" />
        <span className="corner corner-bl" aria-hidden="true" />
        <span className="corner corner-br" aria-hidden="true" />
        {title ? (
          <p className="mb-3 font-mono text-[10px] tracking-[0.22em] text-cyan uppercase">{title}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
