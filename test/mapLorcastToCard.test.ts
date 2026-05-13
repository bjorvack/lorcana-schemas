import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Card } from "../src/card.js";
import { mapLorcastToCard } from "../src/lorcast.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(resolve(__dirname, "fixtures/lorcast-card.sample.json"), "utf8"),
);

describe("mapLorcastToCard", () => {
  it("produces a schema-valid Card", () => {
    const card = mapLorcastToCard(fixture);
    expect(() => Card.parse(card)).not.toThrow();
    expect(card.id).toBe("crd_abc123");
    expect(card.version).toBe("Brave Little Tailor");
    expect(card.inks).toEqual(["Amber"]);
    expect(card.types).toEqual(["Character"]);
    expect(card.legality).toBe("legal");
  });

  it("round-trips a stored response", () => {
    const card = mapLorcastToCard(fixture);
    expect(Card.parse(card)).toEqual(card);
  });

  it("defaults legality to legal when missing", () => {
    const noLegality = { ...fixture };
    delete noLegality.legalities;
    expect(mapLorcastToCard(noLegality).legality).toBe("legal");
  });

  it("treats `inks: null` + `ink: 'Amber'` as single-ink (real Lorcast shape)", () => {
    const single = { ...fixture, inks: null, ink: "Amber" };
    const card = mapLorcastToCard(single);
    expect(card.inks).toEqual(["Amber"]);
  });

  it("treats `ink: null` + `inks: ['Amber', 'Steel']` as dual-ink", () => {
    const dual = { ...fixture, ink: null, inks: ["Amber", "Steel"] };
    const card = mapLorcastToCard(dual);
    expect(card.inks).toEqual(["Amber", "Steel"]);
  });

  it("normalises classifications: null / keywords: null to empty arrays", () => {
    const empty = { ...fixture, classifications: null, keywords: null };
    const card = mapLorcastToCard(empty);
    expect(card.classifications).toEqual([]);
    expect(card.keywords).toEqual([]);
  });
});
