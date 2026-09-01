import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveGrammar } from "../lib/serialization";
import { GrammarLibrary } from "./GrammarLibrary";

describe("GrammarLibrary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves the current grammar and loads it back", () => {
    const onLoad = vi.fn();
    render(<GrammarLibrary grammarText="<s> ::= x" onLoad={onLoad} />);
    fireEvent.change(screen.getByLabelText("Grammar name"), { target: { value: "mine" } });
    fireEvent.click(screen.getByText("Save current"));
    fireEvent.click(screen.getByText("mine"));
    expect(onLoad).toHaveBeenCalledWith("<s> ::= x");
  });

  it("deletes saved grammars", () => {
    saveGrammar("g", "<s> ::= x");
    render(<GrammarLibrary grammarText="" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Delete g"));
    expect(screen.queryByText("g")).not.toBeInTheDocument();
  });

  it("requires a name before saving", () => {
    render(<GrammarLibrary grammarText="<s> ::= x" onLoad={vi.fn()} />);
    fireEvent.click(screen.getByText("Save current"));
    expect(screen.getByText(/Enter a name first/)).toBeInTheDocument();
  });
});
