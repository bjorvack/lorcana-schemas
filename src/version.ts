/**
 * Mirrors the package.json `version`. Bumped together via the release
 * workflow. Consumers compare the major to the one they were built
 * against; a mismatch is a hard fail at startup.
 */
export const SCHEMA_VERSION = "0.4.0";
