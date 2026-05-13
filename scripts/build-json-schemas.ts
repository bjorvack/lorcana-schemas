import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";

import { Card } from "../src/card.js";
import { Deck } from "../src/deck.js";
import { Tournament } from "../src/tournament.js";
import { CardSet } from "../src/card-set.js";
import { Dataset } from "../src/dataset.js";
import { ModelManifest } from "../src/manifest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "schemas");
mkdirSync(outDir, { recursive: true });

const targets = [
  { name: "card", schema: Card },
  { name: "deck", schema: Deck },
  { name: "tournament", schema: Tournament },
  { name: "card-set", schema: CardSet },
  { name: "dataset", schema: Dataset },
  { name: "manifest", schema: ModelManifest },
];

for (const { name, schema } of targets) {
  const json = zodToJsonSchema(schema, {
    name,
    target: "jsonSchema7",
    $refStrategy: "none",
  });
  const path = resolve(outDir, `${name}.schema.json`);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`wrote ${path}`);
}
