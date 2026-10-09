import { CUSTOM_FITNESS_TEMPLATE, GROVER_FITNESS } from "../examples/problems";

const KEY = "ge-visualizer.fitness";

/**
 * Bump this whenever a bundled example changes. A visitor who never edited the
 * example picks up the new copy on their next visit; anyone who did edit it
 * keeps their own code.
 */
const EXAMPLE_VERSION = "grover-robust-1";

export type ExampleId = "grover" | "template";

/**
 * FNV-1a fingerprints of bundled-example text shipped by earlier builds. When
 * a legacy stored copy matches one byte-for-byte, it is an unedited example
 * (not the visitor's own code), so it is safe to refresh to the current copy.
 */
const SUPERSEDED_EXAMPLES: Record<string, ExampleId> = {
  // Grover objective from before truncated genomes were scored instead of raised.
  "6bd8c065": "grover",
};

interface StoredFitness {
  source: string;
  example: ExampleId | null;
  version: string | null;
}

export interface StoredFitnessRead {
  source: string;
  /** Which bundled example this came from, or null if the visitor wrote it. */
  example: ExampleId | null;
}

function bundledExample(id: ExampleId): string {
  return id === "grover" ? GROVER_FITNESS : CUSTOM_FITNESS_TEMPLATE;
}

function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/**
 * The custom fitness function is kept on this machine only. It is deliberately
 * kept out of the shareable URL: a link carrying Python would otherwise run
 * someone else's code in your browser.
 */
export function readFitness(): StoredFitnessRead {
  let stored: StoredFitness | null = null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<StoredFitness>;
        if (typeof parsed.source === "string") {
          stored = {
            source: parsed.source,
            example:
              parsed.example === "grover" || parsed.example === "template"
                ? parsed.example
                : null,
            version: typeof parsed.version === "string" ? parsed.version : null,
          };
        }
      } catch {
        // Older builds stored the source as a bare string.
        stored = {
          source: raw,
          example: SUPERSEDED_EXAMPLES[fingerprint(raw)] ?? null,
          version: null,
        };
      }
    }
  } catch {
    // localStorage can be unavailable (private mode); fall back to the default.
  }
  if (!stored) return { source: CUSTOM_FITNESS_TEMPLATE, example: null };
  // A bundled example the visitor never edited is refreshed to the current copy.
  if (stored.example && stored.version !== EXAMPLE_VERSION) {
    return { source: bundledExample(stored.example), example: stored.example };
  }
  return { source: stored.source, example: stored.example };
}

export function readFitnessSource(): string {
  return readFitness().source;
}

export function writeFitnessSource(source: string, example: ExampleId | null = null): void {
  try {
    const payload: StoredFitness = {
      source,
      example,
      version: example ? EXAMPLE_VERSION : null,
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // localStorage can be unavailable (private mode); the editor still works.
  }
}
