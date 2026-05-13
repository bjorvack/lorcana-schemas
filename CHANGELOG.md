# Changelog

All notable changes to `@bjorvack/lorcana-schemas` are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
