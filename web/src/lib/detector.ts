/**
 * Client port of ml/src/threshold.py and ml/src/evaluate.py.
 * Ranges are inclusive. A point is flagged when the error is strictly above the threshold.
 */

import type { Metrics, Span } from "@/types/data";

export function contiguousSequences(flags: readonly boolean[]): Span[] {
  const sequences: Span[] = [];
  let start: number | null = null;
  flags.forEach((flag, index) => {
    if (flag && start === null) {
      start = index;
    } else if (!flag && start !== null) {
      sequences.push([start, index - 1]);
      start = null;
    }
  });
  if (start !== null) {
    sequences.push([start, flags.length - 1]);
  }
  return sequences;
}

export function pruneSequences(
  errors: readonly number[],
  sequences: readonly Span[],
  pruneP: number,
): Span[] {
  if (sequences.length <= 1) {
    return sequences.map((span) => [span[0], span[1]]);
  }
  const scored = sequences.map((span) => {
    let max = Number.NEGATIVE_INFINITY;
    for (let index = span[0]; index <= span[1]; index += 1) {
      max = Math.max(max, errors[index] ?? Number.NEGATIVE_INFINITY);
    }
    return { max, span };
  });
  scored.sort((left, right) => right.max - left.max);
  const largest = scored[0];
  if (!largest) {
    return [];
  }
  const kept: Span[] = [[largest.span[0], largest.span[1]]];
  for (let index = 0; index < scored.length - 1; index += 1) {
    const current = scored[index];
    const next = scored[index + 1];
    if (!current || !next || current.max <= 0) {
      break;
    }
    const drop = (current.max - next.max) / current.max;
    if (drop < pruneP) {
      break;
    }
    kept.push([next.span[0], next.span[1]]);
  }
  kept.sort((left, right) => left[0] - right[0]);
  return kept;
}

export function sequencesAtThreshold(
  errors: readonly number[],
  threshold: number,
  pruneP: number,
): Span[] {
  return pruneSequences(
    errors,
    contiguousSequences(errors.map((value) => value > threshold)),
    pruneP,
  );
}

export function shiftSequences(sequences: readonly Span[], offset: number): Span[] {
  return sequences.map(([start, end]) => [start + offset, end + offset]);
}

export function overlaps(left: Span, right: Span): boolean {
  return left[0] <= right[1] && right[0] <= left[1];
}

export function scoreEvents(truth: readonly Span[], flagged: readonly Span[]): Metrics {
  const matched = new Set<number>();
  let tp = 0;
  truth.forEach((anomaly) => {
    let hit = false;
    flagged.forEach((flag, index) => {
      if (overlaps(anomaly, flag)) {
        hit = true;
        matched.add(index);
      }
    });
    if (hit) {
      tp += 1;
    }
  });
  const fp = flagged.length - matched.size;
  const fn = truth.length - tp;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1, tp, fp, fn };
}

export type Verdict = "found" | "missed" | "false_alarm" | "partial";

export function verdictFromCounts(found: number, missed: number, falsePositives: number): Verdict {
  if (found > 0 && missed > 0) {
    return "partial";
  }
  if (found > 0 && missed === 0) {
    return "found";
  }
  if (missed > 0) {
    return "missed";
  }
  if (falsePositives > 0) {
    return "false_alarm";
  }
  return "found";
}
