import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_PARAMS } from "../state";
import { ParamsPanel } from "./ParamsPanel";

function renderPanel(overrides: Partial<Parameters<typeof ParamsPanel>[0]> = {}) {
  const props = {
    params: DEFAULT_PARAMS,
    genomeLength: 10,
    onChange: vi.fn(),
    onGenomeLengthChange: vi.fn(),
    ...overrides,
  };
  render(<ParamsPanel {...props} />);
  return props;
}

describe("ParamsPanel", () => {
  it("reports consumption changes", () => {
    const props = renderPanel();
    fireEvent.change(screen.getByLabelText("Consumption"), { target: { value: "lazy" } });
    expect(props.onChange).toHaveBeenCalledWith({ consumption: "lazy" });
  });

  it("reports the wrap toggle", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByLabelText("Wrap genome"));
    expect(props.onChange).toHaveBeenCalledWith({ wrap: true });
  });

  it("blocks invalid numeric params with a message", () => {
    const props = renderPanel();
    fireEvent.change(screen.getByLabelText("Max depth"), { target: { value: "0" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Max depth must be an integer ≥ 1");
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it("commits valid numeric params", () => {
    const props = renderPanel();
    fireEvent.change(screen.getByLabelText("Codon size"), { target: { value: "512" } });
    expect(props.onChange).toHaveBeenCalledWith({ codon_size: 512 });
  });

  it("reports genome length changes", () => {
    const props = renderPanel();
    fireEvent.change(screen.getByLabelText("Genome length"), { target: { value: "20" } });
    expect(props.onGenomeLengthChange).toHaveBeenCalledWith(20);
  });
});
