import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Resizer } from "./Resizer";

describe("Resizer", () => {
  it("resizes by dragging and clamps to the limits", () => {
    const onChange = vi.fn();
    render(
      <Resizer
        orientation="vertical"
        value={340}
        onChange={onChange}
        min={240}
        max={640}
        label="Resize the grammar panel"
      />,
    );
    const bar = screen.getByRole("separator", { name: "Resize the grammar panel" });

    fireEvent.pointerDown(bar, { pointerId: 1, clientX: 500, button: 0 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 560 });
    expect(onChange).toHaveBeenLastCalledWith(400);

    // Dragging far past the limit clamps rather than collapsing the panel.
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 3000 });
    expect(onChange).toHaveBeenLastCalledWith(640);
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: -3000 });
    expect(onChange).toHaveBeenLastCalledWith(240);

    fireEvent.pointerUp(bar, { pointerId: 1 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 900 });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("resizes with the arrow keys", () => {
    const onChange = vi.fn();
    render(
      <Resizer
        orientation="horizontal"
        value={400}
        onChange={onChange}
        min={220}
        max={1200}
        label="Resize the derivation tree"
      />,
    );
    const bar = screen.getByRole("separator", { name: "Resize the derivation tree" });

    fireEvent.keyDown(bar, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(410);
    fireEvent.keyDown(bar, { key: "ArrowUp", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(360);
  });
});
