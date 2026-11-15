"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";

import { usePrefersReducedMotion } from "@/lib/hooks";

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) {
      return;
    }
    const lenis = new Lenis({ lerp: 0.09 });
    let frame = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const link = target.closest("a[href^='#']");
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const id = link.getAttribute("href");
      if (!id || id.length < 2) {
        return;
      }
      const node = document.querySelector(id);
      if (!(node instanceof HTMLElement)) {
        return;
      }
      event.preventDefault();
      lenis.scrollTo(node);
    };
    document.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, [reduced]);
  return children;
}
