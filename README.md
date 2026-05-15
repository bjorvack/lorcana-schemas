# @bjorvack/lorcana-schemas

Single source of truth for the data types that flow between every other
repo in the Lorcana deckbuilder ecosystem. Versioned with semver, published
to GitHub Packages, consumed both as a TypeScript library and as JSON
Schemas (so Python code in [`lorcana-training`](https://github.com/bjorvack/lorcana-training)
gets auto-generated `pydantic` models from the same source).

| Repo                                                               | Role                | Reads schemas as                                |
| ------------------------------------------------------------------ | ------------------- | ----------------------------------------------- |
| [`lorcana-scraper`](https://github.com/bjorvack/lorcana-scraper)   | producer            | TypeScript (`zod`)                              |
| [`lorcana-training`](https://github.com/bjorvack/lorcana-training) | producer + consumer | Python (`pydantic`, generated from JSON Schema) |
| [`lorcana-web`](https://github.com/bjorvack/lorcana-web)           | consumer            | TypeScript                                      |

See [`DESIGN.md`](./DESIGN.md) for the full type spec and rationale.

## Install

```bash
pnpm add @bjorvack/lorcana-schemas
```

## Use (TypeScript)

```ts
import { Card, type CardT, computeMaxCopies, isTournamentLegal } from "@bjorvack/lorcana-schemas";

const card: CardT = Card.parse(unknownInput);
const cap = computeMaxCopies(card); // 4 (or 1 for legendaries with the keyword)
const legal = isTournamentLegal(card, "Core Constructed");
```

The package re-exports both `zod` schemas (suffix-less) and the inferred
TypeScript types (`T` suffix), plus pure functions for the rules-derived
predicates that don't belong on a particular consumer.

## Use (Python via JSON Schema)

The build emits one JSON Schema per type to `schemas/` and pins them to
the package version. `lorcana-training` runs `datamodel-code-generator`
against `schemas/*.schema.json` to keep `pydantic` models in lock-step.

```python
# In lorcana-training
from lorcana_training.schemas.generated import Dataset
ds = Dataset.model_validate_json(open("dataset.json").read())
```

## Type surface (high level)

| Module          | Exports                                    | Notes                                                                                                 |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `card.ts`       | `Card`, `CardT`                            | Reified Lorcana card. Uses Lorcast naming.                                                            |
| `card-set.ts`   | `CardSet`, `CardSetT`                      | Versioned card pool, output of `cards-vN`.                                                            |
| `deck.ts`       | `Deck`, `DeckT`                            | Validated 60-card deck. Includes `externalKey` (sha256 of source+url) for stable deck-level identity. |
| `tournament.ts` | `Tournament`, `TournamentT`                | A scraped event with its decks. Includes `externalKey`.                                               |
| `dataset.ts`    | `Dataset`, `DatasetT`                      | Top-level `tournaments-vN` artifact.                                                                  |
| `legality.ts`   | `Banlist`, `Rotation`, `isTournamentLegal` | Format-aware legality logic.                                                                          |
| `max-copies.ts` | `computeMaxCopies`                         | Per-card copy cap (4 default, 1 for `Legendary`-keyword cards in legacy formats).                     |
| `manifest.ts`   | `Manifest`                                 | Wraps a release artifact with provenance metadata.                                                    |

## Develop

Same checklist as every other repo — see [`AGENTS.md`](./AGENTS.md) for
the full pre-commit rule.

```bash
pnpm install
pnpm lint        # eslint + prettier --check
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run
pnpm build:schemas   # regenerate JSON Schemas after editing types
```

## Release flow

1. Edit `src/*.ts`. Bump `package.json` `"version"` (`pnpm check:bump`
   guards against forgotten bumps).
2. `pnpm build:schemas` to regenerate JSON Schemas. Commit the diff.
3. Tag `vX.Y.Z` and push. The
   [release workflow](.github/workflows/release.yml) builds + publishes
   to GitHub Packages and attaches `*.schema.json` to the GitHub release.
4. Downstream repos bump their `@bjorvack/lorcana-schemas` dep to
   `X.Y.Z`. `lorcana-training` additionally bumps `schemas_release_tag`
   in `pyproject.toml` and re-runs codegen.
