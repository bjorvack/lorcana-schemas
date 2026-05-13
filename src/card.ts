import { z } from "zod";
import { CardType, Ink, Legality } from "./primitives.js";

/**
 * A single printed Lorcana card. Raw facts only; derivations
 * (`sanitizedText`, `hasShift`, `maxCopies`, …) live in helpers,
 * not in the schema, so a regex fix never forces a schema bump.
 */
export const Card = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1).nullable(),
    setCode: z.string().min(1),
    cardNumber: z.number().int().nonnegative(),
    cost: z.number().int().min(0).max(20),
    inkwell: z.boolean(),
    inks: z.array(Ink).min(1).max(2),
    types: z.array(CardType).min(1),
    classifications: z.array(z.string()),
    keywords: z.array(z.string()),
    text: z.string(),
    flavor: z.string().nullable(),
    imageUrl: z.string().url(),
    legality: Legality,
    lore: z.number().int().min(0).nullable(),
    strength: z.number().int().min(0).nullable(),
    willpower: z.number().int().min(0).nullable(),
    moveCost: z.number().int().min(0).nullable(),
  })
  .strict();

export type CardT = z.infer<typeof Card>;
