import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FeedbackDialog, type FeedbackContext } from "./FeedbackDialog";

const CONTEXT: FeedbackContext = {
  grammarStatus: "valid",
  rules: 4,
  mappingStatus: "complete",
  steps: 7,
};

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  vi.spyOn(window, "open").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  writeText.mockClear();
});

describe("FeedbackDialog", () => {
  it("renders nothing when closed", () => {
    render(<FeedbackDialog open={false} onClose={vi.fn()} context={CONTEXT} />);
    expect(screen.queryByRole("dialog", { name: "Send feedback" })).not.toBeInTheDocument();
  });

  it("shows the current state in the report details", () => {
    render(<FeedbackDialog open onClose={vi.fn()} context={CONTEXT} />);
    expect(screen.getByRole("dialog", { name: "Send feedback" })).toBeInTheDocument();
    expect(screen.getByText(/Mapping: complete · 7 step/)).toBeInTheDocument();
    expect(screen.getByText(/Grammar: valid \(4 rules\)/)).toBeInTheDocument();
  });

  it("opens a prefilled GitHub issue", () => {
    render(<FeedbackDialog open onClose={vi.fn()} context={CONTEXT} />);
    fireEvent.change(screen.getByLabelText("Your message"), {
      target: { value: "The tree is upside down" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open GitHub issue" }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const url = vi.mocked(window.open).mock.calls[0][0] as string;
    expect(url.startsWith("https://github.com/Caephas/GE-Visualizer/issues/new?")).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get("title")).toBe("[Bug] The tree is upside down");
    expect(params.get("body")).toContain("The tree is upside down");
    expect(params.get("body")).toContain("**Diagnostics**");
  });

  it("copies the report to the clipboard", async () => {
    render(<FeedbackDialog open onClose={vi.fn()} context={CONTEXT} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy report" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(String(writeText.mock.calls[0][0])).toContain("**Diagnostics**");
    expect(await screen.findByRole("status")).toHaveTextContent("Copied");
  });

  it("closes with the close button and Escape", () => {
    const onClose = vi.fn();
    render(<FeedbackDialog open onClose={onClose} context={CONTEXT} />);
    fireEvent.click(screen.getByLabelText("Close feedback"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
