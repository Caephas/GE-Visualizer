import { useMemo, useState } from "react";

import type { GrammarSuggestion } from "../api";
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
  onSuggestSettings?: () => void;
  suggesting?: boolean;
  suggestion?: GrammarSuggestion | null;
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
  onSuggestSettings,
  suggesting = false,
  suggestion = null,
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
      {onSuggestSettings && (
        <button
          type="button"
          className="button-suggest"
          onClick={onSuggestSettings}
          disabled={grammarStatus !== "valid" || suggesting}
          title="Work out a genome and depth that complete this grammar"
        >
          {suggesting ? "Working out…" : "Suggest working settings"}
        </button>
      )}
      {suggestion && (
        <p className="suggest-note">
          Shortest derivation: {suggestion.min_codons[suggestion.consumption]}{" "}
          {suggestion.consumption === "lazy" ? "lazy" : "eager"} codons, depth {suggestion.min_depth}
          {suggestion.min_codons.lazy < suggestion.min_codons.eager
            ? ` — lazy would need only ${suggestion.min_codons.lazy}.`
            : "."}
        </p>
      )}
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
