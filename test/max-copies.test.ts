import { describe, expect, it } from "vitest";
import { computeMaxCopies, isTournamentLegal } from "../src/max-copies.js";
import type { CardT } from "../src/card.js";

function card(overrides: Partial<CardT>): CardT {
  return {
    id: "x",
    name: "X",
    version: null,
    setCode: "TFC",
    cardNumber: 1,
    cost: 1,
    inkwell: true,
    inks: ["Amber"],
    types: ["Action"],
    classifications: [],
    keywords: [],
    text: "",
    flavor: null,
    imageUrl: "https://example.com/x.png",
    legality: "legal",
    lore: null,
    strength: null,
    willpower: null,
    moveCost: null,
    ...overrides,
  };
}

describe("computeMaxCopies", () => {
  it("defaults to 4", () => {
    expect(computeMaxCopies(card({}))).toBe(4);
  });

  it("recognises 'any number of cards named'", () => {
    expect(
      computeMaxCopies(card({ text: "You may have any number of cards named Dalmatian Puppy in your deck." })),
    ).toBe(Number.POSITIVE_INFINITY);
  });

  it("recognises 'up to N copies of'", () => {
    expect(
      computeMaxCopies(card({ text: "You may have up to 6 copies of this card in your deck." })),
    ).toBe(6);
  });

  it("recognises 'only have N copies of'", () => {
    expect(
      computeMaxCopies(card({ text: "You may only have 1 copy of this card in your deck." })),
    ).toBe(1);
  });
});

describe("isTournamentLegal", () => {
  const unlimitedText = "You may have any number of cards named X in your deck.";
  const cards = new Map<string, CardT>([
    ["a", card({ id: "a", name: "A", inks: ["Amber"], text: unlimitedText })],
    ["b", card({ id: "b", name: "B", inks: ["Steel"], text: unlimitedText })],
    ["c", card({ id: "c", name: "C", inks: ["Ruby"] })],
  ]);

  it("rejects a deck under 60 cards", () => {
    const result = isTournamentLegal(
      { inks: ["Amber"], cards: [{ cardId: "a", count: 4 }] },
      cards,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects out-of-ink cards", () => {
    const result = isTournamentLegal(
      {
        inks: ["Amber"],
        cards: [
          { cardId: "a", count: 30 },
          { cardId: "c", count: 30 },
        ],
      },
      cards,
    );
    expect(result.ok).toBe(false);
  });

  it("accepts a legal 60-card deck", () => {
    const result = isTournamentLegal(
      {
        inks: ["Amber", "Steel"],
        cards: [
          { cardId: "a", count: 30 },
          { cardId: "b", count: 30 },
        ],
      },
      cards,
    );
    expect(result.ok).toBe(true);
  });
});
