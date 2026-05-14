import { z } from "zod";
import { CardType, Ink, Legality, Rarity } from "./primitives.js";

/**
 * A single printed Lorcana card. Raw facts only; derivations
 * (`sanitizedText`, `hasShift`, `maxCopies`, …) live in helpers,
 * not in the schema, so a regex fix never forces a schema bump.
 *
 * Some fields are nullable on purpose: pre-Set-N promos and the
 * earliest printings sometimes lack a release date or rarity in
 * the upstream API. Consumers should treat ``null`` as "unknown"
 * rather than reject the row.
 */
export const Card = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1).nullable(),
    setCode: z.string().min(1),
    // The next three fields default so older fixtures + the scraper's
    // pre-0.6 cards.json still parse cleanly. Real Lorcast data
    // always populates them.
    setName: z.string().min(1).nullable().default(null),
    cardNumber: z.number().int().nonnegative(),
    /**
     * Collector number as printed on the card. Usually the same as
     * ``cardNumber`` rendered as ``003``, but promos sometimes carry
     * letter suffixes (``001a``) that integers can't represent.
     */
    collectorNumber: z.string().min(1).nullable().default(null),
    cost: z.number().int().min(0).max(20),
    inkwell: z.boolean(),
    inks: z.array(Ink).min(1).max(2),
    types: z.array(CardType).min(1),
    classifications: z.array(z.string()),
    keywords: z.array(z.string()),
    text: z.string(),
    flavor: z.string().nullable(),
    imageUrl: z.string().url(),
    rarity: Rarity.nullable().default(null),
    illustrators: z.array(z.string()).default([]),
    releasedAt: z.string().nullable().default(null),
    /** TCGPlayer product id, used to deep-link a "buy" button. */
    tcgplayerId: z.number().int().positive().nullable().default(null),
    legality: Legality,
    lore: z.number().int().min(0).nullable(),
    strength: z.number().int().min(0).nullable(),
    willpower: z.number().int().min(0).nullable(),
    moveCost: z.number().int().min(0).nullable(),
  })
  .strict();

export type CardT = z.infer<typeof Card>;
