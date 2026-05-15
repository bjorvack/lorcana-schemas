import { z } from "zod";
import { Ink } from "./primitives.js";

const InkPair = z
  .array(Ink)
  .min(1)
  .max(2)
  .refine((arr) => arr.length === new Set(arr).size, {
    message: "Deck inks must be unique",
  });

export const Deck = z
  .object({
    inks: InkPair,
    cards: z
      .array(
        z
          .object({
            cardId: z.string().min(1),
            count: z.number().int().min(1),
          })
          .strict(),
      )
      .min(1)
      .refine((cards) => new Set(cards.map((c) => c.cardId)).size === cards.length, {
        message: "Each cardId must appear at most once in cards[]",
      }),
    name: z.string().nullable(),
    source: z.string().nullable(),
    /**
     * Stable hash identifying this deck within its source. Computed by
     * the scraper as `sha256(sourceName|externalUrl ?? source-specific id)`.
     * Lets downstream consumers (training, web) deduplicate without
     * re-deriving keys. Optional for forward-compat with older 0.6.x
     * datasets that didn't emit one.
     */
    externalKey: z.string().min(1).optional(),
    /**
     * Direct URL to the deck on the source site, if the adapter knows
     * one. Mirrors `Tournament.sourceUrl` at the deck level.
     */
    externalUrl: z.string().url().optional(),
  })
  .strict();

export type DeckT = z.infer<typeof Deck>;
