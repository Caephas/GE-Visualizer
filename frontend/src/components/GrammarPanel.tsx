import { useState } from "react";

import { EXAMPLE_GRAMMARS } from "../examples/grammars";

export interface GrammarPanelProps {
  grammarText: string;
  onChange: (grammarText: string) => void;
  onApply: (grammarText: string) => void;
}

export function GrammarPanel({ grammarText, onChange, onApply }: GrammarPanelProps) {
  const [selectedExample, setSelectedExample] = useState(EXAMPLE_GRAMMARS[0].name);

  return (
    <div className="grammar-panel-body">
      <label className="field-label" htmlFor="example-select">
        Example grammar
      </label>
      <select
        id="example-select"
        value={selectedExample}
        onChange={(event) => {
          setSelectedExample(event.target.value);
          const example = EXAMPLE_GRAMMARS.find((item) => item.name === event.target.value);
          if (example) onApply(example.grammar);
        }}
      >
        {EXAMPLE_GRAMMARS.map((example) => (
          <option key={example.name} value={example.name}>
            {example.name}
          </option>
        ))}
      </select>
      <textarea
        className="grammar-textarea"
        value={grammarText}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-label="BNF grammar"
      />
      <button type="button" onClick={() => onApply(grammarText)}>
        Apply grammar & map
      </button>
    </div>
  );
}
