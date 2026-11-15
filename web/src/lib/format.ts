export function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function signedPoints(delta: number): string {
  const points = delta * 100;
  const sign = points > 0 ? "+" : "";
  return `${sign}${points.toFixed(1)} pp`;
}

export function formatTime(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
