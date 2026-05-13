import { z } from "zod";
import { Tournament } from "./tournament.js";

export const Dataset = z
  .object({
    datasetVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    schemaVersion: z.string().min(1),
    cardSetVersion: z.string().min(1),
    cardsReleaseTag: z.string().min(1),
    generatedAt: z.string().datetime({ offset: true }),
    sources: z.array(z.string().min(1)).min(1),
    tournaments: z.array(Tournament),
  })
  .strict();

export type DatasetT = z.infer<typeof Dataset>;
