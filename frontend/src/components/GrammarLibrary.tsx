import { useRef, useState } from "react";

import {
  deleteSavedGrammar,
  exportGrammars,
  importGrammars,
  listSavedGrammars,
  saveGrammar,
} from "../lib/serialization";
import type { SavedGrammar } from "../lib/serialization";

export interface GrammarLibraryProps {
  grammarText: string;
  onLoad: (grammarText: string) => void;
}

export function GrammarLibrary({ grammarText, onLoad }: GrammarLibraryProps) {
  const [saved, setSaved] = useState<SavedGrammar[]>(() => listSavedGrammars());
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setMessage("Enter a name first.");
      return;
    }
    setSaved(saveGrammar(name.trim(), grammarText));
    setName("");
    setMessage(`Saved "${name.trim()}".`);
  };

  const handleDelete = (id: string) => {
    setSaved(deleteSavedGrammar(id));
  };

  const handleExport = () => {
    const blob = new Blob([exportGrammars()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ge-visualizer-grammars.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setSaved(importGrammars(text));
      setMessage("Imported grammar library.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  };

  return (
    <div className="grammar-library">
      <h3 className="library-heading">Library</h3>
      <div className="library-row">
        <input
          type="text"
          value={name}
          placeholder="Grammar name"
          onChange={(event) => setName(event.target.value)}
          aria-label="Grammar name"
        />
        <button type="button" onClick={handleSave}>
          Save current
        </button>
      </div>
      <div className="library-row">
        <button type="button" onClick={handleExport}>
          Export
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(event) => {
            void handleImportFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {message && <p className="library-message">{message}</p>}
      <ul className="library-list">
        {saved.length === 0 && <li className="library-empty">No saved grammars yet.</li>}
        {saved.map((item) => (
          <li key={item.id} className="library-item">
            <button type="button" className="library-load" onClick={() => onLoad(item.grammarText)}>
              {item.name}
            </button>
            <button
              type="button"
              className="library-delete"
              onClick={() => handleDelete(item.id)}
              aria-label={`Delete ${item.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
