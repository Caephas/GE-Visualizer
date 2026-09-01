import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenomeStrip } from "./GenomeStrip";

describe("GenomeStrip", () => {
  it("renders codons with indices and highlights the active one", () => {
    render(
      <GenomeStrip
        genome={[42, 7, 13]}
        bitsPerCodon={8}
        activeCodonIndex={1}
        activeConsumed={true}
        onGenerate={() => undefined}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7").parentElement).toHaveClass("is-active");
    expect(screen.getByText("13").parentElement).not.toHaveClass("is-active");
  });

  it("toggles to a binary view", () => {
    render(
      <GenomeStrip
        genome={[5]}
        bitsPerCodon={4}
        activeCodonIndex={null}
        activeConsumed={null}
        onGenerate={() => undefined}
      />,
    );
    fireEvent.click(screen.getByLabelText("Binary view"));
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getAllByText("1")).toHaveLength(2);
  });

  it("fires the generate callback", () => {
    const onGenerate = vi.fn();
    render(
      <GenomeStrip
        genome={[]}
        bitsPerCodon={8}
        activeCodonIndex={null}
        activeConsumed={null}
        onGenerate={onGenerate}
      />,
    );
    fireEvent.click(screen.getByText("Generate genome"));
    expect(onGenerate).toHaveBeenCalledOnce();
  });
});
