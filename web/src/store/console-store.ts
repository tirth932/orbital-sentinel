"use client";

import { create } from "zustand";

export type CraftFilter = "all" | "SMAP" | "MSL";
export type ClassFilter = "all" | "point" | "contextual";
export type VerdictFilter = "all" | "found" | "missed" | "false_alarm";

type ConsoleState = {
  query: string;
  spacecraft: CraftFilter;
  anomalyClass: ClassFilter;
  verdict: VerdictFilter;
  showBaseline: boolean;
  selectedId: string | null;
  drawerOpen: boolean;
  threshold: number | null;
  setQuery: (value: string) => void;
  setSpacecraft: (value: CraftFilter) => void;
  setAnomalyClass: (value: ClassFilter) => void;
  setVerdict: (value: VerdictFilter) => void;
  setShowBaseline: (value: boolean) => void;
  setSelectedId: (value: string) => void;
  setDrawerOpen: (value: boolean) => void;
  setThreshold: (value: number | null) => void;
};

export const useConsoleStore = create<ConsoleState>((set) => ({
  query: "",
  spacecraft: "all",
  anomalyClass: "all",
  verdict: "all",
  showBaseline: true,
  selectedId: null,
  drawerOpen: false,
  threshold: null,
  setQuery: (query) => set({ query }),
  setSpacecraft: (spacecraft) => set({ spacecraft }),
  setAnomalyClass: (anomalyClass) => set({ anomalyClass }),
  setVerdict: (verdict) => set({ verdict }),
  setShowBaseline: (showBaseline) => set({ showBaseline }),
  setSelectedId: (selectedId) => set({ selectedId, threshold: null, drawerOpen: false }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setThreshold: (threshold) => set({ threshold }),
}));
