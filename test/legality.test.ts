import { describe, expect, it } from "vitest";

import {
  Banlist,
  type BanlistT,
  Rotation,
  type RotationT,
  computeLegality,
  computeLegalityFast,
  coreLegalSetCodes,
  isTournamentLegal,
  resolveBanlist,
  type CardT,
} from "../src/index.js";

/** Minimal Card factory for tests. The schema's strict mode requires
 * every field; sticking the boilerplate in one place keeps each test
 * focused on the legality behaviour it actually exercises. */
function makeCard(overrides: Partial<CardT> & Pick<CardT, "id" | "setCode" | "cardNumber">): CardT {
  return {
    id: overrides.id,
    name: overrides.name ?? `Card ${overrides.id}`,
    version: overrides.version ?? null,
    setCode: overrides.setCode,
    cardNumber: overrides.cardNumber,
    cost: overrides.cost ?? 3,
    inkwell: overrides.inkwell ?? true,
    inks: overrides.inks ?? ["Amber"],
    types: overrides.types ?? ["Character"],
    classifications: overrides.classifications ?? [],
    keywords: overrides.keywords ?? [],
    text: overrides.text ?? "",
    flavor: overrides.flavor ?? null,
    imageUrl: overrides.imageUrl ?? "https://example.invalid/c.png",
    legality: overrides.legality ?? "legal",
    lore: overrides.lore ?? 1,
    strength: overrides.strength ?? 1,
    willpower: overrides.willpower ?? 1,
    moveCost: overrides.moveCost ?? null,
    setName: overrides.setName ?? null,
    collectorNumber: overrides.collectorNumber ?? null,
    rarity: overrides.rarity ?? null,
    illustrators: overrides.illustrators ?? [],
    releasedAt: overrides.releasedAt ?? null,
    tcgplayerId: overrides.tcgplayerId ?? null,
  };
}

const SAMPLE_BANLIST: BanlistT = {
  generatedAt: "2026-05-14T09:00:00Z",
  sourceUrl: "https://lorcana.gg/banned-card-list/",
  schemaVersion: "1.0.0",
  formats: {
    core_constructed: [
      {
        cardName: "Hiram Flaversham - Toymaker",
        setCode: "2",
        cardNumber: 149,
        effectiveDate: "2025-04-08",
      },
      { cardName: "Fortisphere", setCode: "4", cardNumber: 200, effectiveDate: "2025-04-08" },
    ],
    infinity_constructed: [],
  },
};

const SAMPLE_ROTATION: RotationT = {
  generatedAt: "2026-05-14T09:00:00Z",
  sourceUrl: "https://lorcana.gg/rotation/",
  schemaVersion: "1.0.0",
  blocks: [
    {
      name: "Year 1",
      setCodes: ["1", "2", "3", "4"],
      releaseDate: "2023-08-18",
      rotationDate: "2025-09-05",
    },
    {
      name: "Year 2",
      setCodes: ["5", "6", "7", "8"],
      releaseDate: "2024-08-09",
      rotationDate: "2026-09-30",
    },
    {
      name: "Year 3",
      setCodes: ["9", "10", "11", "12"],
      releaseDate: "2025-09-05",
      rotationDate: "2027-09-30",
    },
  ],
  coreConstructedCutoffMonths: 24,
};

describe("Banlist schema", () => {
  it("accepts the sample payload", () => {
    expect(Banlist.parse(SAMPLE_BANLIST)).toEqual(SAMPLE_BANLIST);
  });

  it("rejects an unknown format key (strict)", () => {
    const broken = { ...SAMPLE_BANLIST, formats: { ...SAMPLE_BANLIST.formats, weird: [] } };
    expect(() => Banlist.parse(broken)).toThrow();
  });

  it("requires YYYY-MM-DD effectiveDate", () => {
    const broken = {
      ...SAMPLE_BANLIST,
      formats: {
        ...SAMPLE_BANLIST.formats,
        core_constructed: [
          { ...SAMPLE_BANLIST.formats.core_constructed[0]!, effectiveDate: "2025/04/08" },
        ],
      },
    };
    expect(() => Banlist.parse(broken)).toThrow();
  });
});

describe("Rotation schema", () => {
  it("accepts the sample payload", () => {
    expect(Rotation.parse(SAMPLE_ROTATION)).toEqual(SAMPLE_ROTATION);
  });

  it("rejects an empty blocks array", () => {
    expect(() => Rotation.parse({ ...SAMPLE_ROTATION, blocks: [] })).toThrow();
  });
});

describe("resolveBanlist", () => {
  it("maps banlist entries to Card.id by (setCode, cardNumber)", () => {
    const cards = [
      { id: "card-fortisphere", setCode: "4", cardNumber: 200 },
      { id: "card-hiram", setCode: "2", cardNumber: 149 },
      { id: "card-safe", setCode: "5", cardNumber: 12 },
    ];
    const banned = resolveBanlist(SAMPLE_BANLIST, cards, "core_constructed");
    expect(banned).toEqual(new Set(["card-fortisphere", "card-hiram"]));
  });

  it("returns an empty set for a format with no entries", () => {
    expect(
      resolveBanlist(
        SAMPLE_BANLIST,
        [{ id: "anything", setCode: "1", cardNumber: 1 }],
        "infinity_constructed",
      ),
    ).toEqual(new Set());
  });
});

