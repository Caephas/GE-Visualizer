import { useState } from "react";

import { codonsToBits } from "../lib/encoding";

export interface GenomeStripProps {
  genome: number[];
  bitsPerCodon: number;
  activeCodonIndex: number | null;
  activeConsumed: boolean | null;
  activeWraps: number;
  onGenerate: () => void;
}

export function GenomeStrip({
  genome,
  bitsPerCodon,
  activeCodonIndex,
  activeConsumed,
  activeWraps,
  onGenerate,
}: GenomeStripProps) {
  const [showBinary, setShowBinary] = useState(false);
  const bits = codonsToBits(genome, bitsPerCodon);

  return (
    <div className="genome-strip">
      <div className="genome-strip-toolbar">
        <label className="binary-toggle">
          <input type="checkbox" checked={showBinary} onChange={(event) => setShowBinary(event.target.checked)} />
          Binary view
        </label>
        <button type="button" onClick={onGenerate}>
          Generate genome
        </button>
        {activeWraps > 0 && <span className="wrap-badge">↻ wrapped ×{activeWraps}</span>}
      </div>
      <div className="codons" role="list" aria-label="Genome codons">
        {showBinary
          ? bits.map((bit, index) => (
              <span
                key={index}
                className={`bit ${index >= (activeCodonIndex ?? -1) * bitsPerCodon && index < ((activeCodonIndex ?? -1) + 1) * bitsPerCodon ? "is-active" : ""}`}
              >
                {bit}
              </span>
            ))
          : genome.map((codon, index) => (
              <span
                key={index}
                role="listitem"
                className={`codon ${
                  index === activeCodonIndex ? (activeConsumed === false ? "is-not-consumed" : "is-active") : ""
                }`}
              >
                <span className="codon-index">{index}</span>
                <span className="codon-value">{codon}</span>
              </span>
            ))}
      </div>
    </div>
  );
}
