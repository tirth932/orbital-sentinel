"use client";

import { useEffect, useMemo, useRef } from "react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";

import { clamp, prepareCanvas } from "@/lib/canvas";
import { useElementWidth } from "@/lib/hooks";

type Point = { time: number; error: number };

export function ErrorChart({
  points,
  threshold,
  modelThreshold,
  locked,
  summary,
  onThreshold,
}: {
  points: Point[];
  threshold: number;
  modelThreshold: number;
  locked: boolean;
  summary: string;
  onThreshold: (value: number) => void;
}) {
  const wrap = useElementWidth<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const yDomain = useMemo(() => {
    const max = Math.max(threshold, modelThreshold, ...points.map((point) => point.error), 0.01);
    return [0, max * 1.08] as [number, number];
  }, [modelThreshold, points, threshold]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const width = wrap.width;
    if (!canvas || width < 10 || points.length === 0) {
      return;
    }
    const height = 180;
    const context = prepareCanvas(canvas, width, height);
    if (!context) {
      return;
    }
    const pad = { left: 48, right: 12, top: 12, bottom: 22 };
    const x = scaleLinear()
      .domain([points[0]?.time ?? 0, points[points.length - 1]?.time ?? 1])
      .range([pad.left, width - pad.right]);
    const y = scaleLinear()
      .domain(yDomain)
      .range([height - pad.bottom, pad.top]);
    context.clearRect(0, 0, width, height);
    const path = line<Point>()
      .x((point) => x(point.time))
      .y((point) => y(point.error))
      .context(context);
    context.beginPath();
    context.strokeStyle = "#7c4dff";
    context.lineWidth = 1.4;
    path(points);
    context.stroke();
    drawLine(context, y(modelThreshold), width, pad.left, "#8ea3ad", [4, 4]);
    drawLine(context, y(threshold), width, pad.left, "#ffb020", []);
    context.fillStyle = "rgba(215,231,234,0.6)";
    context.font = "11px ui-monospace, monospace";
    context.fillText(threshold.toFixed(3), pad.left + 6, y(threshold) - 6);
  }, [modelThreshold, points, threshold, wrap.width, yDomain]);

  function valueFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const padTop = 12;
    const padBottom = 22;
    const usable = Math.max(1, rect.height - padTop - padBottom);
    const yRatio = clamp((event.clientY - rect.top - padTop) / usable, 0, 1);
    return yDomain[1] - yRatio * (yDomain[1] - yDomain[0]);
  }

  return (
    <div ref={wrap.ref}>
      <p id="error-summary" className="sr-only">
        {summary}
      </p>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Smoothed error chart"
        aria-describedby="error-summary"
        className={`h-[180px] w-full touch-none ${locked ? "" : "cursor-ns-resize"}`}
        onPointerDown={(event) => {
          if (locked) {
            return;
          }
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          onThreshold(Math.max(0, valueFromEvent(event)));
        }}
        onPointerMove={(event) => {
          if (!dragging.current || locked) {
            return;
          }
          onThreshold(Math.max(0, valueFromEvent(event)));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      />
    </div>
  );
}

function drawLine(
  context: CanvasRenderingContext2D,
  y: number,
  width: number,
  left: number,
  color: string,
  dash: number[],
) {
  context.beginPath();
  context.setLineDash(dash);
  context.strokeStyle = color;
  context.moveTo(left, y);
  context.lineTo(width - 12, y);
  context.stroke();
  context.setLineDash([]);
}
