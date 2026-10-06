import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/treeExport", () => ({
  treeToSvg: vi.fn(() => "<svg/>"),
  svgToPngBlob: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
  traceToText: vi.fn(() => "text"),
  traceToCsv: vi.fn(() => "csv"),
  downloadBlob: vi.fn(),
}));

import { downloadBlob, svgToPngBlob } from "../lib/treeExport";
import { TreeExportMenu } from "./TreeExportMenu";
import type { DerivationNode, TraceStep } from "../types";

const ROOT: DerivationNode = {
  id: "root",
  label: "<start>",
  kind: "root",
  step: null,
  codon_index: null,
  choice: null,
  children: [],
};

const STEP: TraceStep = {
  step: 0,
  non_terminal: "<start>",
  codon_index: 0,
  codon_value: 1,
  rule_count: 2,
  choice: 1,
  expansion: "a",
  partial_phenotype: "a",
  depth: 2,
  wraps: 0,
  consumed: true,
  complete: true,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("TreeExportMenu", () => {
  it("opens a menu of export options", () => {
    render(<TreeExportMenu root={ROOT} trace={[STEP]} currentStep={0} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export tree" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Tree as SVG" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Tree as PNG" })).toBeInTheDocument();
  });

  it("downloads an SVG of the current step", () => {
    render(<TreeExportMenu root={ROOT} trace={[STEP]} currentStep={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Export tree" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Tree as SVG" }));
    expect(downloadBlob).toHaveBeenCalledWith("ge-tree-step-1.svg", expect.any(Blob));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("rasterises a PNG", async () => {
    render(<TreeExportMenu root={ROOT} trace={[STEP]} currentStep={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Export tree" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Tree as PNG" }));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledWith("ge-tree-step-1.png", expect.any(Blob)));
    expect(svgToPngBlob).toHaveBeenCalled();
  });

  it("disables the trace exports when there is nothing mapped", () => {
    render(<TreeExportMenu root={ROOT} trace={[]} currentStep={-1} />);
    fireEvent.click(screen.getByRole("button", { name: "Export tree" }));
    expect(screen.getByRole("menuitem", { name: "Derivation as text" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Trace as CSV" })).toBeDisabled();
  });

  it("surfaces a rasterisation failure", async () => {
    vi.mocked(svgToPngBlob).mockRejectedValueOnce(new Error("no canvas"));
    render(<TreeExportMenu root={ROOT} trace={[STEP]} currentStep={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Export tree" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Tree as PNG" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("no canvas");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
