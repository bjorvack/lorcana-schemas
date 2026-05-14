import type { BanlistT, FormatNameT } from "./banlist.js";
import { resolveBanlist } from "./banlist.js";
import type { CardT } from "./card.js";
import type { RotationT } from "./rotation.js";
import { coreLegalSetCodes } from "./rotation.js";

/**
 * The four-state outcome of a per-card legality check. The strings
 * are stable contract identifiers, suitable for surfacing directly in
 * a UI status pill.
 *
 *   - ``legal``: card is in the active format's legal pool and not on
 *     the active banlist.
 *   - ``banned``: card is on the active banlist.
 *   - ``rotated_out``: format is Core-Constructed and the card's set
 *     has rotated.
 *   - ``not_yet_released``: card's set has a future release date
 *     relative to ``asOf``. Currently only reachable in tests; we
 *     don't ship cards for unreleased sets in `cards-vN`.
 */
export type LegalityStatus = "legal" | "banned" | "rotated_out" | "not_yet_released";

/**
 * Format-aware single-card legality oracle.
 *
 * Combines the upstream banlist + rotation data with a card's own
 * ``setCode``/``cardNumber`` identifiers and an ``asOf`` clock. The
 * per-card ``Card.legality`` enum is still respected (a card upstream-
 * flagged ``banned`` short-circuits to ``banned``), but the banlist
 * file is the authoritative source for tournament bans going forward.
 *
 * No caching here — callers that look up many cards should construct
 * the banned-id ``Set`` once and pass it back via :func:`computeLegalityFast`.
 */
export function computeLegality(
  card: CardT,
  banlist: BanlistT,
  rotation: RotationT,
  format: FormatNameT,
  asOf: Date = new Date(),
): LegalityStatus {
  if (card.legality === "banned") return "banned";
  const bannedIds = resolveBanlist(banlist, [card], format);
  return computeLegalityFast(card, bannedIds, rotation, format, asOf);
}

/**
 * Bulk-friendly variant: caller pre-resolves the banned-id set via
 * :func:`resolveBanlist` once and passes it for every card. Useful for
 * the web finder's per-row pill and the worker's legality mask, both
 * of which loop over the whole vocabulary.
 */
export function computeLegalityFast(
  card: CardT,
  bannedIds: ReadonlySet<string>,
  rotation: RotationT,
  format: FormatNameT,
  asOf: Date = new Date(),
): LegalityStatus {
  if (card.legality === "banned" || bannedIds.has(card.id)) return "banned";
  if (format === "infinity_constructed") {
    // Infinity has no rotation; the only legality lever is the
    // banlist, already handled above.
    return "legal";
  }
  const legalSets = coreLegalSetCodes(rotation, asOf);
  if (!legalSets.has(card.setCode)) {
    // We don't have first-class release-date data on Card today;
    // treat any unknown set as rotated_out rather than try to
    // distinguish "not yet released" without that field. The branch
    // exists so future Card.releaseDate can refine it.
    return "rotated_out";
  }
  return "legal";
}
