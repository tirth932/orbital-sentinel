"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ChannelList } from "@/components/console/ChannelList";
import { ErrorChart } from "@/components/console/ErrorChart";
import { TelemetryChart, type ChartPoint } from "@/components/console/TelemetryChart";
import { ThresholdSlider } from "@/components/console/ThresholdSlider";
import { HudPanel } from "@/components/hud/HudPanel";
import { SampleDataBadge } from "@/components/hud/SampleDataBadge";
import { VerdictBadge } from "@/components/hud/VerdictBadge";
import { fetchDataset } from "@/lib/client-data";
import { overlaps, scoreEvents, sequencesAtThreshold, shiftSequences, verdictFromCounts } from "@/lib/detector";
import { percent } from "@/lib/format";
import { channelDetailSchema, channelsFileSchema, errorSeriesSchema } from "@/lib/schemas";
import { useConsoleStore } from "@/store/console-store";
import type { ChannelDetail, ChannelIndex, ErrorSeries, Metrics, Span } from "@/types/data";

export function ConsoleApp() {
  const [channels, setChannels] = useState<ChannelIndex[]>([]);
  const [isSample, setIsSample] = useState(false);
  const [listState, setListState] = useState<"loading" | "ready" | "error">("loading");
  const [detail, setDetail] = useState<ChannelDetail | null>(null);
  const [errors, setErrors] = useState<ErrorSeries | null>(null);
  const [detailState, setDetailState] = useState<"loading" | "ready" | "error">("loading");
  const selectedId = useConsoleStore((state) => state.selectedId);
  const setSelectedId = useConsoleStore((state) => state.setSelectedId);
  const showBaseline = useConsoleStore((state) => state.showBaseline);
  const setShowBaseline = useConsoleStore((state) => state.setShowBaseline);
  const threshold = useConsoleStore((state) => state.threshold);
  const setThreshold = useConsoleStore((state) => state.setThreshold);
  const drawerOpen = useConsoleStore((state) => state.drawerOpen);
  const setDrawerOpen = useConsoleStore((state) => state.setDrawerOpen);

  useEffect(() => {
    let cancelled = false;
    fetchDataset("channels.json", channelsFileSchema)
      .then((file) => {
        if (cancelled) {
          return;
        }
        setChannels(file.channels);
        setIsSample(file.is_sample);
        setListState("ready");
        if (!useConsoleStore.getState().selectedId && file.channels[0]) {
          setSelectedId(file.channels[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setListState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setSelectedId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let cancelled = false;
    setDetailState("loading");
    setErrors(null);
    const index = channels.find((channel) => channel.id === selectedId);
    fetchDataset(`channel/${selectedId}.json`, channelDetailSchema)
      .then(async (channel) => {
        if (cancelled) {
          return;
        }
        setDetail(channel);
        if (index?.has_error_series || channel.has_full_errors) {
          try {
            const series = await fetchDataset(`channel/${selectedId}.errors.json`, errorSeriesSchema);
            if (!cancelled) {
              setErrors(series);
            }
          } catch {
            if (!cancelled) {
              setErrors(null);
            }
          }
        }
        if (!cancelled) {
          setDetailState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetailState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [channels, selectedId]);

  const activeThreshold = threshold ?? detail?.threshold ?? 0;
  const scored = useMemo(() => scoreChannel(detail, errors, activeThreshold), [activeThreshold, detail, errors]);

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1600px] overflow-x-hidden px-4 py-6 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-cyan uppercase">Mission console</p>
          <h1 className="text-3xl text-white">Channel explorer</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SampleDataBadge isSample={isSample} />
          <Link href="/" className="font-mono text-xs tracking-wider text-cyan uppercase">
            Back to orbit
          </Link>
        </div>
      </header>
      {listState === "loading" ? <Status text="Loading channel index..." /> : null}
      {listState === "error" ? <Status text="The channel index could not be loaded." /> : null}
      {listState === "ready" ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          <HudPanel className="hidden min-h-[70vh] lg:block" title="Channels">
            <ChannelList channels={channels} idPrefix="sidebar" />
          </HudPanel>
          <HudPanel className="min-w-0" title={detail ? `${detail.id} · ${detail.spacecraft}` : "Telemetry"}>
            <div className="mb-3 flex flex-wrap items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="border border-cyan/40 px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-cyan uppercase"
              >
                Channels
              </button>
            </div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                aria-pressed={showBaseline}
                onClick={() => setShowBaseline(!showBaseline)}
                className={`border px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase ${
                  showBaseline ? "border-amber text-amber" : "border-white/20 text-muted"
                }`}
              >
                Baseline z-score
              </button>
              {detail ? (
                <span className="font-mono text-[11px] text-muted">
                  {detail.displayed_points.toLocaleString("en-US")} of {detail.n_timesteps.toLocaleString("en-US")} steps
                </span>
              ) : null}
            </div>
            {detailState === "loading" ? <Status text="Loading telemetry..." /> : null}
            {detailState === "error" ? <Status text="This channel file could not be loaded." /> : null}
            {detail && scored && detailState === "ready" ? (
              <>
                <TelemetryChart
                  key={detail.id}
                  points={toPoints(detail)}
                  anomalies={detail.true_anomalies}
                  flagged={scored.sequences}
                  baseline={detail.baseline_flagged}
                  showBaseline={showBaseline}
                  summary={chartSummary(detail, scored.metrics)}
                />
                <div className="mt-4">
                  <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Smoothed error</p>
                  <ErrorChart
                    points={errorPoints(detail, errors)}
                    threshold={activeThreshold}
                    modelThreshold={detail.threshold}
                    locked={!errors}
                    summary={`Smoothed error for ${detail.id}. Threshold ${activeThreshold.toFixed(4)}.`}
                    onThreshold={setThreshold}
                  />
                  <ThresholdSlider
                    min={0}
                    max={errorMax(detail, errors, detail.threshold)}
                    value={activeThreshold}
                    locked={!errors}
                    onChange={setThreshold}
                    onReset={() => setThreshold(null)}
                  />
                </div>
              </>
            ) : null}
          </HudPanel>
          <HudPanel title="Verdict">
            {detail && scored ? (
              <ChannelFacts detail={detail} metrics={scored.metrics} sequences={scored.sequences} />
            ) : (
              <Status text="Select a channel." />
            )}
          </HudPanel>
        </div>
      ) : null}
      {drawerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Channels"
          className="fixed inset-0 z-50 bg-[#05060a]/80 p-4 text-ink lg:hidden"
        >
          <div className="hud-frame h-full">
            <div className="hud-panel flex h-full flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.18em] text-cyan uppercase">Channels</p>
                <button type="button" onClick={() => setDrawerOpen(false)} className="font-mono text-xs text-cyan">
                  Close
                </button>
              </div>
              <ChannelList channels={channels} idPrefix="drawer" autoFocus />
            </div>
          </div>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {detail && scored
          ? `${detail.id} threshold ${activeThreshold.toFixed(3)}. Precision ${percent(scored.metrics.precision)}. Recall ${percent(scored.metrics.recall)}.`
          : ""}
      </p>
    </div>
  );
}

function ChannelFacts({
  detail,
  metrics,
  sequences,
}: {
  detail: ChannelDetail;
  metrics: Metrics;
  sequences: Span[];
}) {
  const baseline = scoreEvents(detail.true_anomalies, detail.baseline_flagged);
  const verdict = verdictFromCounts(metrics.tp, metrics.fn, metrics.fp);
  return (
    <div>
      <VerdictBadge verdict={verdict} />
      <dl className="mt-4 space-y-2 font-mono text-xs">
        <Fact label="Spacecraft" value={detail.spacecraft} />
        <Fact label="Classes" value={detail.classes.join(", ") || "none"} />
        <Fact label="LSTM precision" value={percent(metrics.precision)} />
        <Fact label="LSTM recall" value={percent(metrics.recall)} />
        <Fact label="Baseline recall" value={percent(baseline.recall)} />
        <Fact label="Model threshold" value={detail.threshold.toFixed(4)} />
      </dl>
      <div className="mt-4 overflow-auto">
        <table className="w-full text-left font-mono text-[11px]">
          <caption className="mb-2 text-left tracking-[0.14em] text-muted uppercase">Events</caption>
          <thead>
            <tr className="text-muted">
              <th className="py-1 pr-2 font-normal">Kind</th>
              <th className="py-1 pr-2 font-normal">Start</th>
              <th className="py-1 pr-2 font-normal">End</th>
              <th className="py-1 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {detail.true_anomalies.map((span, index) => {
              const hit = sequences.some((flag) => overlaps(span, flag));
              return (
                <tr key={`${span[0]}-${span[1]}-${index}`} className="border-t border-white/10">
                  <td className="py-1 pr-2">{detail.anomaly_classes[index]}</td>
                  <td className="py-1 pr-2">{span[0]}</td>
                  <td className="py-1 pr-2">{span[1]}</td>
                  <td className="py-1">{hit ? "Found" : "Missed"}</td>
                </tr>
              );
            })}
            {sequences
              .filter((flag) => !detail.true_anomalies.some((span) => overlaps(span, flag)))
              .map((flag) => (
                <tr key={`fp-${flag[0]}-${flag[1]}`} className="border-t border-white/10 text-amber">
                  <td className="py-1 pr-2">flag</td>
                  <td className="py-1 pr-2">{flag[0]}</td>
                  <td className="py-1 pr-2">{flag[1]}</td>
                  <td className="py-1">False alarm</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Status({ text }: { text: string }) {
  return <p className="py-10 text-center font-mono text-sm text-muted">{text}</p>;
}

function toPoints(detail: ChannelDetail): ChartPoint[] {
  const count = Math.min(detail.time.length, detail.value.length, detail.predicted.length);
  const points: ChartPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const time = detail.time[index];
    if (time === undefined) {
      continue;
    }
    points.push({
      time,
      value: detail.value[index] ?? null,
      predicted: detail.predicted[index] ?? null,
    });
  }
  return points;
}

function errorPoints(detail: ChannelDetail, errors: ErrorSeries | null) {
  if (errors) {
    return errors.smoothed_error.map((error, index) => ({
      time: index + errors.time_offset,
      error,
    }));
  }
  return detail.time.flatMap((time, index) => {
    const error = detail.smoothed_error[index];
    return error === null || error === undefined ? [] : [{ time, error }];
  });
}

function errorMax(detail: ChannelDetail, errors: ErrorSeries | null, threshold: number) {
  const values = errors ? errors.smoothed_error : detail.smoothed_error.flatMap((value) => (value === null ? [] : [value]));
  return Math.max(threshold, ...values, 0.01) * 1.05;
}

function scoreChannel(detail: ChannelDetail | null, errors: ErrorSeries | null, threshold: number) {
  if (!detail) {
    return null;
  }
  if (!errors) {
    return {
      sequences: detail.flagged_sequences,
      metrics: scoreEvents(detail.true_anomalies, detail.flagged_sequences),
    };
  }
  const raw = sequencesAtThreshold(errors.smoothed_error, threshold, errors.prune_p);
  const sequences = shiftSequences(raw, errors.time_offset);
  return { sequences, metrics: scoreEvents(detail.true_anomalies, sequences) };
}

function chartSummary(detail: ChannelDetail, metrics: Metrics) {
  return `${detail.id} on ${detail.spacecraft}. ${detail.true_anomalies.length} labeled anomalies. LSTM found ${metrics.tp} and missed ${metrics.fn}, with ${metrics.fp} false alarms.`;
}
