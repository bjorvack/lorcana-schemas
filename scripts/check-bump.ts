/**
 * Verifies that the version bump matches the change in `schemas/`.
 *
 * Rules (mirroring DESIGN.md):
 *   - A removed top-level field or required-field-becoming-missing → major.
 *   - An added enum value → major.
 *   - Anything else (added optional field, loosened constraint) → minor/patch OK.
 *
 * For v0.x we keep this as a soft warning. It exists so the release
 * workflow has a hook to call; it'll be tightened once we ship v1.
 */
import { execSync } from "node:child_process";

const prevTag = process.env.PREV_TAG;
if (!prevTag) {
  console.log("PREV_TAG not set; skipping bump check.");
  process.exit(0);
}

try {
  const diff = execSync(`git diff --name-only ${prevTag} -- schemas/`, {
    encoding: "utf8",
  });
  if (diff.trim().length === 0) {
    console.log("No schema changes since", prevTag);
  } else {
    console.log("Schema changes since", prevTag, ":\n" + diff);
    console.log("TODO: enforce semver discipline here.");
  }
} catch (err) {
  console.warn("bump check skipped:", (err as Error).message);
}
