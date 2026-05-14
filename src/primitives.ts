import { z } from "zod";

export const InkValues = ["Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel"] as const;
export const Ink = z.enum(InkValues);
export type InkT = z.infer<typeof Ink>;

export const CardTypeValues = ["Character", "Action", "Song", "Item", "Location"] as const;
export const CardType = z.enum(CardTypeValues);
export type CardTypeT = z.infer<typeof CardType>;

export const LegalityValues = ["legal", "not_legal", "banned"] as const;
export const Legality = z.enum(LegalityValues);
export type LegalityT = z.infer<typeof Legality>;

/**
 * Lorcana rarity tiers. Order matches the in-game pull rates from
 * most-common (Common) to ultra-rare (Enchanted). ``Promo`` is the
 * catch-all for non-pack rarities (D23, Disney 100, …) so the enum
 * stays exhaustive without growing forever.
 */
export const RarityValues = [
  "Common",
  "Uncommon",
  "Rare",
  "Super Rare",
  "Legendary",
  "Enchanted",
  "Special",
  "Promo",
] as const;
export const Rarity = z.enum(RarityValues);
export type RarityT = z.infer<typeof Rarity>;
