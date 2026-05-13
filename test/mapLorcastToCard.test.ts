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
});
