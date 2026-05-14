// Primitives
export { Ink, InkValues, type InkT } from "./primitives.js";
export { CardType, CardTypeValues, type CardTypeT } from "./primitives.js";
export { Legality, LegalityValues, type LegalityT } from "./primitives.js";
export { Rarity, RarityValues, type RarityT } from "./primitives.js";

// Domain schemas
export { Card, type CardT } from "./card.js";
export { Deck, type DeckT } from "./deck.js";
export { Tournament, type TournamentT } from "./tournament.js";
export { CardSet, type CardSetT, hashCardSet } from "./card-set.js";
export { Dataset, type DatasetT } from "./dataset.js";
export { ModelManifest, type ModelManifestT } from "./manifest.js";

// Upstream validation
export { LorcastApiCard, type LorcastApiCardT, mapLorcastToCard } from "./lorcast.js";

// Format / banlist / rotation
export {
  Banlist,
  BanlistEntry,
  FormatName,
  FormatNameValues,
  resolveBanlist,
  type BanlistEntryT,
  type BanlistT,
  type FormatNameT,
} from "./banlist.js";
export {
  Rotation,
  RotationBlock,
  coreLegalSetCodes,
  type RotationBlockT,
  type RotationT,
} from "./rotation.js";
export { computeLegality, computeLegalityFast, type LegalityStatus } from "./legality.js";

// Helpers
export { computeMaxCopies, isTournamentLegal } from "./max-copies.js";

// Versioning
export { SCHEMA_VERSION } from "./version.js";
