import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Controls } from "./Controls";

function renderControls(overrides: Partial<Parameters<typeof Controls>[0]> = {}) {
  const props = {
    hasResult: true,
    currentStep: 2,
    totalSteps: 5,
    error: null,
    playing: false,
    speed: 2,
    consumption: "eager" as const,
    onStepBack: vi.fn(),
    onStepForward: vi.fn(),
    onStepLast: vi.fn(),
    onJump: vi.fn(),
    onReset: vi.fn(),
    onTogglePlay: vi.fn(),
    onSpeedChange: vi.fn(),
    ...overrides,
  };
  render(<Controls {...props} />);
  return props;
}

describe("Controls", () => {
  it("steps with arrow keys", () => {
    const props = renderControls();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(props.onStepForward).toHaveBeenCalledOnce();
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(props.onStepBack).toHaveBeenCalledOnce();
  });

  it("toggles play with space but ignores typing in inputs", () => {
    const props = renderControls();
    fireEvent.keyDown(document.body, { key: " " });
    expect(props.onTogglePlay).toHaveBeenCalledOnce();

    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: " " });
    expect(props.onTogglePlay).toHaveBeenCalledOnce();
    input.remove();
  });

  it("jumps home and to the last step", () => {
    const props = renderControls();
    fireEvent.keyDown(document.body, { key: "Home" });
    expect(props.onReset).toHaveBeenCalledOnce();
    fireEvent.keyDown(document.body, { key: "End" });
    expect(props.onStepLast).toHaveBeenCalledOnce();
  });


});
