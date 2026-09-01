import { useMemo } from "react";

import { layoutTree } from "../lib/derivation";
import type { DerivationNode } from "../types";

export interface DerivationTreeProps {
  root: DerivationNode;
  currentStep: number;
}

export function DerivationTree({ root, currentStep }: DerivationTreeProps) {
  const layout = useMemo(() => layoutTree(root), [root]);

  return (
    <svg className="derivation-tree" viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="xMidYMid meet">
      <g>
        {layout.edges.map((edge) => (
          <path
            key={edge.id}
            className="tree-edge"
            d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${edge.y2}`}
          />
        ))}
        {layout.nodes.map(({ node, x, y }) => (
          <g key={node.id} transform={`translate(${x}, ${y})`}>
            <circle
              r={10}
              className={`tree-node tree-node-${node.kind} ${node.step === currentStep ? "is-active" : ""}`}
            />
            <text y={4} textAnchor="middle" className="tree-label">
              {node.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
