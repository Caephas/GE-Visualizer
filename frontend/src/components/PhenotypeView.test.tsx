import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PhenotypeView } from "./PhenotypeView";

describe("PhenotypeView", () => {
  it("renders the partial phenotype and status", () => {
    render(<PhenotypeView phenotype="2 * <factor>" status="complete" />);
    expect(screen.getByText("2 * <factor>")).toBeInTheDocument();
    expect(screen.getByText("complete")).toBeInTheDocument();
  });

  it("renders a placeholder when empty", () => {
    render(<PhenotypeView phenotype="" status={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
