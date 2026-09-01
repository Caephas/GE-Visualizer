import type { GEParams } from "../types";

export interface PersistedState {
  grammarText: string;
  genome: number[];
  params: GEParams;
  currentStep: number;
  genomeLength: number;
}

export function serializeState(state: PersistedState): string {
  const params = new URLSearchParams();
  params.set("grammar", state.grammarText);
  params.set("genome", state.genome.join(","));
  params.set("params", JSON.stringify(state.params));
  params.set("step", String(state.currentStep));
  params.set("len", String(state.genomeLength));
  return params.toString();
}

export function parseState(query: string): Partial<PersistedState> | null {
  const params = new URLSearchParams(query);
  if (!params.has("grammar") && !params.has("genome") && !params.has("params")) return null;

  const restored: Partial<PersistedState> = {};
  const grammar = params.get("grammar");
  if (grammar !== null && grammar.trim() !== "") restored.grammarText = grammar;

  const genome = params.get("genome");
  if (genome !== null) {
    const values = genome.split(",").map(Number);
    if (values.length > 0 && values.every((value) => Number.isInteger(value) && value >= 0)) {
      restored.genome = values;
    }
  }

  const rawParams = params.get("params");
  if (rawParams !== null) {
    try {
      const parsed = JSON.parse(rawParams) as Partial<GEParams>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        restored.params = parsed as GEParams;
      }
    } catch {
      // ignore malformed params
    }
  }

  const step = params.get("step");
  if (step !== null) {
    const value = Number(step);
    if (Number.isInteger(value) && value >= -1) restored.currentStep = value;
  }

  const len = params.get("len");
  if (len !== null) {
    const value = Number(len);
    if (Number.isInteger(value) && value >= 1) restored.genomeLength = value;
  }

  return restored;
}

const LIBRARY_KEY = "ge-visualizer.grammars";

export interface SavedGrammar {
  id: string;
  name: string;
  grammarText: string;
  savedAt: string;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readLibrary(): SavedGrammar[] {
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedGrammar =>
        !!item &&
        typeof item === "object" &&
        typeof (item as SavedGrammar).name === "string" &&
        typeof (item as SavedGrammar).grammarText === "string",
    );
  } catch {
    return [];
  }
}

function writeLibrary(items: SavedGrammar[]): void {
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
}

export function listSavedGrammars(): SavedGrammar[] {
  return readLibrary();
}

export function saveGrammar(name: string, grammarText: string): SavedGrammar[] {
  const saved = readLibrary();
  const entry: SavedGrammar = { id: newId(), name, grammarText, savedAt: new Date().toISOString() };
  const existingIndex = saved.findIndex((item) => item.name === name);
  const next =
    existingIndex >= 0 ? saved.map((item, index) => (index === existingIndex ? entry : item)) : [...saved, entry];
  writeLibrary(next);
  return next;
}

export function deleteSavedGrammar(id: string): SavedGrammar[] {
  const next = readLibrary().filter((item) => item.id !== id);
  writeLibrary(next);
  return next;
}

export function exportGrammars(): string {
  return JSON.stringify(readLibrary(), null, 2);
}

export function importGrammars(text: string): SavedGrammar[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Not a grammar library export.");
  const next = [...readLibrary()];
  for (const item of parsed) {
    if (
      !item ||
      typeof (item as SavedGrammar).name !== "string" ||
      typeof (item as SavedGrammar).grammarText !== "string"
    ) {
      continue;
    }
    const entry: SavedGrammar = {
      id: newId(),
      name: (item as SavedGrammar).name,
      grammarText: (item as SavedGrammar).grammarText,
      savedAt: new Date().toISOString(),
    };
    const existingIndex = next.findIndex((existing) => existing.name === entry.name);
    if (existingIndex >= 0) next[existingIndex] = entry;
    else next.push(entry);
  }
  writeLibrary(next);
  return next;
}
