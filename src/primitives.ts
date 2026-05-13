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
