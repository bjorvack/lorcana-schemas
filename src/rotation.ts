import { z } from "zod";

/**
 * Disney Lorcana's Core-Constructed rotation calendar. Sets release in
 * yearly blocks; the most recent two blocks (eight sets) are Core-
 * legal, older blocks rotate into Infinity-Constructed only. The
 * schema models the calendar declaratively so consumers can compute
 * rotation status without baking dates into code.
 */
export const RotationBlock = z
  .object({
    name: z.string().min(1), // "Year 1"
    setCodes: z.array(z.string().min(1)).min(1),
    releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
    rotationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  })
  .strict();
export type RotationBlockT = z.infer<typeof RotationBlock>;

export const Rotation = z
  .object({
    generatedAt: z.string().datetime({ offset: true }),
    sourceUrl: z.string().url(),
    schemaVersion: z.string(),
    blocks: z.array(RotationBlock).min(1),
    /**
     * How many months back a block is Core-legal for. lorcana.gg
     * publishes this as a property of the rotation system (24 at
     * time of writing). Stored here rather than derived so a
     * Ravensburger policy change doesn't require code edits.
     */
    coreConstructedCutoffMonths: z.number().int().min(1),
  })
  .strict();
export type RotationT = z.infer<typeof Rotation>;

/**
 * Compute the set of Core-legal set codes for a given date.
 *
 * Logic: a block is Core-legal iff ``rotationDate > asOf``. The
 * cutoff-months field is informational; the per-block ``rotationDate``
 * is what actually drives legality (lorcana.gg publishes the exact
 * dates, and they can drift from a strict cutoff by a few weeks).
 */
export function coreLegalSetCodes(rotation: RotationT, asOf: Date): Set<string> {
  const out = new Set<string>();
  for (const block of rotation.blocks) {
    if (new Date(block.rotationDate) > asOf) {
      for (const code of block.setCodes) out.add(code);
    }
  }
  return out;
}
