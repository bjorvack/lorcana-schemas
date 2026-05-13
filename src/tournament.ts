import { z } from "zod";
import { Deck } from "./deck.js";

const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected ISO 8601 date (YYYY-MM-DD)");

export const Tournament = z
  .object({
    sourceUrl: z.string().url(),
    sourceName: z.string().min(1),
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
