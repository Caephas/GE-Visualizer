/** Composes the feedback report that is sent to a GitHub issue or clipboard. */

const MAX_URL_LENGTH = 1800;

export type FeedbackKind = "bug" | "idea" | "other";

export const FEEDBACK_KINDS: Array<{ id: FeedbackKind; label: string }> = [
  { id: "bug", label: "Something is broken" },
  { id: "idea", label: "An idea or improvement" },
  { id: "other", label: "Something else" },
];

export interface FeedbackDiagnostics {
  url: string;
  grammarStatus: string;
  rules: number | null;
  mappingStatus: string;
  steps: number;
  userAgent: string;
  timestamp: string;
}

/** The context block appended to every report, so a report is reproducible. */
export function formatDiagnostics(diagnostics: FeedbackDiagnostics): string {
  const url =
    diagnostics.url.length > MAX_URL_LENGTH
      ? `${diagnostics.url.slice(0, MAX_URL_LENGTH)}… (URL truncated — use “Copy report” to share it in full)`
      : diagnostics.url;

  return [
    "---",
    "**Diagnostics**",
    `- Grammar: ${diagnostics.grammarStatus}${
      diagnostics.rules === null ? "" : ` (${diagnostics.rules} rules)`
    }`,
    `- Mapping: ${diagnostics.mappingStatus} · ${diagnostics.steps} step(s)`,
    `- URL: ${url}`,
    `- Browser: ${diagnostics.userAgent}`,
    `- When: ${diagnostics.timestamp}`,
  ].join("\n");
}

export function buildFeedbackBody(message: string, diagnostics: FeedbackDiagnostics): string {
  const trimmed = message.trim();
  return `${trimmed || "(no description provided)"}\n\n${formatDiagnostics(diagnostics)}\n`;
}

export function buildFeedbackTitle(kind: FeedbackKind, message: string): string {
  const label = kind === "bug" ? "Bug" : kind === "idea" ? "Idea" : "Feedback";
  const firstLine = message.trim().split("\n")[0]?.slice(0, 80) ?? "";
  return firstLine ? `[${label}] ${firstLine}` : `[${label}] GE Visualizer feedback`;
}

export function buildIssueUrl(base: string, title: string, body: string): string {
  const params = new URLSearchParams({ title, body });
  return `${base}?${params.toString()}`;
}
