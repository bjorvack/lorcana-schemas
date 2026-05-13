import type { CardT } from "./card.js";

/**
 * Per-card copy cap. Default is 4. Card text can override in three observed
 * ways (kept in lockstep with the Python `compute_max_copies.py` mirror in
 * `lorcana-training`; shared fixtures keep both implementations honest).
 */
export function computeMaxCopies(card: CardT): number {
  const text = card.text ?? "";

  // 1. "You may have any number of cards named X in your deck."
  if (/you may have any number of cards named/i.test(text)) {
    return Number.POSITIVE_INFINITY;
  }

  // 2. "You may have up to N copies of [name] in your deck." (raises)
  const upTo = text.match(/you may have up to (\d+) copies of/i);
  if (upTo && upTo[1]) {
    return Number.parseInt(upTo[1], 10);
  }

  // 3. "You may only have N copies of [name] in your deck." (lowers)
  const only = text.match(/you may only have (\d+) cop(?:y|ies) of/i);
  if (only && only[1]) {
    return Number.parseInt(only[1], 10);
  }

  return 4;
}

/**
 * Tournament-legality check. The single place these rules are encoded;
 * the web app and training pipeline both call it.
 */
export function isTournamentLegal(
  deck: { inks: string[]; cards: { cardId: string; count: number }[] },
  cards: Map<string, CardT>,
): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  const allowedInks = new Set(deck.inks);

  let total = 0;
  for (const { cardId, count } of deck.cards) {
    const card = cards.get(cardId);
    if (!card) {
      reasons.push(`Unknown card id: ${cardId}`);
      continue;
    }
    total += count;

    if (card.legality !== "legal") {
      reasons.push(`${card.name} is ${card.legality}`);
    }
    const cap = computeMaxCopies(card);
    if (count > cap) {
      reasons.push(
        `${card.name}: ${count} copies exceeds cap ${Number.isFinite(cap) ? cap : "infinity"}`,
      );
    }
    for (const ink of card.inks) {
      if (!allowedInks.has(ink)) {
        reasons.push(`${card.name} requires ${ink} which is not in deck inks`);
        break;
      }
    }
  }

  if (total < 60) {
    reasons.push(`Deck has ${total} cards; minimum is 60`);
  }

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}
