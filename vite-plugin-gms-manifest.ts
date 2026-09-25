import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

import { BPM_TARGET_MANIFEST } from './src/features/bpm/gms-targets';

/**
 * Emit each tool's GMS stable-target manifest at build time.
 *
 * `gms_register_targets` on the backend needs a JSON file describing which controls this
 * build actually renders. Declaring the targets in TypeScript is what makes the keys
 * type-checked and makes deleting an instrumented component a `tsc` error — but a
 * declaration nothing emits is just a comment, which is exactly what it was until this
 * plugin existed.
 *
 * The manifest is imported from the same module the components import, so the file that
 * gets posted and the keys that get rendered cannot disagree.
 *
 * ## Compatibility version
 *
 * `<ISO date>+<short git sha>`, e.g. `2026-09-27+a1b2c3d`. It has to change whenever the
 * rendered controls could have changed, because the backend disables any published
 * walkthrough whose targets are missing from the newly registered version. The git sha
 * is the honest answer to "which build is this"; the date is there so a human reading a
 * `disabled_reason` can tell at a glance when it happened.
 *
 * Outside a git checkout the sha falls back to a timestamp, which is worse but still
 * monotonic — better than a constant, which would let two different builds claim to be
 * the same deployed version.
 */

/** One tool's manifest, as `gms_register_targets` expects it. */
interface ToolManifest {
  tool_key: string;
  compatibility_version: string;
  targets: ReadonlyArray<{
    target_key: string;
    target_type: string;
    permission_key: string;
  }>;
}

/** Every tool that declares stable targets. Add a tool here when it gains a manifest. */
const TOOLS: ReadonlyArray<{ toolKey: string; targets: ToolManifest['targets'] }> = [
  { toolKey: 'bpm', targets: BPM_TARGET_MANIFEST },
];

function compatibilityVersion(): string {
  const date = new Date().toISOString().slice(0, 10);
  try {
    const sha = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return `${date}+${sha}`;
  } catch {
    // Not a git checkout (a container build from a tarball, say). A timestamp is a
    // poorer identifier but still distinguishes two builds, which a constant would not.
    return `${date}+${Date.now()}`;
  }
}

export function gmsManifestPlugin(): Plugin {
  return {
    name: 'gms-target-manifest',
    apply: 'build',
    closeBundle() {
      const version = compatibilityVersion();
      const outDir = path.resolve(__dirname, 'build');
      mkdirSync(outDir, { recursive: true });

      for (const { toolKey, targets } of TOOLS) {
        const manifest: ToolManifest = {
          tool_key: toolKey,
          compatibility_version: version,
          targets,
        };
        const file = path.join(outDir, `gms-targets.${toolKey}.json`);
        writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
        // Logged so a deploy that forgets to post it is at least visible in the build
        // output — the backend's fallback is to disable walkthroughs, not to guess.
        console.log(
          `[gms] wrote ${path.relative(process.cwd(), file)} ` +
            `(${targets.length} targets, version ${version})`
        );
      }
    },
  };
}
