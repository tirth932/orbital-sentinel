"use client";

import { useMemo } from "react";

import { verdictFromCounts } from "@/lib/detector";
import { VerdictBadge } from "@/components/hud/VerdictBadge";
import {
  useConsoleStore,
  type ClassFilter,
  type CraftFilter,
  type VerdictFilter,
} from "@/store/console-store";
import type { ChannelIndex } from "@/types/data";

export function ChannelList({
  channels,
  idPrefix,
  autoFocus = false,
}: {
  channels: ChannelIndex[];
  idPrefix: string;
  autoFocus?: boolean;
}) {
  const query = useConsoleStore((state) => state.query);
  const spacecraft = useConsoleStore((state) => state.spacecraft);
  const anomalyClass = useConsoleStore((state) => state.anomalyClass);
  const verdict = useConsoleStore((state) => state.verdict);
  const selectedId = useConsoleStore((state) => state.selectedId);
  const setQuery = useConsoleStore((state) => state.setQuery);
  const setSpacecraft = useConsoleStore((state) => state.setSpacecraft);
  const setAnomalyClass = useConsoleStore((state) => state.setAnomalyClass);
  const setVerdict = useConsoleStore((state) => state.setVerdict);
  const setSelectedId = useConsoleStore((state) => state.setSelectedId);

  const visible = useMemo(
    () =>
      channels
        .filter((channel) => matches(channel, query, spacecraft, anomalyClass, verdict))
        .sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true })),
    [anomalyClass, channels, query, spacecraft, verdict],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <label htmlFor={`${idPrefix}-search`} className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
        Channel
      </label>
      <input
        id={`${idPrefix}-search`}
        type="search"
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="P-1"
        className="mt-2 border border-white/15 bg-transparent px-3 py-2 font-mono text-sm text-ink outline-none"
      />
      <ChipRow
        label="Spacecraft"
        value={spacecraft}
        options={[
          ["all", "All"],
          ["SMAP", "SMAP"],
          ["MSL", "MSL"],
        ]}
        onChange={setSpacecraft}
      />
      <ChipRow
        label="Class"
        value={anomalyClass}
        options={[
          ["all", "All"],
          ["point", "Point"],
          ["contextual", "Contextual"],
        ]}
        onChange={setAnomalyClass}
      />
      <ChipRow
        label="Status"
        value={verdict}
        options={[
          ["all", "All"],
          ["found", "Found"],
          ["missed", "Missed"],
          ["false_alarm", "False alarm"],
        ]}
        onChange={setVerdict}
      />
      <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-auto pr-1" aria-label="Channels">
        {visible.length === 0 ? (
          <li className="px-2 py-6 font-mono text-xs text-muted">No channels match these filters.</li>
        ) : (
          visible.map((channel) => {
            const status = verdictFromCounts(channel.n_found, channel.n_missed, channel.n_false_positives);
            const selected = channel.id === selectedId;
            return (
              <li key={channel.id}>
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => setSelectedId(channel.id)}
                  className={`flex w-full items-center justify-between gap-2 px-2 py-2 text-left ${
                    selected ? "bg-cyan/15" : "hover:bg-white/5"
                  }`}
                >
                  <span>
                    <span className="font-mono text-sm text-white">{channel.id}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-muted">
                      {channel.spacecraft} · {channel.classes.join(", ") || "nominal"}
                    </span>
                  </span>
                  <VerdictBadge verdict={status} />
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function matches(
  channel: ChannelIndex,
  query: string,
  spacecraft: CraftFilter,
  anomalyClass: ClassFilter,
  verdict: VerdictFilter,
): boolean {
  if (query && !channel.id.toLowerCase().includes(query.trim().toLowerCase())) {
    return false;
  }
  if (spacecraft !== "all" && channel.spacecraft !== spacecraft) {
    return false;
  }
  if (anomalyClass !== "all" && !channel.classes.includes(anomalyClass)) {
    return false;
  }
  if (verdict === "found" && !(channel.n_found > 0 && channel.n_missed === 0)) {
    return false;
  }
  if (verdict === "missed" && channel.n_missed === 0) {
    return false;
  }
  if (verdict === "false_alarm" && channel.n_false_positives === 0) {
    return false;
  }
  return true;
}

function ChipRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={`px-2 py-1 font-mono text-[10px] tracking-wider uppercase ${
              value === id ? "bg-cyan text-[#041016]" : "border border-white/15 text-ink"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
