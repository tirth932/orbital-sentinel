import { z } from "zod";

export const metricsSchema = z.object({
  precision: z.number(),
  recall: z.number(),
  f1: z.number(),
  tp: z.number(),
  fp: z.number(),
  fn: z.number(),
});

export const modelGroupSchema = z.object({
  overall: metricsSchema,
  spacecraft: z.object({
    SMAP: metricsSchema,
    MSL: metricsSchema,
  }),
  class: z.object({
    point: metricsSchema,
    contextual: metricsSchema,
  }),
});

export const resultsSchema = z.object({
  is_sample: z.boolean(),
  partial: z.boolean(),
  generated_at: z.string(),
  git_commit: z.string().nullable(),
  seed: z.number(),
  config: z.object({
    window: z.number(),
    lstm_units: z.number(),
    layers: z.number(),
    dropout: z.number(),
    ewma_span: z.number(),
    prune_p: z.number(),
    baseline_sigma: z.number(),
    seed: z.number(),
  }),
  counts: z.object({
    channels: z.number(),
    anomalies: z.number(),
    smap_channels: z.number(),
    msl_channels: z.number(),
    point: z.number(),
    contextual: z.number(),
  }),
  comparison_note: z.string(),
  lstm: modelGroupSchema,
  baseline: modelGroupSchema,
});

export const channelIndexSchema = z.object({
  id: z.string(),
  spacecraft: z.enum(["SMAP", "MSL"]),
  classes: z.array(z.enum(["point", "contextual"])),
  n_anomalies: z.number(),
  n_found: z.number(),
  n_missed: z.number(),
  n_false_positives: z.number(),
  has_error_series: z.boolean(),
});

export const channelsFileSchema = z.object({
  is_sample: z.boolean(),
  channels: z.array(channelIndexSchema),
});

const spanSchema = z.tuple([z.number(), z.number()]);

export const channelDetailSchema = z
  .object({
    id: z.string(),
    spacecraft: z.enum(["SMAP", "MSL"]),
    is_sample: z.boolean(),
    classes: z.array(z.enum(["point", "contextual"])),
    anomaly_classes: z.array(z.enum(["point", "contextual"])),
    threshold: z.number(),
    time_offset: z.number(),
    prune_p: z.number(),
    n_timesteps: z.number(),
    displayed_points: z.number(),
    has_full_errors: z.boolean(),
    time: z.array(z.number()),
    value: z.array(z.number().nullable()),
    predicted: z.array(z.number().nullable()),
    smoothed_error: z.array(z.number().nullable()),
    true_anomalies: z.array(spanSchema),
    flagged_sequences: z.array(spanSchema),
    baseline_flagged: z.array(spanSchema),
  })
  .refine((channel) => channel.anomaly_classes.length === channel.true_anomalies.length, {
    message: "anomaly_classes must align with true_anomalies",
  });

export const errorSeriesSchema = z.object({
  id: z.string(),
  threshold: z.number(),
  time_offset: z.number(),
  prune_p: z.number(),
  full_resolution: z.boolean(),
  smoothed_error: z.array(z.number()),
});

export const anomalyRecordSchema = z.object({
  id: z.string(),
  channel: z.string(),
  spacecraft: z.enum(["SMAP", "MSL"]),
  class: z.enum(["point", "contextual"]),
  start: z.number(),
  end: z.number(),
  found: z.boolean(),
});

export const anomaliesFileSchema = z.object({
  is_sample: z.boolean(),
  anomalies: z.array(anomalyRecordSchema),
});

export type Metrics = z.infer<typeof metricsSchema>;
export type ModelGroup = z.infer<typeof modelGroupSchema>;
export type Results = z.infer<typeof resultsSchema>;
export type ChannelIndex = z.infer<typeof channelIndexSchema>;
export type ChannelDetail = z.infer<typeof channelDetailSchema>;
export type ErrorSeries = z.infer<typeof errorSeriesSchema>;
export type AnomalyRecord = z.infer<typeof anomalyRecordSchema>;
export type Span = [number, number];
