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
      .refine(
        (cards) => new Set(cards.map((c) => c.cardId)).size === cards.length,
        { message: "Each cardId must appear at most once in cards[]" },
      ),
    name: z.string().nullable(),
    source: z.string().nullable(),
  })
  .strict();

export type DeckT = z.infer<typeof Deck>;
