import { describe, expect, it } from "vitest";
import { hashCardSet } from "../src/card-set.js";
import type { CardT } from "../src/card.js";

const a: CardT = {
  id: "a",
  name: "A",
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
  imageUrl: "https://example.com/a.png",
  legality: "legal",
  lore: null,
  strength: null,
  willpower: null,
  moveCost: null,
  setName: null,
  collectorNumber: null,
  rarity: null,
  illustrators: [],
  releasedAt: null,
  tcgplayerId: null,
};

const b: CardT = { ...a, id: "b", name: "B" };

describe("hashCardSet", () => {
  it("is stable across reordering", () => {
    expect(hashCardSet([a, b])).toBe(hashCardSet([b, a]));
  });

  it("is stable across repeated calls", () => {
    expect(hashCardSet([a, b])).toBe(hashCardSet([a, b]));
  });

  it("changes when content changes", () => {
    expect(hashCardSet([a, b])).not.toBe(hashCardSet([a, { ...b, cost: 2 }]));
  });

  it("returns sha256:<hex>", () => {
    expect(hashCardSet([a])).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
