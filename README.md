# @bjorvack/lorcana-schemas

Single source of truth for the data types that flow between
[`lorcana-scraper`](https://github.com/bjorvack/lorcana-scraper),
[`lorcana-training`](https://github.com/bjorvack/lorcana-training), and
[`lorcana-web`](https://github.com/bjorvack/lorcana-web).

See [`DESIGN.md`](./DESIGN.md) for the full spec.

## Install

```bash
pnpm add @bjorvack/lorcana-schemas
```

## Use

```ts
import { Card, type CardT, computeMaxCopies, isTournamentLegal } from "@bjorvack/lorcana-schemas";

const card: CardT = Card.parse(unknownInput);
const cap = computeMaxCopies(card);
```

Python consumers generate `pydantic` models from the JSON Schemas in
`schemas/`.

## Develop

```bash
pnpm install
pnpm test
pnpm build
pnpm build:schemas
```
