import { describe, expect, it } from "vitest";
import { Deck, type DeckT } from "../src/deck.js";

const baseDeck: DeckT = {
  inks: ["Amber", "Steel"],
  cards: [
    { cardId: "a", count: 4 },
    { cardId: "b", count: 3 },
  ],
  name: null,
  source: null,
};

describe("Deck", () => {
  it("parses a known-good deck", () => {
    expect(Deck.parse(baseDeck)).toEqual(baseDeck);
  });

  it("rejects duplicate cardIds", () => {
    expect(() =>
      Deck.parse({
        ...baseDeck,
        cards: [
          { cardId: "a", count: 2 },
          { cardId: "a", count: 2 },
        ],
      }),
    ).toThrow();
  });

  it("rejects zero counts", () => {
    expect(() => Deck.parse({ ...baseDeck, cards: [{ cardId: "a", count: 0 }] })).toThrow();
  });

  it("rejects duplicate inks", () => {
    expect(() => Deck.parse({ ...baseDeck, inks: ["Amber", "Amber"] })).toThrow();
  });

  it("rejects three inks", () => {
    expect(() =>
      Deck.parse({
        ...baseDeck,
        inks: ["Amber", "Steel", "Ruby"] as unknown as DeckT["inks"],
      }),
    ).toThrow();
  });

  it("allows a partial deck below 60 cards (legality lives elsewhere)", () => {
    const small: DeckT = { ...baseDeck, cards: [{ cardId: "a", count: 1 }] };
    expect(Deck.parse(small)).toEqual(small);
  });
});
