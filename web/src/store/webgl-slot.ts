"use client";

import { create } from "zustand";

type SlotKey = "hero" | "globe";

type SlotState = {
  ratios: Record<SlotKey, number>;
  setRatio: (key: SlotKey, ratio: number) => void;
};

export const useWebglSlot = create<SlotState>((set) => ({
  ratios: { hero: 1, globe: 0 },
  setRatio: (key, ratio) =>
    set((state) => ({
      ratios: { ...state.ratios, [key]: ratio },
    })),
}));

export function useOwnsWebgl(key: SlotKey): boolean {
  return useWebglSlot((state) => {
    const { hero, globe } = state.ratios;
    const best = Math.max(hero, globe);
    if (best < 0.12) {
      return false;
    }
    return (key === "hero" ? hero : globe) >= best;
  });
}