describe("coreLegalSetCodes", () => {
  it("includes only blocks whose rotationDate is in the future", () => {
    const asOf = new Date("2026-01-15");
    expect(coreLegalSetCodes(SAMPLE_ROTATION, asOf)).toEqual(
      new Set(["5", "6", "7", "8", "9", "10", "11", "12"]),
    );
  });

  it("drops all blocks once every rotationDate is in the past", () => {
    const asOf = new Date("2030-01-01");
    expect(coreLegalSetCodes(SAMPLE_ROTATION, asOf)).toEqual(new Set());
  });
});

describe("computeLegality", () => {
  const asOf = new Date("2026-05-14");

  it("returns banned for a banlisted card in the active format", () => {
    const card = makeCard({ id: "card-hiram", setCode: "2", cardNumber: 149 });
    expect(computeLegality(card, SAMPLE_BANLIST, SAMPLE_ROTATION, "core_constructed", asOf)).toBe(
      "banned",
    );
  });

  it("returns rotated_out for an old set in Core", () => {
    const card = makeCard({ id: "card-old", setCode: "1", cardNumber: 5 });
    expect(computeLegality(card, SAMPLE_BANLIST, SAMPLE_ROTATION, "core_constructed", asOf)).toBe(
      "rotated_out",
    );
  });

  it("returns legal for an in-rotation, unbanned card in Core", () => {
    const card = makeCard({ id: "card-current", setCode: "8", cardNumber: 1 });
    expect(computeLegality(card, SAMPLE_BANLIST, SAMPLE_ROTATION, "core_constructed", asOf)).toBe(
      "legal",
    );
  });

  it("never rotates in Infinity even for ancient sets", () => {
    const card = makeCard({ id: "card-old", setCode: "1", cardNumber: 5 });
    expect(
      computeLegality(card, SAMPLE_BANLIST, SAMPLE_ROTATION, "infinity_constructed", asOf),
    ).toBe("legal");
  });

  it("respects upstream Card.legality = banned regardless of banlist", () => {
    const card = makeCard({
      id: "card-promo",
      setCode: "P1",
      cardNumber: 1,
      legality: "banned",
    });
    expect(
      computeLegality(card, SAMPLE_BANLIST, SAMPLE_ROTATION, "infinity_constructed", asOf),
    ).toBe("banned");
  });
});

describe("computeLegalityFast", () => {
  it("agrees with computeLegality on a precomputed bannedIds set", () => {
    const banned = makeCard({ id: "card-hiram", setCode: "2", cardNumber: 149 });
    const set = new Set([banned.id]);
    expect(
      computeLegalityFast(banned, set, SAMPLE_ROTATION, "core_constructed", new Date("2026-05-14")),
    ).toBe("banned");
  });
});

describe("isTournamentLegal (back-compat + format-aware)", () => {
  function cardMap(...cards: CardT[]): Map<string, CardT> {
    return new Map(cards.map((c) => [c.id, c]));
  }
  // A 60-copy filler whose card text raises the cap to infinity, so
  // tests can assemble a "60 cards, 1 unique" deck without tripping
  // the max-copies rule. This lets each test isolate the legality
  // reason it actually wants to assert on.
  const filler = makeCard({
    id: "filler",
    setCode: "8",
    cardNumber: 1,
    text: "You may have any number of cards named Filler in your deck.",
  });

  it("preserves v1 behaviour when no banlist/rotation passed", () => {
    const banned = makeCard({
      id: "banned-card",
      setCode: "2",
      cardNumber: 149,
      legality: "banned",
      text: "You may have any number of cards named Banned Card in your deck.",
    });
    const ok = isTournamentLegal(
      { inks: ["Amber"], cards: [{ cardId: filler.id, count: 60 }] },
      cardMap(filler),
    );
    expect(ok).toEqual({ ok: true });
    const bad = isTournamentLegal(
      { inks: ["Amber"], cards: [{ cardId: banned.id, count: 60 }] },
      cardMap(banned),
    );
    expect(bad.ok).toBe(false);
  });

  it("flags banlisted cards when banlist/rotation are passed", () => {
    const card = makeCard({
      id: "hiram",
      setCode: "2",
      cardNumber: 149,
      text: "You may have any number of cards named Hiram in your deck.",
    });
    const result = isTournamentLegal(
      { inks: ["Amber"], cards: [{ cardId: card.id, count: 60 }] },
      cardMap(card),
      { banlist: SAMPLE_BANLIST, rotation: SAMPLE_ROTATION, format: "core_constructed" },
    );
    if (result.ok) {
      throw new Error("expected the banned card to fail legality");
    }
    expect(result.reasons.join("\n")).toMatch(/banned/);
  });

  it("flags rotated cards in Core but not in Infinity", () => {
    const card = makeCard({
      id: "old",
      setCode: "1",
      cardNumber: 5,
      text: "You may have any number of cards named Old in your deck.",
    });
    const core = isTournamentLegal(
      { inks: ["Amber"], cards: [{ cardId: card.id, count: 60 }] },
      cardMap(card),
      { rotation: SAMPLE_ROTATION, format: "core_constructed", asOf: new Date("2026-05-14") },
    );
    expect(core.ok).toBe(false);
    if (!core.ok) {
      expect(core.reasons.some((r) => r.includes("rotated_out"))).toBe(true);
    }
    const infinity = isTournamentLegal(
      { inks: ["Amber"], cards: [{ cardId: card.id, count: 60 }] },
      cardMap(card),
      { rotation: SAMPLE_ROTATION, format: "infinity_constructed", asOf: new Date("2026-05-14") },
    );
    expect(infinity).toEqual({ ok: true });
  });
});
