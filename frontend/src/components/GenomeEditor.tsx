import { useEffect, useState } from "react";

import { bitsToCodons, codonsToBits } from "../lib/encoding";

export interface GenomeEditorProps {
  genome: number[];
  bitsPerCodon: number;
  activeCodonIndex: number | null;
  activeConsumed: boolean | null;
  activeWraps: number;
  onChange: (genome: number[]) => void;
  onAutoMap: (genome: number[]) => void;
  onGenerate: () => void;
}

export function GenomeEditor({
  genome,
  bitsPerCodon,
  activeCodonIndex,
  activeConsumed,
  activeWraps,
  onChange,
  onAutoMap,
  onGenerate,
}: GenomeEditorProps) {
  const [showBinary, setShowBinary] = useState(false);
  const [drafts, setDrafts] = useState<string[]>(() => genome.map(String));
  const bits = codonsToBits(genome, bitsPerCodon);

  useEffect(() => {
    setDrafts(genome.map(String));
  }, [genome]);

  const commitCodon = (index: number, text: string) => {
    if (text === "") return;
    const parsed = Number(text);
    if (!Number.isInteger(parsed) || parsed < 0) return;
    const next = [...genome];
    next[index] = parsed;
    onChange(next);
    onAutoMap(next);
  };

  const toggleBit = (index: number) => {
    const nextBits = [...bits];
    nextBits[index] = 1 - nextBits[index];
    const nextCodons = bitsToCodons(nextBits, bitsPerCodon);
    onChange(nextCodons);
    onAutoMap(nextCodons);
  };

  const isActiveBit = (index: number) =>
    activeCodonIndex !== null &&
    index >= activeCodonIndex * bitsPerCodon &&
    index < (activeCodonIndex + 1) * bitsPerCodon;

  return (
    <div className="genome-editor">
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
              <button
                key={index}
                type="button"
                className={`bit bit-toggle ${isActiveBit(index) ? "is-active" : ""}`}
                onClick={() => toggleBit(index)}
                aria-label={`Bit ${index}`}
              >
                {bit}
              </button>
            ))
          : genome.map((codon, index) => (
              <div
                key={index}
                role="listitem"
                className={`codon ${
                  index === activeCodonIndex ? (activeConsumed === false ? "is-not-consumed" : "is-active") : ""
                }`}
              >
                <span className="codon-index">{index}</span>
                <input
                  className="codon-input"
                  type="number"
                  min={0}
                  value={drafts[index] ?? String(codon)}
                  aria-label={`Codon ${index}`}
                  onChange={(event) => {
                    setDrafts((previous) => {
                      const next = [...previous];
                      next[index] = event.target.value;
                      return next;
                    });
                    commitCodon(index, event.target.value);
                  }}
                  onBlur={() => {
                    setDrafts((previous) => {
                      if (previous[index] !== "") return previous;
                      const next = [...previous];
                      next[index] = String(genome[index]);
                      return next;
                    });
                  }}
                />
              </div>
            ))}
      </div>
    </div>
  );
}
