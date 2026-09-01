import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GRAMMAR_ARITHMETIC } from "../examples/grammars";
import { GrammarPanel } from "./GrammarPanel";

describe("GrammarPanel", () => {
  it("shows parsed rules with numbered productions", () => {
    render(
      <GrammarPanel
        grammarText={GRAMMAR_ARITHMETIC}
        grammarStatus="valid"
        grammarError={null}
        grammarRules={4}
        onChange={vi.fn()}
        onApply={vi.fn()}
        activeRule={null}
      />,
    );
    expect(screen.getByText("<expr> ::=")).toBeInTheDocument();
    expect(screen.getByText("<expr> + <term>")).toBeInTheDocument();
  });

  it("highlights the active production", () => {
    render(
      <GrammarPanel
        grammarText={GRAMMAR_ARITHMETIC}
        grammarStatus="valid"
        grammarError={null}
        grammarRules={4}
        onChange={vi.fn()}
        onApply={vi.fn()}
        activeRule={{ nonTerminal: "<var>", choice: 1 }}
      />,
    );
    expect(screen.getByText("y").closest(".rule-production")).toHaveClass("is-active");
    expect(screen.getByText("x").closest(".rule-production")).not.toHaveClass("is-active");
  });

  it("applies the grammar", () => {
    const onApply = vi.fn();
    render(
      <GrammarPanel
        grammarText={GRAMMAR_ARITHMETIC}
        grammarStatus="valid"
        grammarError={null}
        grammarRules={4}
        onChange={vi.fn()}
        onApply={onApply}
        activeRule={null}
      />,
    );
    fireEvent.click(screen.getByText("Apply grammar & map"));
    expect(onApply).toHaveBeenCalledWith(GRAMMAR_ARITHMETIC);
  });

  it("shows grammar validation errors", () => {
    render(
      <GrammarPanel
        grammarText="not bnf"
        grammarStatus="invalid"
        grammarError="No grammar rules found."
        grammarRules={0}
        onChange={vi.fn()}
        onApply={vi.fn()}
        activeRule={null}
      />,
    );
    expect(screen.getByText("✗ Invalid grammar")).toBeInTheDocument();
    expect(screen.getByText("No grammar rules found.")).toBeInTheDocument();
  });
});
