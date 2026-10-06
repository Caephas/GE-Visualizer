import { layoutTree, NODE_HEIGHT, NODE_WIDTH } from "./derivation";
import type { DerivationNode, TraceStep } from "../types";

// Defaults for the styles.css palette, used when the live theme isn't
// available (tests) — see treeThemeColors().
const FALLBACK_COLORS = {
  surface: "#f6faf3",
  surfaceWarm: "#d9e6d2",
  feature: "#cfe4c3",
  ink: "#16211a",
  line: "#c6d1c1",
};

function cssColor(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * The live theme colours, read from the CSS custom properties so an exported
 * SVG always matches the app's theme.
 */
export function treeThemeColors() {
  return {
    surface: cssColor("--surface", FALLBACK_COLORS.surface),
    surfaceWarm: cssColor("--surface-warm", FALLBACK_COLORS.surfaceWarm),
    feature: cssColor("--feature", FALLBACK_COLORS.feature),
    ink: cssColor("--ink", FALLBACK_COLORS.ink),
    line: cssColor("--line", FALLBACK_COLORS.line),
  };
}

const FONT_STACK =
  "JetBrains Mono, ui-monospace, SF Mono, Menlo, Consolas, monospace";

const MAX_LABEL = 10;

export interface TreeSvgOptions {
  /** Step to ring as active, matching the on-screen highlight. */
  activeStep?: number | null;
  /** Background fill; pass null for a transparent SVG. */
  background?: string | null;
  title?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function shortLabel(label: string): string {
  return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label;
}

/**
 * Renders the whole derivation tree as a standalone SVG (its own dimensions and
 * inlined colours), independent of the current pan/zoom or panel size. This is
 * what people want for a figure: the complete tree, not the visible viewport.
 */
export function treeToSvg(root: DerivationNode, options: TreeSvgOptions = {}): string {
  const layout = layoutTree(root);
  const color = treeThemeColors();
  const width = Math.max(1, Math.ceil(layout.width));
  const height = Math.max(1, Math.ceil(layout.height));
  const activeStep = options.activeStep ?? null;
  const background = options.background === undefined ? color.surface : options.background;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}" font-family="${FONT_STACK}">`,
  );
  parts.push(`<title>${escapeXml(options.title ?? "GE derivation tree")}</title>`);
  if (background) {
    parts.push(`<rect width="${width}" height="${height}" fill="${background}"/>`);
  }

  for (const edge of layout.edges) {
    const midY = (edge.y1 + edge.y2) / 2;
    parts.push(
      `<path d="M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY}, ${edge.x2} ${midY}, ${edge.x2} ${edge.y2}" ` +
        `fill="none" stroke="${color.line}" stroke-width="1"/>`,
    );
  }

  for (const { node, x, y } of layout.nodes) {
    const fill =
      node.kind === "root" ? color.ink : node.kind === "terminal" ? color.feature : color.surfaceWarm;
    const labelFill = node.kind === "root" ? color.surface : color.ink;
    const active = node.step !== null && node.step === activeStep;
    const stroke = active ? ` stroke="${color.ink}" stroke-width="2"` : "";

    parts.push(`<g>`);
    parts.push(`<title>${escapeXml(node.label)}</title>`);
    parts.push(
      `<rect x="${x - NODE_WIDTH / 2}" y="${y - NODE_HEIGHT / 2}" width="${NODE_WIDTH}" ` +
        `height="${NODE_HEIGHT}" rx="8" fill="${fill}"${stroke}/>`,
    );
    parts.push(
      `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" fill="${labelFill}">` +
        `${escapeXml(shortLabel(node.label))}</text>`,
    );
    parts.push(`</g>`);
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

/** A human-readable, step-by-step record of how the tree was constructed. */
export function traceToText(trace: TraceStep[], title = "GE Visualizer — derivation"): string {
  const lines: string[] = [title, ""];

  if (trace.length === 0) {
    lines.push("No steps yet.");
    return `${lines.join("\n")}\n`;
  }

  const last = trace[trace.length - 1];
  lines.push(`Start rule:    ${trace[0].non_terminal}`);
  lines.push(`Steps:         ${trace.length}`);
  lines.push(`Status:        ${last.complete ? "complete" : "incomplete"}`);
  lines.push(`Phenotype:     ${last.partial_phenotype}`);
  lines.push("");

  for (const step of trace) {
    const pick = step.consumed
      ? `genome[${step.codon_index}] = ${step.codon_value}  ·  ${step.codon_value} % ${step.rule_count} → choice ${step.choice}`
      : "no codon consumed (single production)";
    lines.push(`Step ${step.step}: ${step.non_terminal}`);
    lines.push(`        ${pick}`);
    lines.push(`        ⇒ ${step.expansion}`);
  }

  return `${lines.join("\n")}\n`;
}

const CSV_COLUMNS: Array<keyof TraceStep> = [
  "step",
  "non_terminal",
  "codon_index",
  "codon_value",
  "rule_count",
  "choice",
  "consumed",
  "depth",
  "wraps",
  "expansion",
  "partial_phenotype",
];

function csvCell(value: unknown): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The raw trace as CSV, for spreadsheets or further analysis. */
export function traceToCsv(trace: TraceStep[]): string {
  const rows = [CSV_COLUMNS.join(",")];
  for (const step of trace) {
    rows.push(CSV_COLUMNS.map((column) => csvCell(step[column])).join(","));
  }
  return `${rows.join("\n")}\n`;
}

/** Triggers a browser download for a Blob. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Rasterises a standalone SVG string to a PNG Blob at the given scale. */
export function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    const element = parsed.documentElement;
    const width = Number(element.getAttribute("width")) || 600;
    const height = Number(element.getAttribute("height")) || 400;

    const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(width * scale);
        canvas.height = Math.ceil(height * scale);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not create a 2D canvas.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not encode the tree as PNG."));
        }, "image/png");
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("Could not rasterise the tree."));
    };
    image.src = svgUrl;
  });
}
