import { describe, expect, it } from "vitest";
import { Card, type CardT } from "../src/card.js";

const valid: CardT = {
  id: "crd_abc123",
  name: "Mickey Mouse",
  version: "Brave Little Tailor",
  setCode: "TFC",
  cardNumber: 1,
  cost: 8,
  inkwell: false,
  inks: ["Amber"],
  types: ["Character"],
  classifications: ["Hero", "Storyborn"],
  keywords: ["Bodyguard"],
  text: "Bodyguard",
  flavor: null,
  imageUrl: "https://example.com/card.png",
  legality: "legal",
  lore: 2,
  strength: 5,
  willpower: 5,
  moveCost: null,
  setName: null,
  collectorNumber: null,
  rarity: null,
  illustrators: [],
  releasedAt: null,
  tcgplayerId: null,
};

describe("Card", () => {
  it("parses a known-good sample", () => {
    expect(Card.parse(valid)).toEqual(valid);
  });

  it("rejects unknown fields (strict)", () => {
    expect(() => Card.parse({ ...valid, mysteryField: 1 })).toThrow();
  });

  it("rejects empty inks", () => {
    expect(() => Card.parse({ ...valid, inks: [] })).toThrow();
  });

  it("rejects more than two inks", () => {
    expect(() =>
      Card.parse({ ...valid, inks: ["Amber", "Steel", "Ruby"] as unknown as CardT["inks"] }),
    ).toThrow();
  });

  it("rejects an invalid ink value", () => {
    expect(() => Card.parse({ ...valid, inks: ["Rainbow"] as unknown as CardT["inks"] })).toThrow();
  });
});
