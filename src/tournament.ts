import { z } from "zod";
import { Deck } from "./deck.js";

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected ISO 8601 date (YYYY-MM-DD)");

export const Tournament = z
  .object({
    sourceUrl: z.string().url(),
    sourceName: z.string().min(1),
    /**
     * Stable hash identifying this tournament within its source.
     * Conventionally `sha256(sourceName|sourceUrl)`. Optional for
     * forward-compat with older 0.6.x datasets; the scraper started
     * emitting it in 0.7.0 so downstream consumers can skip already-
     * processed tournaments without recomputing the key themselves.
     */
    externalKey: z.string().min(1).optional(),
    name: z.string().min(1),
    date: IsoDate,
    decks: z
      .array(
        z
          .object({
            placement: z.number().int().min(1).nullable(),
            player: z.string().nullable(),
            deck: Deck,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type TournamentT = z.infer<typeof Tournament>;
