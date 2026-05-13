import { z } from "zod";
import { Card, type CardT } from "./card.js";
import {
  CardType,
  Ink,
  Legality,
  type CardTypeT,
  type InkT,
  type LegalityT,
} from "./primitives.js";

/**
 * Permissive shape of an `api.lorcast.com` card response, with only the
 * fields we depend on. A Lorcast change becomes a hard parse error
 * during `mapLorcastToCard`, not a silent runtime bug.
 */
export const LorcastApiCard = z
  .object({
    id: z.string(),
    name: z.string(),
    version: z.string().nullable().optional(),
    set: z
      .object({
        code: z.string(),
      })
      .passthrough(),
    collector_number: z.union([z.string(), z.number()]),
    cost: z.number().int().nonnegative(),
    inkwell: z.boolean(),
    ink: z.string().nullable().optional(),
    inks: z.array(z.string()).optional(),
    type: z.union([z.string(), z.array(z.string())]),
    classifications: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    text: z.string().nullable().optional(),
    flavor_text: z.string().nullable().optional(),
    image_uris: z
      .object({
        digital: z
          .object({
            normal: z.string().url().optional(),
            large: z.string().url().optional(),
            small: z.string().url().optional(),
          })
          .partial()
          .optional(),
      })
      .partial()
      .optional(),
    legalities: z
      .object({
        core: z.string().optional(),
      })
      .passthrough()
      .optional(),
    lore: z.number().int().nullable().optional(),
    strength: z.number().int().nullable().optional(),
    willpower: z.number().int().nullable().optional(),
    move_cost: z.number().int().nullable().optional(),
  })
  .passthrough();

export type LorcastApiCardT = z.infer<typeof LorcastApiCard>;

function asInks(api: LorcastApiCardT): InkT[] {
  const raw = api.inks ?? (api.ink ? [api.ink] : []);
  const inks = raw.map((s) => Ink.parse(s));
  if (inks.length < 1 || inks.length > 2) {
    throw new Error(`Card ${api.id} has invalid ink count: ${inks.length}`);
  }
  return inks;
}

function asTypes(api: LorcastApiCardT): CardTypeT[] {
  const arr = Array.isArray(api.type) ? api.type : [api.type];
  return arr.map((s) => CardType.parse(s));
}

function asLegality(api: LorcastApiCardT): LegalityT {
  const raw = api.legalities?.core ?? "legal";
  return Legality.parse(raw);
}

function asImageUrl(api: LorcastApiCardT): string {
  const d = api.image_uris?.digital;
  const url = d?.large ?? d?.normal ?? d?.small;
  if (!url) throw new Error(`Card ${api.id} is missing an image URL`);
  return url;
}

/**
 * Project a Lorcast API response into our `Card` shape. Both the cards
 * snapshot builder and the scraper's name-resolution index use exactly
 * this mapping, so they can never drift.
 */
export function mapLorcastToCard(api: LorcastApiCardT): CardT {
  const parsed = LorcastApiCard.parse(api);
  const cardNumber =
    typeof parsed.collector_number === "number"
      ? parsed.collector_number
      : Number.parseInt(parsed.collector_number, 10);
  if (!Number.isFinite(cardNumber)) {
    throw new Error(`Card ${parsed.id} has non-numeric collector_number`);
  }

  const card: CardT = {
    id: parsed.id,
    name: parsed.name,
    version: parsed.version ?? null,
    setCode: parsed.set.code,
    cardNumber,
    cost: parsed.cost,
    inkwell: parsed.inkwell,
    inks: asInks(parsed),
    types: asTypes(parsed),
    classifications: parsed.classifications ?? [],
    keywords: parsed.keywords ?? [],
    text: parsed.text ?? "",
    flavor: parsed.flavor_text ?? null,
    imageUrl: asImageUrl(parsed),
    legality: asLegality(parsed),
    lore: parsed.lore ?? null,
    strength: parsed.strength ?? null,
    willpower: parsed.willpower ?? null,
    moveCost: parsed.move_cost ?? null,
  };

  // Re-parse so the *output* is guaranteed schema-conformant.
  return Card.parse(card);
}
