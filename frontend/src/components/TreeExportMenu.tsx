import { useEffect, useRef, useState } from "react";

import {
  downloadBlob,
  svgToPngBlob,
  traceToCsv,
  traceToText,
  treeToSvg,
} from "../lib/treeExport";
import type { DerivationNode, TraceStep } from "../types";

export interface TreeExportMenuProps {
  root: DerivationNode;
  trace: TraceStep[];
  currentStep: number;
}

/** Toolbar menu that exports the derivation tree (SVG/PNG) and its step trace. */
export function TreeExportMenu({ root, trace, currentStep }: TreeExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeStep = currentStep >= 0 ? currentStep : null;
  const fileBase = `ge-tree${currentStep >= 0 ? `-step-${currentStep + 1}` : ""}`;
  const hasTrace = trace.length > 0;

  const exportSvg = () => {
    const svg = treeToSvg(root, { activeStep });
    downloadBlob(`${fileBase}.svg`, new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    setOpen(false);
  };

  const exportPng = async () => {
    try {
      const svg = treeToSvg(root, { activeStep });
      const blob = await svgToPngBlob(svg, 2);
      downloadBlob(`${fileBase}.png`, blob);
      setError(null);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const exportText = () => {
    downloadBlob(
      `${fileBase}-derivation.txt`,
      new Blob([traceToText(trace)], { type: "text/plain;charset=utf-8" }),
    );
    setOpen(false);
  };

  const exportCsv = () => {
    downloadBlob(
      `${fileBase}-trace.csv`,
      new Blob([traceToCsv(trace)], { type: "text/csv;charset=utf-8" }),
    );
    setOpen(false);
  };

  return (
    <div className="tree-export" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Export tree"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Export"
      >
        ⤓
      </button>
      {open && (
        <div className="tree-export-menu" role="menu">
          <button type="button" role="menuitem" onClick={exportSvg}>
            Tree as SVG
          </button>
          <button type="button" role="menuitem" onClick={() => void exportPng()}>
            Tree as PNG
          </button>
          <button type="button" role="menuitem" onClick={exportText} disabled={!hasTrace}>
            Derivation as text
          </button>
          <button type="button" role="menuitem" onClick={exportCsv} disabled={!hasTrace}>
            Trace as CSV
          </button>
          {error && (
            <span className="tree-export-error" role="alert">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
