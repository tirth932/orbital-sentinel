"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/hooks";

export function TypeLine({ text }: { text: string }) {
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = useState(reduced ? text.length : 0);

  useEffect(() => {
    if (reduced) {
      setCount(text.length);
      return;
    }
    if (count >= text.length) {
      return;
    }
    const timer = window.setTimeout(() => setCount((value) => value + 1), 42);
    return () => window.clearTimeout(timer);
  }, [count, reduced, text]);

  return (
    <p aria-label={text} className="font-mono text-sm text-cyan sm:text-base">
      <span aria-hidden="true">
        {text.slice(0, count)}
        <span className="caret" />
      </span>
    </p>
  );
}
