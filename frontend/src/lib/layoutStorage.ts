const KEY = "ge-visualizer.layout";

/** The stacked panels in the main column that can be given a height. */
export type StripId = "controls" | "genome" | "tree" | "phenotype";

export interface LayoutSizes {
  sidebarWidth: number | null;
  strips: Partial<Record<StripId, number>>;
}

export const SIDEBAR_DEFAULT = 340;
export const SIDEBAR_MIN = 240;
export const SIDEBAR_MAX = 640;

export const STRIP_BOUNDS: Record<StripId, { min: number; max: number }> = {
  controls: { min: 44, max: 400 },
  genome: { min: 64, max: 600 },
  tree: { min: 160, max: 1600 },
  phenotype: { min: 60, max: 700 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function readLayout(): LayoutSizes {
  const empty: LayoutSizes = { sidebarWidth: null, strips: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<LayoutSizes>;
    const strips: LayoutSizes["strips"] = {};
    for (const id of Object.keys(STRIP_BOUNDS) as StripId[]) {
      const value = parsed.strips?.[id];
      if (typeof value === "number") {
        strips[id] = clamp(value, STRIP_BOUNDS[id].min, STRIP_BOUNDS[id].max);
      }
    }
    return {
      sidebarWidth:
        typeof parsed.sidebarWidth === "number"
          ? clamp(parsed.sidebarWidth, SIDEBAR_MIN, SIDEBAR_MAX)
          : null,
      strips,
    };
  } catch {
    return empty;
  }
}

export function writeLayout(sizes: LayoutSizes): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sizes));
  } catch {
    // localStorage can be unavailable (private mode); resizing still works.
  }
}
