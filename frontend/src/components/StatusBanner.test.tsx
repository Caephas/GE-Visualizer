import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_PARAMS } from "../state";
import { StatusBanner } from "./StatusBanner";

describe("StatusBanner", () => {
  it("explains a depth-limit stop", () => {
    render(
      <StatusBanner
        status="depth-limited"
        params={{ ...DEFAULT_PARAMS, max_depth: 5 }}
      />,
    );
    expect(screen.getByText("Depth limit reached")).toBeInTheDocument();
    expect(screen.getByText(/max_depth \(5\)/)).toBeInTheDocument();
  });

  it("suggests wrapping when the derivation is invalid", () => {
    render(<StatusBanner status="invalid" params={DEFAULT_PARAMS} />);
    expect(screen.getByText("Incomplete derivation")).toBeInTheDocument();
    expect(screen.getByText(/wrapping is off/)).toBeInTheDocument();
  });
});
