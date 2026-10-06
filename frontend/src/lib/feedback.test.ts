import { describe, expect, it } from "vitest";

import {
  buildFeedbackBody,
  buildFeedbackTitle,
  buildIssueUrl,
  formatDiagnostics,
  type FeedbackDiagnostics,
} from "./feedback";

const DIAGNOSTICS: FeedbackDiagnostics = {
  url: "http://localhost:5173/?grammar=%3Cstart%3E&genome=1,2",
  grammarStatus: "valid",
  rules: 4,
  mappingStatus: "complete",
  steps: 7,
  userAgent: "TestAgent/1.0",
  timestamp: "2026-01-01T00:00:00.000Z",
};

describe("formatDiagnostics", () => {
  it("summarises the app state", () => {
    const text = formatDiagnostics(DIAGNOSTICS);
    expect(text).toContain("- Grammar: valid (4 rules)");
    expect(text).toContain("- Mapping: complete · 7 step(s)");
    expect(text).toContain(`- URL: ${DIAGNOSTICS.url}`);
    expect(text).toContain("- Browser: TestAgent/1.0");
  });

  it("truncates a very long shared URL", () => {
    const text = formatDiagnostics({ ...DIAGNOSTICS, url: "x".repeat(5000) });
    expect(text).toContain("URL truncated");
    expect(text.length).toBeLessThan(3000);
  });

  it("handles a missing rule count", () => {
    expect(formatDiagnostics({ ...DIAGNOSTICS, rules: null })).toContain("- Grammar: valid\n");
  });
});

describe("buildFeedbackBody", () => {
  it("puts the message first and appends diagnostics", () => {
    const body = buildFeedbackBody("  the tree looks wrong  ", DIAGNOSTICS);
    expect(body.startsWith("the tree looks wrong")).toBe(true);
    expect(body).toContain("**Diagnostics**");
  });

  it("falls back when the message is empty", () => {
    expect(buildFeedbackBody("   ", DIAGNOSTICS)).toContain("(no description provided)");
  });
});

describe("buildFeedbackTitle", () => {
  it("labels the kind and uses the first line", () => {
    expect(buildFeedbackTitle("bug", "Crash on load\nmore detail")).toBe("[Bug] Crash on load");
    expect(buildFeedbackTitle("idea", "Add GIF export")).toBe("[Idea] Add GIF export");
    expect(buildFeedbackTitle("other", "")).toBe("[Feedback] GE Visualizer feedback");
  });
});

describe("buildIssueUrl", () => {
  it("encodes the title and body", () => {
    const url = buildIssueUrl("https://example.com/issues/new", "A & B", "line1\nline2");
    expect(url.startsWith("https://example.com/issues/new?")).toBe(true);
    expect(url).toContain("title=A+%26+B");
    expect(url).toContain("body=line1%0Aline2");
  });
});
