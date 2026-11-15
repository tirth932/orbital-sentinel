import type { Metadata } from "next";

import { ConsoleApp } from "@/components/console/ConsoleApp";

export const metadata: Metadata = {
  title: "Mission Console",
  description: "Inspect SMAP and MSL channels, LSTM flags, the z-score baseline, and a live threshold.",
};

export default function ConsolePage() {
  return (
    <main>
      <ConsoleApp />
    </main>
  );
}
