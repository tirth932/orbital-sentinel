"use client";

import { useEffect, useRef } from "react";

import { prepareCanvas } from "@/lib/canvas";
import { usePrefersReducedMotion } from "@/lib/hooks";

type Kind = "window" | "predict" | "smooth" | "threshold";

export function StepDiagram({ kind }: { kind: Kind }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let frame = 0;
    let running = true;
    const started = performance.now();
    const draw = (now: number) => {
      const width = canvas.clientWidth || 320;
      const height = 160;
      const context = prepareCanvas(canvas, width, height);
      if (!context) {
        return;
      }
      const progress = reduced ? 1 : ((now - started) % 3200) / 3200;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = "rgba(0,229,255,0.85)";
      context.fillStyle = "rgba(0,229,255,0.15)";
      context.lineWidth = 1.5;
      if (kind === "window") {
        drawWindow(context, width, height, progress);
      } else if (kind === "predict") {
        drawPredict(context, width, height, progress);
      } else if (kind === "smooth") {
        drawSmooth(context, width, height, progress);
      } else {
        drawThreshold(context, width, height, progress);
      }
      if (running && !reduced) {
        frame = requestAnimationFrame(draw);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, [kind, reduced]);

  return <canvas ref={canvasRef} className="h-40 w-full" aria-hidden="true" />;
}

function wave(index: number, count: number): number {
  return Math.sin((index / count) * Math.PI * 4) * 28;
}

function drawWindow(context: CanvasRenderingContext2D, width: number, height: number, progress: number) {
  const count = 80;
  context.beginPath();
  for (let index = 0; index < count; index += 1) {
    const x = 16 + (index / count) * (width - 32);
    const y = height / 2 + wave(index, count);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
  const start = 16 + progress * (width - 120);
  context.strokeStyle = "#ff2e93";
  context.strokeRect(start, 28, 90, height - 56);
}

function drawPredict(context: CanvasRenderingContext2D, width: number, height: number, progress: number) {
  drawWindow(context, width * 0.7, height, 0.2);
  context.strokeStyle = "#00e5ff";
  context.strokeRect(width * 0.62, height / 2 - 22, 54, 44);
  context.font = "12px ui-monospace, monospace";
  context.fillStyle = "#00e5ff";
  context.fillText("LSTM", width * 0.62 + 8, height / 2 + 4);
  context.beginPath();
  context.arc(width * 0.86, height / 2 - 20 + (1 - progress) * 20, 4, 0, Math.PI * 2);
  context.fill();
}

function drawSmooth(context: CanvasRenderingContext2D, width: number, height: number, progress: number) {
  context.beginPath();
  for (let index = 0; index < 90; index += 1) {
    const x = 16 + (index / 90) * (width - 32);
    const noisy = Math.sin(index / 6) * 18 + Math.sin(index * 1.7) * 10;
    const smooth = Math.sin(index / 6) * 18;
    const y = height / 2 + noisy * (1 - progress) + smooth * progress;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

function drawThreshold(context: CanvasRenderingContext2D, width: number, height: number, progress: number) {
  const level = height * 0.42;
  context.beginPath();
  for (let index = 0; index < 90; index += 1) {
    const x = 16 + (index / 90) * (width - 32);
    const spike = index > 50 && index < 62 ? -48 * progress : 0;
    const y = height * 0.7 + Math.sin(index / 8) * 8 + spike;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
  context.setLineDash([4, 4]);
  context.strokeStyle = "#ffb020";
  context.beginPath();
  context.moveTo(16, level);
  context.lineTo(width - 16, level);
  context.stroke();
  context.setLineDash([]);
}
