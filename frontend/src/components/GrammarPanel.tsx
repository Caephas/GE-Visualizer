import { useMemo, useState } from "react";

import { EXAMPLE_GRAMMARS } from "../examples/grammars";
import { parseBnf } from "../lib/bnf";

export interface ActiveRule {
  nonTerminal: string;
  choice: number;
}

export interface GrammarPanelProps {
  grammarText: string;
  grammarStatus: AppGrammarStatus;
  grammarError: string | null;
  grammarRules: number | null;
  onChange: (grammarText: string) => void;
  onApply: (grammarText: string) => void;
  activeRule: ActiveRule | null;
}

export type AppGrammarStatus = "unknown" | "validating" | "valid" | "invalid";

export function GrammarPanel({
  grammarText,
  grammarStatus,
  grammarError,
  grammarRules,
  onChange,
  onApply,
  activeRule,
}: GrammarPanelProps) {
  const [selectedExample, setSelectedExample] = useState(EXAMPLE_GRAMMARS[0].name);
  const rules = useMemo(() => parseBnf(grammarText), [grammarText]);

  const statusLabel =
    grammarStatus === "validating"
      ? "Checking grammar…"
      : grammarStatus === "valid"
        ? `✓ Grammar valid — ${grammarRules ?? 0} rules`
        : grammarStatus === "invalid"
          ? "✗ Invalid grammar"
          : "Grammar not checked yet";

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
      <label className="field-label" htmlFor="grammar-textarea">
        BNF Grammar
      </label>
      <textarea
        id="grammar-textarea"
        className="grammar-textarea"
        value={grammarText}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-label="BNF grammar"
      />
      <div className={`grammar-status grammar-status-${grammarStatus}`} role="status">
        {statusLabel}
        {grammarStatus === "invalid" && grammarError && (
          <span className="grammar-status-error">{grammarError}</span>
        )}
      </div>
      <button
        type="button"
        className="button-primary button-apply"
        onClick={() => onApply(grammarText)}
        disabled={grammarStatus !== "valid"}
        title={grammarStatus !== "valid" ? "Fix grammar errors first" : undefined}
      >
        Apply grammar & map
      </button>
      <div className="rules-label">Rules</div>
      <div className="grammar-rules" aria-label="Parsed grammar rules">
        {rules.map((rule) => (
          <div key={rule.nonTerminal} className="grammar-rule">
            <div className="rule-nt">{rule.nonTerminal} ::=</div>
            {rule.productions.map((production, index) => {
              const isActive = activeRule?.nonTerminal === rule.nonTerminal && activeRule.choice === index;
              return (
                <div key={index} className={`rule-production ${isActive ? "is-active" : ""}`}>
                  <span className="rule-choice">{index}</span>
                  <span className="rule-text">{production}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
