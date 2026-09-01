import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_PARAMS } from "../state";
import {
  deleteSavedGrammar,
  exportGrammars,
  importGrammars,
  listSavedGrammars,
  parseState,
  saveGrammar,
  serializeState,
} from "./serialization";
import type { PersistedState } from "./serialization";

const STATE: PersistedState = {
  grammarText: "<start> ::= a | b",
  genome: [1, 2, 3],
  params: { ...DEFAULT_PARAMS, consumption: "lazy", wrap: true },
  currentStep: 4,
  genomeLength: 12,
};

describe("serialization", () => {
  it("round-trips a full state", () => {
    const restored = parseState(serializeState(STATE));
    expect(restored).toEqual(STATE);
  });

  it("encodes special characters in the grammar", () => {
    const query = serializeState({ ...STATE, grammarText: "<start> ::= a | b\n<next> ::= c" });
    expect(parseState(query)?.grammarText).toBe("<start> ::= a | b\n<next> ::= c");
  });

  it("returns null for empty queries", () => {
    expect(parseState("")).toBeNull();
    expect(parseState("?foo=bar")).toBeNull();
  });

  it("ignores malformed values", () => {
    const restored = parseState("genome=1,2,x&step=abc&len=0&params=not-json");
    expect(restored?.genome).toBeUndefined();
    expect(restored?.currentStep).toBeUndefined();
    expect(restored?.genomeLength).toBeUndefined();
    expect(restored?.params).toBeUndefined();
  });
});

describe("grammar library", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves, lists, and deletes grammars", () => {
    expect(listSavedGrammars()).toEqual([]);
    const afterSave = saveGrammar("arith", "<expr> ::= x");
    expect(afterSave).toHaveLength(1);
    expect(listSavedGrammars()[0].name).toBe("arith");
    const afterDelete = deleteSavedGrammar(afterSave[0].id);
    expect(afterDelete).toEqual([]);
  });

  it("overwrites on the same name and round-trips through export/import", () => {
    saveGrammar("g", "a");
    saveGrammar("g", "b");
    expect(listSavedGrammars()).toHaveLength(1);
    expect(listSavedGrammars()[0].grammarText).toBe("b");

    const exported = exportGrammars();
    window.localStorage.clear();
    importGrammars(exported);
    expect(listSavedGrammars()).toHaveLength(1);
    expect(listSavedGrammars()[0].grammarText).toBe("b");
  });

  it("rejects non-library exports", () => {
    expect(() => importGrammars('{"name": "nope"}')).toThrow(/Not a grammar library export/);
  });
});
