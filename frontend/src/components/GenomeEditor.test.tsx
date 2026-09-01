import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenomeEditor } from "./GenomeEditor";

function renderEditor(overrides: Partial<Parameters<typeof GenomeEditor>[0]> = {}) {
  const props = {
    genome: [42, 7],
    bitsPerCodon: 8,
    activeCodonIndex: null,
    activeConsumed: null,
    activeWraps: 0,
    onChange: vi.fn(),
    onAutoMap: vi.fn(),
    onGenerate: vi.fn(),
    ...overrides,
  };
  render(<GenomeEditor {...props} />);
  return props;
}

describe("GenomeEditor", () => {
  it("commits codon edits", () => {
    const props = renderEditor();
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "43" } });
    expect(props.onChange).toHaveBeenCalledWith([43, 7]);
    expect(props.onAutoMap).toHaveBeenCalledWith([43, 7]);
  });

  it("ignores invalid codon edits", () => {
    const props = renderEditor();
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[1], { target: { value: "-5" } });
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it("edits bits and converts back to codons", () => {
    const props = renderEditor({ genome: [5], bitsPerCodon: 4 });
    fireEvent.click(screen.getByLabelText("Binary view"));
    const bitButtons = screen
      .getAllByRole("button")
      .filter((button) => button.textContent === "0" || button.textContent === "1");
    fireEvent.click(bitButtons[0]); // bits [0,1,0,1] -> [1,1,0,1] -> 13
    expect(props.onChange).toHaveBeenCalledWith([13]);
    expect(props.onAutoMap).toHaveBeenCalledWith([13]);
  });

  it("fires the generate callback", () => {
    const props = renderEditor();
    fireEvent.click(screen.getByText("Generate genome"));
    expect(props.onGenerate).toHaveBeenCalledOnce();
  });

  it("marks the active codon", () => {
    renderEditor({ activeCodonIndex: 1, activeConsumed: true });
    expect(screen.getByLabelText("Codon 1").parentElement).toHaveClass("is-active");
  });
});
