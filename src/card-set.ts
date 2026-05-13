import { z } from "zod";
import { createHash } from "node:crypto";
import { Card, type CardT } from "./card.js";

export const CardSet = z
  .object({
    cardSetVersion: z.string().min(1),
    fetchedAt: z.string().datetime({ offset: true }),
    cards: z.array(Card),
  })
  .strict();

export type CardSetT = z.infer<typeof CardSet>;

/**
 * Canonicalises a `Card[]` by sorting on `id`, JSON-encoding with sorted
 * keys, and returning `sha256:<hex>`. Stable across array reordering so
 * `cardSetVersion` is purely a function of the *content* of the snapshot.
 */
export function hashCardSet(cards: readonly CardT[]): string {
  const sorted = [...cards].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const canonical = JSON.stringify(sorted, sortedReplacer);
  return "sha256:" + createHash("sha256").update(canonical, "utf8").digest("hex");
}

function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = obj[k];
        return acc;
      }, {});
  }
  return value;
}
