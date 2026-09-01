import { useEffect, useState } from "react";

import type { Consumption, GEParams } from "../types";

export interface ParamsPanelProps {
  params: GEParams;
  genomeLength: number;
  onChange: (partial: Partial<GEParams>) => void;
  onGenomeLengthChange: (length: number) => void;
}

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
  onInvalid: (message: string) => void;
}

function NumberField({ label, value, min, onChange, onInvalid }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft((current) => (current === String(value) ? String(value) : current));
  }, [value]);

  const commit = (text: string) => {
    if (text === "") return;
    const parsed = Number(text);
    if (!Number.isInteger(parsed) || parsed < min) {
      onInvalid(`${label} must be an integer ≥ ${min}.`);
      return;
    }
    onInvalid("");
    onChange(parsed);
  };

  return (
    <label className="param-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          commit(event.target.value);
        }}
      />
    </label>
  );
}

export function ParamsPanel({ params, genomeLength, onChange, onGenomeLengthChange }: ParamsPanelProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="params-panel">
      <h3>Parameters</h3>
      <label className="param-field">
        <span>Consumption</span>
        <select
          value={params.consumption}
          onChange={(event) => onChange({ consumption: event.target.value as Consumption })}
        >
          <option value="eager">eager</option>
          <option value="lazy">lazy</option>
        </select>
      </label>
      <label className="param-checkbox">
        <input
          type="checkbox"
          checked={params.wrap}
          onChange={(event) => onChange({ wrap: event.target.checked })}
        />
        Wrap genome
      </label>
      <NumberField
        label="Codon size"
        value={params.codon_size}
        min={2}
        onChange={(value) => onChange({ codon_size: value })}
        onInvalid={setError}
      />
      <NumberField
        label="Bits / codon"
        value={params.bits_per_codon}
        min={1}
        onChange={(value) => onChange({ bits_per_codon: value })}
        onInvalid={setError}
      />
      <NumberField
        label="Max depth"
        value={params.max_depth}
        min={1}
        onChange={(value) => onChange({ max_depth: value })}
        onInvalid={setError}
      />
      <NumberField
        label="Genome length"
        value={genomeLength}
        min={1}
        onChange={onGenomeLengthChange}
        onInvalid={setError}
      />
      {error && (
        <p className="param-error" role="alert">
          {error}
        </p>
      )}
      <p className="param-hint">Edits re-map automatically (debounced).</p>
    </div>
  );
}
