import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HelpPanel } from "./HelpPanel";

describe("HelpPanel", () => {
  it("renders the guide when open", () => {
    render(<HelpPanel open onClose={vi.fn()} />);
    expect(screen.getByText("Using the visualizer")).toBeInTheDocument();
    expect(screen.getByText(/Apply grammar & map/)).toBeInTheDocument();
    expect(screen.getByText(/How deep the derivation tree may grow/)).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(<HelpPanel open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Using the visualizer")).not.toBeInTheDocument();
  });

  it("closes via the close button and Escape", () => {
    const onClose = vi.fn();
    render(<HelpPanel open onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close guide"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
