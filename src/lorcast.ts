import { z } from "zod";
import { Card, type CardT } from "./card.js";
import {
  CardType,
  Ink,
  Legality,
  Rarity,
  type CardTypeT,
  type InkT,
  type LegalityT,
  type RarityT,
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
        name: z.string().optional(),
      })
      .passthrough(),
    collector_number: z.union([z.string(), z.number()]),
    rarity: z.string().nullable().optional(),
    illustrators: z.array(z.string()).nullable().optional(),
    released_at: z.string().nullable().optional(),
    tcgplayer_id: z.number().int().nullable().optional(),
    cost: z.number().int().nonnegative(),
    inkwell: z.boolean(),
    ink: z.string().nullable().optional(),
    inks: z.array(z.string()).nullable().optional(),
    type: z.union([z.string(), z.array(z.string())]),
    classifications: z.array(z.string()).nullable().optional(),
    keywords: z.array(z.string()).nullable().optional(),
    text: z.string().nullable().optional(),
    flavor_text: z.string().nullable().optional(),
    image_uris: z
      .object({
        // URL fields are intentionally permissive: Lorcast emits empty strings
        // for missing variants (e.g. cp/* Challenge Promo cards have empty
        // small/normal but a valid large). `asImageUrl` picks the first
        // non-empty URL and validates it via the output `Card` schema.
        digital: z
          .object({
            normal: z.string().optional(),
            large: z.string().optional(),
            small: z.string().optional(),
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
  // Lorcast uses two encodings:
  //   - dual-ink cards:  inks = ["Amber", "Steel"], ink = null
  //   - single-ink:      inks = null,               ink = "Amber"
  const raw = api.inks && api.inks.length > 0 ? api.inks : api.ink ? [api.ink] : [];
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
  // Lorcast emits `""` for missing variants. Prefer `large`, then `normal`,
  // then `small`, skipping empties. Any truthy value is then re-validated as
  // a URL by `Card.parse`.
  const url = [d?.large, d?.normal, d?.small].find((u) => typeof u === "string" && u.length > 0);
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

  // Lorcast sometimes reports rarities outside our enum (e.g.
  // ``"D23"`` for D23-exclusive promos). Map anything unknown to
  // ``Promo`` so the strict ``Card`` schema doesn't reject the row;
  // the resulting ``rarity`` is still informative.
  const rawRarity = parsed.rarity ?? null;
  let rarity: RarityT | null = null;
  if (rawRarity !== null) {
    const ok = Rarity.safeParse(rawRarity);
    rarity = ok.success ? ok.data : "Promo";
  }

  const card: CardT = {
    id: parsed.id,
    name: parsed.name,
    version: parsed.version ?? null,
    setCode: parsed.set.code,
    setName: parsed.set.name ?? null,
    cardNumber,
    collectorNumber:
      typeof parsed.collector_number === "string"
        ? parsed.collector_number
        : String(parsed.collector_number),
    cost: parsed.cost,
    inkwell: parsed.inkwell,
    inks: asInks(parsed),
    types: asTypes(parsed),
    classifications: parsed.classifications ?? [],
    keywords: parsed.keywords ?? [],
    text: parsed.text ?? "",
    flavor: parsed.flavor_text ?? null,
    imageUrl: asImageUrl(parsed),
    rarity,
    illustrators: parsed.illustrators ?? [],
    releasedAt: parsed.released_at ?? null,
    tcgplayerId: parsed.tcgplayer_id ?? null,
    legality: asLegality(parsed),
    lore: parsed.lore ?? null,
    strength: parsed.strength ?? null,
    willpower: parsed.willpower ?? null,
    moveCost: parsed.move_cost ?? null,
  };

  // Re-parse so the *output* is guaranteed schema-conformant.
  return Card.parse(card);
}
