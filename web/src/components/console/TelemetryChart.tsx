"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";

import { clamp, prepareCanvas } from "@/lib/canvas";
import { useElementWidth } from "@/lib/hooks";
import type { Span } from "@/types/data";

export type ChartPoint = {
  time: number;
  value: number | null;
  predicted: number | null;
};

type Props = {
  points: ChartPoint[];
  anomalies: Span[];
  flagged: Span[];
  baseline: Span[];
  showBaseline: boolean;
  summary: string;
};

function finiteValues(points: ChartPoint[], key: "value" | "predicted"): number[] {
  return points.flatMap((point) => {
    const value = point[key];
    return value === null || Number.isNaN(value) ? [] : [value];
  });
}

export function TelemetryChart({ points, anomalies, flagged, baseline, showBaseline, summary }: Props) {
  const wrap = useElementWidth<HTMLDivElement>();
  const mainRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; point: ChartPoint } | null>(null);
  const [plotHeight, setPlotHeight] = useState(320);
  const domain = useMemo(() => {
    const first = points[0]?.time ?? 0;
    const last = points[points.length - 1]?.time ?? first + 1;
    return [first, Math.max(last, first + 1)] as [number, number];
  }, [points]);
  const [view, setView] = useState<[number, number]>(domain);

  useEffect(() => {
    setView(domain);
  }, [domain]);

  useEffect(() => {
    const fit = () => setPlotHeight(Math.round(Math.max(220, Math.min(420, window.innerHeight * 0.48))));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const yDomain = useMemo(() => {
    const values = [...finiteValues(points, "value"), ...finiteValues(points, "predicted")];
    if (values.length === 0) {
      return [0, 1] as [number, number];
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(0.05, (max - min) * 0.08);
    return [min - pad, max + pad] as [number, number];
  }, [points]);

  useEffect(() => {
    const canvas = mainRef.current;
    const map = mapRef.current;
    const width = wrap.width;
    if (!canvas || !map || width < 10) {
      return;
    }
    const height = plotHeight;
    const mapHeight = 64;
    const context = prepareCanvas(canvas, width, height);
    const mapContext = prepareCanvas(map, width, mapHeight);
    if (!context || !mapContext) {
      return;
    }
    const pad = { left: 48, right: 16, top: 16, bottom: 28 };
    const x = scaleLinear()
      .domain(view)
      .range([pad.left, width - pad.right]);
    const y = scaleLinear()
      .domain(yDomain)
      .range([height - pad.bottom, pad.top]);
    const fullX = scaleLinear()
      .domain(domain)
      .range([8, width - 8]);

    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(5, 8, 14, 0.35)";
    context.fillRect(0, 0, width, height);
    drawBands(context, x, anomalies, "rgba(255, 46, 147, 0.22)", height, pad);
    if (showBaseline) {
      drawBands(context, x, baseline, "rgba(255, 176, 32, 0.18)", height, pad);
    }
    drawBands(context, x, flagged, "rgba(0, 229, 255, 0.16)", height, pad);

    const visible = points.filter((point) => point.time >= view[0] && point.time <= view[1]);
    strokeSeries(context, x, y, visible, "value", "#d7e7ea", []);
    strokeSeries(context, x, y, visible, "predicted", "#00e5ff", [5, 4]);
    drawAxes(context, x, y, width, height, pad);

    mapContext.clearRect(0, 0, width, mapHeight);
    mapContext.fillStyle = "rgba(8, 14, 22, 0.9)";
    mapContext.fillRect(0, 0, width, mapHeight);
    strokeSeries(
      mapContext,
      fullX,
      scaleLinear()
        .domain(yDomain)
        .range([mapHeight - 8, 8]),
      points,
      "value",
      "rgba(215, 231, 234, 0.8)",
      [],
    );
    const left = fullX(view[0]);
    const right = fullX(view[1]);
    mapContext.fillStyle = "rgba(0, 229, 255, 0.18)";
    mapContext.fillRect(left, 4, Math.max(2, right - left), mapHeight - 8);
    mapContext.strokeStyle = "#00e5ff";
    mapContext.strokeRect(left, 4, Math.max(2, right - left), mapHeight - 8);
  }, [anomalies, baseline, domain, flagged, plotHeight, points, showBaseline, view, wrap.width, yDomain]);

  useEffect(() => {
    const canvas = mainRef.current;
    if (!canvas) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      setView((current) => zoomView(current, domain, ratio, event.deltaY > 0 ? 1.12 : 0.88));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [domain]);

  function pointerTime(event: React.PointerEvent<HTMLCanvasElement>, target: "main" | "map") {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const source = target === "main" ? view : domain;
    return source[0] + ratio * (source[1] - source[0]);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId) && event.buttons === 1) {
      const rect = event.currentTarget.getBoundingClientRect();
      const span = view[1] - view[0];
      const shift = (-event.movementX / rect.width) * span;
      setView((current) => panView(current, domain, shift));
    }
    const time = pointerTime(event, "main");
    const point = nearest(points, time);
    if (!point) {
      setHover(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setHover({ x: event.clientX - rect.left, y: event.clientY - rect.top, point });
  }

  return (
    <div>
      <p id="telemetry-summary" className="sr-only">
        {summary} Showing steps {Math.round(view[0])} to {Math.round(view[1])}.
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        <ChartButton onClick={() => setView((current) => zoomView(current, domain, 0.5, 0.8))}>Zoom in</ChartButton>
        <ChartButton onClick={() => setView((current) => zoomView(current, domain, 0.5, 1.25))}>Zoom out</ChartButton>
        <ChartButton onClick={() => setView(domain)}>Reset view</ChartButton>
      </div>
      <div ref={wrap.ref} className="relative w-full min-w-0" style={{ height: plotHeight }}>
        <canvas
          ref={mainRef}
          role="img"
          aria-label="Telemetry chart"
          aria-describedby="telemetry-summary"
          tabIndex={0}
          className="h-full w-full touch-none"
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(event) => {
            if (event.key === "+" || event.key === "=") {
              setView((current) => zoomView(current, domain, 0.5, 0.8));
            }
            if (event.key === "-" || event.key === "_") {
              setView((current) => zoomView(current, domain, 0.5, 1.25));
            }
            if (event.key === "ArrowLeft") {
              setView((current) => panView(current, domain, -(current[1] - current[0]) * 0.1));
            }
            if (event.key === "ArrowRight") {
              setView((current) => panView(current, domain, (current[1] - current[0]) * 0.1));
            }
            if (event.key === "Home") {
              setView(domain);
            }
          }}
        />
        {hover ? <ChartTip x={hover.x} y={hover.y} point={hover.point} /> : null}
      </div>
      <canvas
        ref={mapRef}
        className="mt-2 h-16 w-full cursor-ew-resize touch-none"
        aria-hidden="true"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const time = pointerTime(event, "map");
          setView((current) => centerView(current, domain, time));
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 1) {
            return;
          }
          const time = pointerTime(event, "map");
          setView((current) => centerView(current, domain, time));
        }}
      />
      <ul className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] tracking-wider text-muted uppercase">
        <li>Telemetry</li>
        <li className="text-cyan">Prediction</li>
        <li className="text-magenta">Labeled anomaly</li>
        <li className="text-cyan">LSTM flag</li>
        {showBaseline ? <li className="text-amber">Baseline flag</li> : null}
      </ul>
    </div>
  );
}

function ChartButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-white/15 px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-ink uppercase"
    >
      {children}
    </button>
  );
}

function ChartTip({ x, y, point }: { x: number; y: number; point: ChartPoint }) {
  return (
    <div
      className="pointer-events-none absolute z-10 border border-cyan/40 bg-[#071018]/95 px-2 py-1 font-mono text-[11px] text-ink"
      style={{ left: Math.min(x + 12, 280), top: Math.max(8, y - 48) }}
    >
      <div>t {Math.round(point.time)}</div>
      <div>value {point.value?.toFixed(3) ?? "—"}</div>
      <div>pred {point.predicted?.toFixed(3) ?? "—"}</div>
    </div>
  );
}

function drawBands(
  context: CanvasRenderingContext2D,
  x: (value: number) => number,
  bands: Span[],
  color: string,
  height: number,
  pad: { top: number; bottom: number },
) {
  context.fillStyle = color;
  bands.forEach(([start, end]) => {
    const left = x(start);
    const right = x(end);
    context.fillRect(left, pad.top, Math.max(1, right - left), height - pad.top - pad.bottom);
  });
}

function strokeSeries(
  context: CanvasRenderingContext2D,
  x: (value: number) => number,
  y: (value: number) => number,
  points: ChartPoint[],
  key: "value" | "predicted",
  color: string,
  dash: number[],
) {
  const path = line<ChartPoint>()
    .defined((point) => point[key] !== null)
    .x((point) => x(point.time))
    .y((point) => y(point[key] ?? 0))
    .context(context);
  context.beginPath();
  context.setLineDash(dash);
  context.strokeStyle = color;
  context.lineWidth = 1.4;
  path(points);
  context.stroke();
  context.setLineDash([]);
}

function drawAxes(
  context: CanvasRenderingContext2D,
  x: ((value: number) => number) & { ticks: (count: number) => number[] },
  y: ((value: number) => number) & { ticks: (count: number) => number[] },
  width: number,
  height: number,
  pad: { left: number; right: number; top: number; bottom: number },
) {
  context.font = "11px ui-monospace, monospace";
  context.fillStyle = "rgba(215,231,234,0.55)";
  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 1;
  y.ticks(4).forEach((tick) => {
    const py = y(tick);
    context.beginPath();
    context.moveTo(pad.left, py);
    context.lineTo(width - pad.right, py);
    context.stroke();
    context.fillText(tick.toFixed(2), 4, py + 3);
  });
  x.ticks(5).forEach((tick) => {
    context.fillText(String(Math.round(tick)), x(tick), height - 8);
  });
}

function nearest(points: ChartPoint[], time: number): ChartPoint | null {
  if (points.length === 0) {
    return null;
  }
  let best = points[0];
  if (!best) {
    return null;
  }
  let distance = Math.abs(best.time - time);
  for (const point of points) {
    const next = Math.abs(point.time - time);
    if (next < distance) {
      best = point;
      distance = next;
    }
  }
  return best;
}

function zoomView(
  current: [number, number],
  domain: [number, number],
  anchorRatio: number,
  factor: number,
): [number, number] {
  const span = current[1] - current[0];
  const anchor = current[0] + span * anchorRatio;
  const nextSpan = clamp(span * factor, (domain[1] - domain[0]) * 0.02, domain[1] - domain[0]);
  return panView([anchor - nextSpan * anchorRatio, anchor + nextSpan * (1 - anchorRatio)], domain, 0);
}

function panView(current: [number, number], domain: [number, number], shift: number): [number, number] {
  const span = current[1] - current[0];
  let start = current[0] + shift;
  let end = current[1] + shift;
  if (start < domain[0]) {
    start = domain[0];
    end = start + span;
  }
  if (end > domain[1]) {
    end = domain[1];
    start = end - span;
  }
  return [start, end];
}

function centerView(current: [number, number], domain: [number, number], center: number): [number, number] {
  const span = current[1] - current[0];
  return panView([center - span / 2, center + span / 2], domain, 0);
}
