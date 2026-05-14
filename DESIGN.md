# lorcana-schemas — Design

> Single source of truth for the data types that flow between the scraper,
> training pipeline, and web app. If a field is not defined here, it does
> not exist in the system.

## Purpose

This repository defines the **shape** of every cross-repo data object as
[`zod`](https://zod.dev) schemas. From those schemas it emits:

1. A typed **npm package** (`@bjorvack/lorcana-schemas`) for TypeScript
   consumers (`lorcana-scraper`, `lorcana-web`).
2. **JSON Schema** files (`schemas/*.schema.json`) for non-TS consumers
   (`lorcana-training`, which uses
   [`datamodel-code-generator`](https://github.com/koxudaxi/datamodel-code-generator)
   to produce `pydantic` models).

The schemas are the contract. Drift between consumers is impossible because
nobody writes their own types — they all generate from this package.

## Non-goals

- Runtime business logic (legality checks, deck validation, weight
  calculations). Those live in the consumer that needs them.
- Generated UI form bindings.
- A "fat" object model with methods. Schemas describe data, not behaviour.
- Wrapping the Lorcast API client. We only *validate* the API response shape;
  the actual `fetch` lives in whichever repo calls it.

---

## What it defines

Eight schemas, grouped into three layers.

### Layer 1 — Primitives

- **`Ink`** — string enum: `"Amber" | "Amethyst" | "Emerald" | "Ruby" | "Sapphire" | "Steel"`.
- **`CardType`** — string enum: `"Character" | "Action" | "Song" | "Item" | "Location"`.
- **`Legality`** — string enum: `"legal" | "not_legal" | "banned"`.

These are exported as `z.enum([...])` plus a TypeScript `const` array so
consumers can iterate without re-declaring the values.

### Layer 2 — Domain objects

- **`Card`** — a single printed card. **Raw facts only**, no derived fields.
  ```ts
  {
    id: string,              // Lorcast id, stable across reprints
    name: string,            // "Mickey Mouse"
    version: string | null,  // "Brave Little Tailor" — null for non-character cards without a subtitle
    setCode: string,         // e.g. "TFC", "ROF"
    cardNumber: number,      // collector number within the set
    cost: number,            // 0..10
    inkwell: boolean,        // can be used as ink
    inks: Ink[],             // length 1 or 2 (dual-ink cards)
    types: CardType[],       // length >= 1
    classifications: string[], // free-form subtypes ("Hero", "Storyborn", "Floodborn", …)
    keywords: string[],      // ["Bodyguard", "Singer 5", …] — raw, as printed
    text: string,            // full card text including reminder text in ()
    flavor: string | null,
    imageUrl: string,
    legality: Legality,
    // Type-dependent stats, all optional:
    lore: number | null,        // characters
    strength: number | null,    // characters
    willpower: number | null,   // characters
    moveCost: number | null,    // locations
  }
  ```
  Deliberately excluded (compared to the current `Card.js`):
  - `sanitizedText`, `hasShift`, `hasSinger`, `singCost`, `maxAmount`,
    `requiredKeywords`, etc. These are **derivations**, not data, and they
    live in a small utility module inside the web app (see
    `lorcana-web/DESIGN.md`). Keeping them out of the schema means a regex
    fix in the web app doesn't force a schema bump.

- **`Deck`** — a multiset of cards.
  ```ts
  {
    inks: [Ink] | [Ink, Ink],     // exactly 1 or 2
    cards: { cardId: string, count: number }[],
    name: string | null,
    source: string | null,        // free-form, e.g. "inkdecks.com"
  }
  ```
  Invariants enforced by the schema's `refine`:
  - `cards.length >= 1`
  - every `count >= 1`
  - `cardId` values are unique within `cards` (a card appears in `cards`
    at most once; its multiplicity lives in `count`).

  The schema deliberately does **not** enforce:
  - a 60-card minimum (partial decks during construction are valid),
  - a hard `count <= 4` cap (some cards' text raises or lowers this — see
    `computeMaxCopies` below),
  - all cards being in `inks` (the *schema* is the data shape; *legality* is
    a separate concern).

  Tournament legality lives in a separately exported function:
  ```ts
  export function isTournamentLegal(deck: DeckT, cards: Map<string, CardT>):
    { ok: true } | { ok: false, reasons: string[] }
  ```
  which checks: total ≥ 60, every `count` ≤ `computeMaxCopies(card)`, every
  card's `inks` is a subset of `deck.inks`, and every card's `legality ===
  "legal"`. This is the single place these rules are encoded; the web app
  and training pipeline both call it.

- **`Banlist`** — Ravensburger's per-format banned-card list. Banlists
  change a few times per year by announcement and apply equally to
  every deck in that format. Modelled as **separate data**, not a
  per-card flag, so the same `Card` can be looked up across formats
  without re-baking `cards-vN`:
  ```ts
  {
    generatedAt: string,            // ISO 8601 UTC timestamp
    sourceUrl: string,              // "https://lorcana.gg/banned-card-list/"
    schemaVersion: string,          // "1.0.0"
    formats: {
      core_constructed: BanlistEntry[],
      infinity_constructed: BanlistEntry[],
    },
  }

  // BanlistEntry
  {
    cardName: string,               // "Hiram Flaversham - Toymaker"
    setCode: string,                // "2"
    cardNumber: number,             // 149
    effectiveDate: string,          // ISO 8601 date the ban took effect
  }
  ```
  The schema validates the shape; matching banlist entries to actual
  `Card`s is the helper `resolveBanlist(banlist, cards)`'s job and
  returns the set of banned `Card.id`s. Helpers belong here because
  every consumer (scraper validation, web UI, training-time
  filter) needs the same join.

- **`Rotation`** — the Core-Constructed rotation calendar. Disney
  Lorcana started set rotation with Set 9 (September 2025): the most
  recent two yearly blocks (8 sets) are Core-legal, older sets
  rotate out into Infinity-Constructed only. The block structure is
  deterministic from set release dates, but a few constants
  (cutoff months, block boundaries) change rarely and benefit from
  being a single declarative file rather than scattered constants:
  ```ts
  {
    generatedAt: string,
    sourceUrl: string,              // "https://lorcana.gg/rotation/"
    schemaVersion: string,
    blocks: {
      name: string,                 // "Year 1"
      setCodes: string[],           // ["1", "2", "3", "4"]
      releaseDate: string,          // ISO 8601 date of the *first* set's release
      rotationDate: string,         // ISO 8601 date the block rotates out
    }[],
    coreConstructedCutoffMonths: number, // 24 at time of writing
  }
  ```

- **`computeLegality`** — the format-aware replacement for the per-card
  `Card.legality` flag. The flag still exists on `Card` (some upstream
  adapters use it to mark promo-only cards) but tournament legality is
  now a function:
  ```ts
  type FormatName = "core_constructed" | "infinity_constructed";

  export function computeLegality(
    card: CardT,
    banlist: BanlistT,
    rotation: RotationT,
    format: FormatName,
    asOf?: Date,                    // defaults to `new Date()`
  ): "legal" | "banned" | "rotated_out" | "not_yet_released"
  ```
  `isTournamentLegal` gains the same `(banlist, rotation, format,
  asOf)` arguments. Existing callers that pass only `(deck, cards)`
  keep working — the function defaults `format =
  "infinity_constructed"` (no rotation filter) and treats banlist
  as empty, which matches v1's "drop only truly banned cards"
  behaviour bit-for-bit.

- **`Tournament`** — a scraped tournament with its top decks.
  ```ts
  {
    sourceUrl: string,
    sourceName: string,           // "inkdecks.com"
    name: string,
    date: string,                 // ISO 8601, date-only
    decks: {
      placement: number | null,   // 1..N, null if unknown
      player: string | null,
      deck: Deck,
    }[],
  }
  ```

### Layer 3 — Pipeline contracts

- **`CardSet`** — the static snapshot of all cards baked into the web app
  bundle and consumed by the training pipeline.
  ```ts
  {
    cardSetVersion: string,       // sha256 of canonicalised cards array
    fetchedAt: string,            // ISO 8601 datetime
    cards: Card[],
  }
  ```

- **`Dataset`** — the artifact published by `lorcana-scraper` releases.
  ```ts
  {
    datasetVersion: string,       // semver, e.g. "1.4.0"
    schemaVersion: string,        // major of @bjorvack/lorcana-schemas at scrape time
    cardSetVersion: string,       // matches CardSet.cardSetVersion of the
                                  // cards-vN this dataset was resolved against
    cardsReleaseTag: string,      // human-readable tag, e.g. "cards-v2025.05.01-01"
    generatedAt: string,
    sources: string[],            // ["inkdecks.com", ...]
    tournaments: Tournament[],
  }
  ```
  The `cardSetVersion` + `cardsReleaseTag` pair makes every `tournaments-vN`
  reproducible against an exact card snapshot. Downstream consumers
  (training) pin a `tournaments-vN` and trust that its `cardSetVersion`
  matches the `cards-vN` they themselves pin.

- **`ModelManifest`** — the single descriptor for a `model-vN` release,
  shipped alongside the two ONNX files and the data tables.
  ```ts
  {
    modelVersion: string,         // semver
    schemaVersion: string,        // major of @bjorvack/lorcana-schemas
    vocabHash: string,            // sha256:... of vocab.json
    cardSetVersion: string,       // matches CardSet.cardSetVersion
    cardsReleaseTag: string,      // e.g. "cards-v2025.05.01-01"
    datasetReleaseTag: string,    // e.g. "tournaments-v42"
    encoderReleaseTag: string,    // e.g. "encoder-v2025.06.01-01"
    trainedAt: string,
    architecture: "encoder-proposal-evaluator-v1" | string,
    style_presets: {
      // Auto-calibrated per release by lorcana-training's eval stage.
      // Each tuple is the (α, γ, λ) blend weight for the inference search.
      safe:     { alpha: number, gamma: number, lambda: number },
      balanced: { alpha: number, gamma: number, lambda: number },
      brew:     { alpha: number, gamma: number, lambda: number },
      // True iff the eval stage's intermediate-coherence diagnostic
      // showed the three presets are well-behaved under linear
      // interpolation. lorcana-web hides the Advanced slider when false.
      interpolatable: boolean,
    },
    // Metrics block. Top-level entries hold aggregate values across
    // Styles; the per_style sub-map carries each Style's metrics.
    // Open-ended on purpose; gates can grow without a schema bump.
    metrics: {
      legalityRate: number,            // hard gate, must be 1.0
      evaluatorAuroc: number,          // hard gate, ≥ 0.80
      evaluatorEce: number | null,
      per_style: {
        safe:     Record<string, number>,
        balanced: Record<string, number>,
        brew:     Record<string, number>,
      },
    },
  }
  ```

  Why metrics is loose: training-time quality gates evolve faster than
  this schema can. Hard-gate keys (`legalityRate`, `evaluatorAuroc`) are
  named because consumers check them; everything else is free-form
  `Record<string, number>` per Style. The training repo's
  `eval/report.md` is the human-readable counterpart.

  The web app loads `manifest.json` first and refuses to enable AI
  features if `vocabHash` or `cardSetVersion` does not match the values
  baked into the bundle at build time. The same check runs at build time
  inside `fetch-model`, so a mismatched pair can't even reach
  `gh-pages`. The `style_presets` block drives the Safe / Balanced /
  Brew buttons (and the Advanced slider when `interpolatable` is true).

### Bonus — upstream validation

- **`LorcastApiCard`** — the *raw* shape returned by `api.lorcast.com`,
  with only the fields we depend on, all permissive. The scraper / build
  step `parse()`s every API response through this; a Lorcast change becomes
  a hard parse error in CI, not a silent runtime bug.

  A small `mapLorcastToCard(api: LorcastApiCard): Card` mapper lives in this
  package because *both* the build step (for `cards.json`) and the scraper
  (for resolving deck card names) need exactly the same mapping.

---

## File layout

```
lorcana-schemas/
├── package.json
├── tsconfig.json
├── tsup.config.ts                 # build to ESM + CJS + .d.ts
├── README.md
├── DESIGN.md
├── CHANGELOG.md                   # required, semver discipline
├── src/
│   ├── index.ts                   # public exports only
│   ├── primitives.ts              # Ink, CardType, Legality
│   ├── card.ts                    # Card schema
│   ├── deck.ts                    # Deck schema
│   ├── tournament.ts              # Tournament schema
│   ├── card-set.ts                # CardSet schema
│   ├── dataset.ts                 # Dataset schema
│   ├── manifest.ts                # ModelManifest schema
│   ├── lorcast.ts                 # LorcastApiCard schema + mapLorcastToCard
│   └── version.ts                 # SCHEMA_VERSION constant (single source)
├── test/
│   ├── card.test.ts
│   ├── deck.test.ts
│   ├── mapLorcastToCard.test.ts
│   └── fixtures/
│       ├── lorcast-card.sample.json
│       ├── deck.sample.json
│       └── tournament.sample.json
├── schemas/                       # generated, committed
│   ├── card.schema.json
│   ├── deck.schema.json
│   ├── tournament.schema.json
│   ├── card-set.schema.json
│   ├── dataset.schema.json
│   └── manifest.schema.json
└── .github/workflows/
    ├── ci.yml
    └── release.yml
```

`schemas/` is committed (not just built) so Python consumers can `git
submodule` or directly fetch the JSON Schemas without an npm install.

---

## Public API

The package exports **only** what consumers should depend on. No internal
helpers leak.

```ts
// @bjorvack/lorcana-schemas
export {
  // enums + tuples
  Ink, InkValues,
  CardType, CardTypeValues,
  Legality, LegalityValues,
  // domain schemas (zod) and inferred types
  Card, type CardT,
  Deck, type DeckT,
  Tournament, type TournamentT,
  CardSet, type CardSetT,
  Dataset, type DatasetT,
  ModelManifest, type ModelManifestT,
  LorcastApiCard, type LorcastApiCardT,
  // helpers
  mapLorcastToCard,
  hashCardSet,        // canonicalises + sha256s a Card[]
  SCHEMA_VERSION,     // string, mirrors package.json version
} from "./..."
```

Naming convention: the zod schema is the unsuffixed export (`Card`), the
inferred TS type is `CardT`. This avoids the common `Card`/`CardSchema`
confusion and keeps call sites readable: `Card.parse(input)` and
`const x: CardT = …`.

---

## Versioning policy

Semantic versioning, with explicit rules so consumers know what to expect:

| Change | Bump |
|---|---|
| Add an optional field | minor |
| Add a new schema | minor |
| Add a value to an enum | **major** (consumers' exhaustiveness checks would silently miss it otherwise) |
| Remove or rename a field | major |
| Tighten a constraint (e.g. `min(0)` → `min(1)`) | major |
| Loosen a constraint | minor |
| Fix the JSON Schema output without changing the zod schema | patch |

`SCHEMA_VERSION` mirrors the package `version`. Every consumer pins a
**caret range** (e.g. `^1.4.0`), and each consumer's CI fails if the major
in its `package.json` does not match the major it actually resolves.

Breaking changes ship a `CHANGELOG.md` entry with a migration note.

---

## Build, test, publish

- **Build:** `tsup` produces ESM, CJS, and `.d.ts`. JSON Schemas are
  generated by a small `scripts/build-json-schemas.ts` using
  [`zod-to-json-schema`](https://github.com/StefanTerdell/zod-to-json-schema)
  and written to `schemas/`.
- **Test:** [`vitest`](https://vitest.dev). Fixtures cover:
  - every domain schema parses a known-good sample,
  - rejection paths (missing field, wrong type, invalid enum value),
  - `mapLorcastToCard` round-trips a stored Lorcast response into a `Card`
    that revalidates,
  - `hashCardSet` is stable across two runs and stable under array
    reordering (canonicalisation is correct).
- **Publish:** GitHub Packages (`@bjorvack` scope). Tagging `v1.4.0`
  triggers `release.yml`, which:
  1. Runs `ci.yml` (lint, typecheck, test, build).
  2. Diffs `schemas/` against the previous tag and fails if the diff
     contradicts the bump (a major bump is required when any field is
     removed; enforced by a tiny `scripts/check-bump.ts`).
  3. Publishes the npm package.
  4. Creates a GitHub Release with the contents of `schemas/` attached as
     `lorcana-schemas-<version>.tar.gz`, so Python consumers can pin by
     URL without depending on npm.

## CI

`ci.yml` runs on every PR and push to `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint` (eslint + prettier --check)
3. `pnpm typecheck` (`tsc --noEmit`)
4. `pnpm test`
5. `pnpm build`
6. `pnpm build:schemas` and `git diff --exit-code schemas/` — fails if the
   committed JSON Schemas are out of sync with the zod source.

No deploy / publish from `ci.yml`. Publishing is gated on a tag, in
`release.yml`.

---

## Consumer integration

### TypeScript consumers (`lorcana-scraper`, `lorcana-web`)

```ts
import { Card, type CardT } from "@bjorvack/lorcana-schemas";

const parsed: CardT = Card.parse(unknownInput);
```

Each consumer pins `"^1.4.0"` in `package.json`. A small assertion at app
startup compares `SCHEMA_VERSION.split(".")[0]` with the major the consumer
was developed against; a mismatch is a hard fail with a clear message.

### Python consumer (`lorcana-training`)

A make target inside the training repo runs:

```bash
datamodel-codegen \
  --input schemas/ \
  --input-file-type jsonschema \
  --output src/lorcana_training/schemas/ \
  --output-model-type pydantic_v2.BaseModel
```

The fetched schemas are cached under `schemas/` in the training repo,
checked in, and refreshed via a scheduled "bump schemas" PR. The training
code never declares its own dataclasses — it imports from the generated
module.

---

## Open questions to resolve before implementing

1. **Card identity.** Lorcast's `id` is the obvious primary key. Do we
   ever need a stable identity *across* reprints (same illustration, same
   text, different set)? The current project uses `title = name + version`
   informally. Proposed: keep `id` as the primary key everywhere and add a
   derived `printingId` (= `setCode + cardNumber`) only if a consumer
   needs it.
2. **`computeMaxCopies`.** The default per-card copy cap is 4, but card
   text can override it in three observed ways:
   - "You may have up to N copies of [name] in your deck." (raises to N)
   - "You may have any number of cards named [name] in your deck."
     (`Number.POSITIVE_INFINITY`; the consumer treats this as "no cap")
   - "You may only have N copies of [name] in your deck." (lowers to N,
     typically 1)

   This is a derivation, not data, but it's used by *both* the training
   pipeline (label masking, dataset filtering) and the web app
   (deck-building UI, `isTournamentLegal`).

   Decision: ship it as a named export from this package so it cannot
   drift between consumers:
   ```ts
   export function computeMaxCopies(card: CardT): number;
   ```
   Returns `4` by default, `N` for explicit raises/lowers, and
   `Number.POSITIVE_INFINITY` for "any number". The regexes used to
   detect the three forms are unit-tested against fixtures from each
   real card that carries the wording. If Lorcast introduces a fourth
   wording, that test fails before anything ships.

   The Python side gets the same logic via a tiny `compute_max_copies.py`
   module in `lorcana-training` that mirrors the regexes, with a
   shared fixture file (`fixtures/max-copies-cards.json`) checked in
   here that *both* sides run their implementation against in CI.
3. **Locations.** Locations have `moveCost` instead of `strength` /
   `willpower` semantics. The schema currently models all three as
   `number | null`; we could split `Card` into a discriminated union by
   `type`. Proposed: keep the flat shape (simpler for ML featurization)
   and document the per-type field presence in this design doc.
4. **Schema version vs. package version.** Should `SCHEMA_VERSION` be the
   full semver string or just the major? Proposed: full string, but
   consumers compare majors.
5. **Dataset format.** `Dataset.tournaments` could grow large. Worth
   streaming as NDJSON inside the tarball instead of one big JSON?
   Proposed: keep it as one JSON for v1; revisit if the file exceeds
   ~50 MB.

These are the only places I'd expect debate. Resolving them locks the v1
shape and unblocks everything downstream.
