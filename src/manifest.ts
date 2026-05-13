import { z } from "zod";

const StylePreset = z
  .object({
    alpha: z.number(),
    gamma: z.number(),
    lambda: z.number(),
  })
  .strict();

const PerStyleMetrics = z.record(z.number());

export const ModelManifest = z
  .object({
    modelVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    schemaVersion: z.string().min(1),
    vocabHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    cardSetVersion: z.string().min(1),
    cardsReleaseTag: z.string().min(1),
    datasetReleaseTag: z.string().min(1),
    encoderReleaseTag: z.string().min(1),
    trainedAt: z.string().datetime({ offset: true }),
    architecture: z.string().min(1),
    style_presets: z
      .object({
        safe: StylePreset,
        balanced: StylePreset,
        brew: StylePreset,
        interpolatable: z.boolean(),
      })
      .strict(),
    metrics: z
      .object({
        legalityRate: z.number().min(0).max(1),
        evaluatorAuroc: z.number().min(0).max(1),
        evaluatorEce: z.number().nullable(),
        per_style: z
          .object({
            safe: PerStyleMetrics,
            balanced: PerStyleMetrics,
            brew: PerStyleMetrics,
          })
          .strict(),
      })
      .passthrough(),
  })
  .strict();

export type ModelManifestT = z.infer<typeof ModelManifest>;
