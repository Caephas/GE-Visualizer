import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { layoutTree, NODE_HEIGHT, NODE_WIDTH } from "../lib/derivation";
import type { DerivationNode, TraceStep } from "../types";
import { TreeExportMenu } from "./TreeExportMenu";

export interface DerivationTreeProps {
  root: DerivationNode;
  currentStep: number;
  trace?: TraceStep[];
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const FIT_SCALE_CAP = 1.0;
const TOOLTIP_W = 260;
const TOOLTIP_H = 110;

interface View {
  scale: number;
  tx: number;
  ty: number;
}

interface HoverState {
  node: DerivationNode;
  x: number;
  y: number;
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

function tooltipLines(node: DerivationNode, step: TraceStep | undefined): string[] {
  if (node.kind === "root") return [node.label, "start rule"];

  const lines = [node.label];
  if (node.kind === "terminal") {
    lines.push(node.step === null ? "terminal" : `terminal · created in step ${node.step}`);
    return lines;
  }

  if (!step || node.step === null) {
    lines.push("non-terminal");
    if (node.codon_index !== null && node.choice !== null) {
      lines.push(`codon genome[${node.codon_index}] → choice ${node.choice}`);
    }
    return lines;
  }

  lines.push(`step ${node.step}`);
  if (step.consumed) {
    lines.push(`genome[${step.codon_index}] = ${step.codon_value}`);
    lines.push(`${step.codon_value} % ${step.rule_count} → choice ${step.choice}`);
  } else {
    lines.push("no codon consumed (single production)");
  }
  lines.push(`→ ${step.expansion}`);
  return lines;
}

export function DerivationTree({ root, currentStep, trace }: DerivationTreeProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [panel, setPanel] = useState({ width: 600, height: 400 });
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [panning, setPanning] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistanceRef = useRef<number | null>(null);
  const prevCountRef = useRef(0);

  const layout = useMemo(() => layoutTree(root), [root]);
  const nodeCount = layout.nodes.length;
  const traceByStep = useMemo(() => {
    const map = new Map<number, TraceStep>();
    for (const step of trace ?? []) map.set(step.step, step);
    return map;
  }, [trace]);

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
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2) {
      // A second finger means pinch-to-zoom, not panning.
      const [first, second] = [...pointersRef.current.values()];
      pinchDistanceRef.current = Math.hypot(first.x - second.x, first.y - second.y);
      dragRef.current = null;
      setPanning(false);
      return;
    }

    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, tx: view.tx, ty: view.ty };
    setPanning(true);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const tracked = pointersRef.current.get(event.pointerId);
    if (tracked) {
      tracked.x = event.clientX;
      tracked.y = event.clientY;
    }

    if (pinchDistanceRef.current !== null && pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect && pinchDistanceRef.current > 0 && distance > 0) {
        zoomAt(
          (first.x + second.x) / 2 - rect.left,
          (first.y + second.y) / 2 - rect.top,
          distance / pinchDistanceRef.current,
        );
      }
      pinchDistanceRef.current = distance;
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    setView((current) => ({
      ...current,
      tx: drag.tx + (event.clientX - drag.startX),
      ty: drag.ty + (event.clientY - drag.startY),
    }));
  };

  const endPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchDistanceRef.current = null;
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setPanning(false);
    }
  };

  const updateHover = (node: DerivationNode) => (event: React.MouseEvent) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ node, x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  const transform = `translate(${view.tx} ${view.ty}) scale(${view.scale})`;
  const tooltipX = hover ? Math.min(hover.x + 14, Math.max(8, panel.width - TOOLTIP_W - 8)) : 0;
  const tooltipY = hover ? Math.min(hover.y + 14, Math.max(8, panel.height - TOOLTIP_H - 8)) : 0;
  const hoverLines = hover ? tooltipLines(hover.node, traceByStep.get(hover.node.step ?? -1)) : [];

  return (
    <div className="tree-stage" ref={stageRef}>
      <span className="tree-node-count">{nodeCount} nodes</span>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${panel.width} ${panel.height}`}
        className={panning ? "panning" : ""}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
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
            <g
              key={node.id}
              className="tree-node-group"
              transform={`translate(${x}, ${y})`}
              onMouseEnter={updateHover(node)}
              onMouseMove={updateHover(node)}
              onMouseLeave={() => setHover(null)}
            >
              <rect
                x={-NODE_WIDTH / 2}
                y={-NODE_HEIGHT / 2}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                className={`tree-node tree-node-${node.kind} ${node.step === currentStep ? "is-active" : ""}`}
                aria-label={nodeTitle(node)}
              />
              <text y={4} textAnchor="middle" className={`tree-label ${node.kind === "root" ? "tree-label-root" : ""}`}>
                {node.label.length > 10 ? `${node.label.slice(0, 9)}…` : node.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {hover && (
        <div className="tree-tooltip" role="tooltip" style={{ left: tooltipX, top: tooltipY }}>
          <div className="tree-tooltip-label">{hoverLines[0]}</div>
          {hoverLines.slice(1).map((line) => (
            <div key={line} className={`tree-tooltip-row ${line.startsWith("→") ? "tree-tooltip-expansion" : ""}`}>
              {line}
            </div>
          ))}
        </div>
      )}
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
        <TreeExportMenu root={root} trace={trace ?? []} currentStep={currentStep} />
      </div>
    </div>
  );
}
