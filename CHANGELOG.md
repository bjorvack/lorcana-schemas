# Changelog

All notable changes to `@bjorvack/lorcana-schemas` are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0]

### Added

- `Tournament.externalKey` (optional) — stable hash that identifies a
  tournament within its source. Conventionally
  `sha256(sourceName|sourceUrl)`. Lets downstream consumers (training,
  web) skip already-processed tournaments without recomputing the key
  themselves.
- `Deck.externalKey` (optional) — same idea at the deck level.
  Conventionally `sha256(sourceName|externalUrl ?? source-specific id)`.
- `Deck.externalUrl` (optional) — direct URL to the deck on the source
  site, mirroring `Tournament.sourceUrl`.

All three fields are optional, so 0.6.x datasets still parse against
the 0.7 schema unchanged.

## [0.6.0]

### Added

- `Rarity` enum + `Card.rarity` (nullable for older promos with no
  rarity in the upstream API).
- `Card.setName` — human-readable set name alongside the existing
  `setCode`, so the UI can label a row "Azurite Sea" instead of "6".
- `Card.collectorNumber` — printed collector number as a string,
  preserves the letter-suffixed promo numbers (`001a`) that the
  integer `cardNumber` can't represent.
- `Card.illustrators` — array of artist credits.
- `Card.releasedAt` — ISO date string, present on most modern
  printings.
- `Card.tcgplayerId` — TCGPlayer product id for "buy" deep-links.

These were all available on the Lorcast upstream and previously
discarded by the scraper.

## [0.5.0]

### Added

- `Banlist` and `Rotation` schemas + JSON-Schema sidecars. Both are
  shipped as separate JSON files in the `cards-vN` release rather than
  baked into each `Card`, so a banlist refresh doesn't force a card
  re-bake.
- `FormatName` enum (`core_constructed | infinity_constructed`).
- `resolveBanlist(banlist, cards, format)` and `coreLegalSetCodes(rotation, asOf)`
  helpers.
- `computeLegality(card, banlist, rotation, format, asOf)` /
  `computeLegalityFast(card, bannedIds, ...)` — the format-aware
  successor to the per-card `Card.legality` enum. Returns one of
  `legal | banned | rotated_out | not_yet_released`.

### Changed

- `isTournamentLegal(deck, cards, opts?)` grows an optional `opts`
  argument carrying `banlist`, `rotation`, `format`, and `asOf`. With
  no opts the function behaves bit-for-bit like `v0.4` (treats only
  upstream-flagged `banned` / `not_legal` cards as illegal), so
  existing consumers don't break.

## [0.4.0]

- `LorcastApiCard.image_uris.digital.{small,normal,large}` no longer require
  `.url()`. Lorcast emits `""` for missing variants on some Challenge Promo
  cards. `mapLorcastToCard` now picks the first non-empty URL across
  large → normal → small; the output `Card` schema still enforces a real URL.

## [0.3.0]

- `LorcastApiCard.classifications` and `.keywords` now accept `null` (Lorcast
  emits `classifications: null` on cards without subtypes, e.g. most
  Actions/Songs/Items). Verified against set 1 where 55 of 216 cards carry
  `classifications: null`.

## [0.2.0]

- `LorcastApiCard.inks` now accepts `null` (Lorcast emits `inks: null` on
  single-ink cards alongside `ink: "<color>"`).
- `mapLorcastToCard` documents the two Lorcast ink encodings inline and
  treats an empty `inks` array as "missing".

## [0.1.0] - Initial draft

- Initial public surface: `Ink`, `CardType`, `Legality`, `Card`, `Deck`,
  `Tournament`, `CardSet`, `Dataset`, `ModelManifest`, `LorcastApiCard`.
- Helpers: `mapLorcastToCard`, `hashCardSet`, `computeMaxCopies`,
  `isTournamentLegal`.
- `SCHEMA_VERSION` constant mirrors the package version.
