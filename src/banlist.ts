import { z } from "zod";

/**
 * Names of the two officially supported Disney Lorcana constructed
 * formats. Frozen as a literal tuple so consumers can iterate without
 * re-declaring; matches the keys used inside `Banlist.formats`.
 */
export const FormatNameValues = ["core_constructed", "infinity_constructed"] as const;
export const FormatName = z.enum(FormatNameValues);
export type FormatNameT = z.infer<typeof FormatName>;

/**
 * A single banned card entry. Carries the source-of-truth identifiers
 * (set code + card number) the upstream announcements use plus a
 * human-readable card name for debugging; consumers should `resolveBanlist`
 * the entries against a `CardSet` to get back actual `Card.id`s.
 *
 * The schema deliberately stays permissive on `setCode` (a free string)
 * because Lorcana set codes are short, occasionally non-numeric (promo
 * codes like ``P1``, ``D23``), and we don't want every new set release
 * to require a schemas bump.
 */
export const BanlistEntry = z
  .object({
    cardName: z.string().min(1),
    setCode: z.string().min(1),
    cardNumber: z.number().int().nonnegative(),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  })
  .strict();
export type BanlistEntryT = z.infer<typeof BanlistEntry>;

/**
 * The full banlist payload, validated against ``banlist.json`` from a
 * ``cards-vN`` release. The two format buckets are required even when
 * empty so consumers can lookup either without an optional-chain dance
 * — an empty list is a meaningful answer ("nothing banned here yet").
 */
export const Banlist = z
  .object({
    generatedAt: z.string().datetime({ offset: true }),
    sourceUrl: z.string().url(),
    schemaVersion: z.string(),
    formats: z
      .object({
        core_constructed: z.array(BanlistEntry),
        infinity_constructed: z.array(BanlistEntry),
      })
      .strict(),
  })
  .strict();
export type BanlistT = z.infer<typeof Banlist>;

/**
 * Look up the set of banned ``Card.id``s for a given format.
 *
 * The banlist keys cards by ``(setCode, cardNumber)`` because that's
 * what Ravensburger's announcements use; resolving those to `Card.id`s
 * requires a card index. Returns a `Set<string>` of matching ids;
 * entries that don't match any card in the index are silently dropped
 * (a card the announcement names that we don't yet have a `Card` for
 * is harmless — the deck couldn't contain it either).
 */
export function resolveBanlist(
  banlist: BanlistT,
  cards: Iterable<{ id: string; setCode: string; cardNumber: number }>,
  format: FormatNameT,
): Set<string> {
  const wanted = new Set<string>();
  for (const entry of banlist.formats[format]) {
    wanted.add(`${entry.setCode}|${entry.cardNumber}`);
  }
  const out = new Set<string>();
  if (wanted.size === 0) return out;
  for (const card of cards) {
    if (wanted.has(`${card.setCode}|${card.cardNumber}`)) out.add(card.id);
  }
  return out;
}
