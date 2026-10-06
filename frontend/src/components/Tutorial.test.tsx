import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Tutorial } from "./Tutorial";
import type { TutorialStep } from "./tutorialSteps";

const STEPS: TutorialStep[] = [
  { target: null, title: "First", body: "Step one body" },
  { target: ".tour-target", title: "Second", body: "Step two body" },
  { target: null, title: "Third", body: "Step three body" },
];

function setRect({ top = 100, left = 100, width = 200, height = 50 } = {}) {
  Element.prototype.getBoundingClientRect = () =>
    ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element>).getBoundingClientRect;
});

describe("Tutorial", () => {
  it("starts on the first step with Back disabled", () => {
    render(<Tutorial steps={STEPS} onClose={vi.fn()} />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });

  it("advances and goes back", () => {
    render(<Tutorial steps={STEPS} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("finishes on the last step", () => {
    const onClose = vi.fn();
    render(<Tutorial steps={STEPS} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const finish = screen.getByRole("button", { name: "Finish" });
    fireEvent.click(finish);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can be skipped", () => {
    const onClose = vi.fn();
    render(<Tutorial steps={STEPS} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("supports the keyboard", () => {
    const onClose = vi.fn();
    render(<Tutorial steps={STEPS} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("Second")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("First")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("spotlights a target when it is on screen", async () => {
    setRect();
    const target = document.createElement("div");
    target.className = "tour-target";
    document.body.appendChild(target);

    const { container } = render(<Tutorial steps={[STEPS[1]]} onClose={vi.fn()} />);
    await waitFor(() => expect(container.querySelector(".tutorial-spotlight")).toBeTruthy());
  });
});
