import { describe, expect, it } from "vitest";

import { bitsToCodons, codonsToBits } from "./encoding";

describe("encoding", () => {
  it("decodes bits to codons MSB-first, truncating partial trailing bits", () => {
    expect(bitsToCodons([1, 0, 1, 0, 1, 0, 1, 0, 1], 8)).toEqual([170]);
    expect(bitsToCodons([1, 1, 1, 1, 0, 0, 0, 0], 4)).toEqual([15, 0]);
  });

  it("round-trips codons through bits at full width", () => {
    const codons = [42, 7, 255, 0, 199];
    expect(bitsToCodons(codonsToBits(codons, 8), 8)).toEqual(codons);
  });

  it("pads codons to bitsPerCodon width", () => {
    expect(codonsToBits([5], 4)).toEqual([0, 1, 0, 1]);
  });
});
