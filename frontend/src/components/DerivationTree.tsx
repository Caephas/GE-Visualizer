import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { layoutTree } from "../lib/derivation";
import type { DerivationNode } from "../types";

export interface DerivationTreeProps {
  root: DerivationNode;
  currentStep: number;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const FIT_SCALE_CAP = 1.5;
const NODE_W = 90;
const NODE_H = 34;

interface View {
  scale: number;
  tx: number;
  ty: number;
}

function nodeTitle(node: DerivationNode): string {
  if (node.kind === "terminal") {
    return node.step === null ? "terminal" : `terminal · created in step ${node.step}`;
  }
  if (node.step === null || node.codon_index === null || node.choice === null) {
    return `${node.label} · start rule`;
  }
  return `${node.label} · step ${node.step} · codon genome[${node.codon_index}] → choice ${node.choice}`;
}

export function DerivationTree({ root, currentStep }: DerivationTreeProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [panel, setPanel] = useState({ width: 600, height: 400 });
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [panning, setPanning] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const prevCountRef = useRef(0);

  const layout = useMemo(() => layoutTree(root), [root]);
  const nodeCount = layout.nodes.length;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.width > 0 && rect.height > 0) {
        setPanel({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const fitView = useCallback((): View => {
    const rawScale = Math.min((panel.width - 24) / layout.width, (panel.height - 24) / layout.height);
    const scale = Math.max(MIN_SCALE, Math.min(Number.isFinite(rawScale) ? rawScale : 0.5, FIT_SCALE_CAP));
    return {
      scale,
      tx: (panel.width - layout.width * scale) / 2,
      ty: (panel.height - layout.height * scale) / 2,
    };
  }, [panel.width, panel.height, layout.width, layout.height]);

  useEffect(() => {
    const shrunk = nodeCount < prevCountRef.current;
    const first = prevCountRef.current === 0;
    prevCountRef.current = nodeCount;
    if (first || shrunk) setView(fitView());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel.width, panel.height, nodeCount]);

  const zoomAt = useCallback((screenX: number, screenY: number, factor: number) => {
    setView((current) => {
      const scale = Math.max(MIN_SCALE, Math.min(current.scale * factor, MAX_SCALE));
      if (scale === current.scale) return current;
      const ratio = scale / current.scale;
      return {
        scale,
        tx: screenX - (screenX - current.tx) * ratio,
        ty: screenY - (screenY - current.ty) * ratio,
      };
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, event.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, tx: view.tx, ty: view.ty };
    setPanning(true);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setView((current) => ({
      ...current,
      tx: drag.tx + (event.clientX - drag.startX),
      ty: drag.ty + (event.clientY - drag.startY),
    }));
  };

  const endPan = () => {
    dragRef.current = null;
    setPanning(false);
  };

  const transform = `translate(${view.tx} ${view.ty}) scale(${view.scale})`;

  return (
    <div className="tree-stage" ref={stageRef}>
      <span className="tree-node-count">{nodeCount} nodes</span>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${panel.width} ${panel.height}`}
        className={panning ? "panning" : ""}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        aria-label="Derivation tree (drag to pan, scroll to zoom)"
      >
        <g transform={transform}>
          {layout.edges.map((edge) => (
            <path
              key={edge.id}
              className="tree-edge"
              d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${edge.y2}`}
            />
          ))}
          {layout.nodes.map(({ node, x, y }) => (
            <g key={node.id} transform={`translate(${x}, ${y})`}>
              <title>{nodeTitle(node)}</title>
              <rect
                x={-NODE_W / 2}
                y={-NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                className={`tree-node tree-node-${node.kind} ${node.step === currentStep ? "is-active" : ""}`}
              />
              <text y={4} textAnchor="middle" className={`tree-label ${node.kind === "root" ? "tree-label-root" : ""}`}>
                {node.label.length > 10 ? `${node.label.slice(0, 9)}…` : node.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <div className="tree-toolbar">
        <button
          type="button"
          onClick={() => zoomAt(panel.width / 2, panel.height / 2, 1.25)}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomAt(panel.width / 2, panel.height / 2, 1 / 1.25)}
          aria-label="Zoom out"
        >
          −
        </button>
        <button type="button" onClick={() => setView(fitView())} aria-label="Fit tree" title="Fit tree">
          ⊞
        </button>
      </div>
    </div>
  );
}
