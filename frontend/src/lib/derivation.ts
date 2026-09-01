import { hierarchy, tree } from "d3-hierarchy";

import type { DerivationNode, TraceStep } from "../types";

export type TokenType = "terminal" | "nonterminal";

export interface Token {
  type: TokenType;
  value: string;
}

export function tokenize(expansion: string): Token[] {
  return expansion
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => ({
      type: /^<[^>]+>$/.test(value) ? "nonterminal" : "terminal",
      value,
    }));
}

/**
 * Reconstructs the derivation tree from the first `prefixLength` trace steps.
 * The root is the start rule; each step expands the leftmost pending
 * non-terminal, exactly like the mapper's leftmost derivation.
 */
export function buildDerivationTree(trace: TraceStep[], prefixLength: number): DerivationNode {
  const startLabel = trace.length > 0 ? trace[0].non_terminal : "<start>";
  const root: DerivationNode = {
    id: "root",
    label: startLabel,
    kind: "root",
    step: null,
    codon_index: null,
    choice: null,
    children: [],
  };
  const pending: DerivationNode[] = [root];

  for (const step of trace.slice(0, prefixLength)) {
    const index = pending.findIndex((node) => node.label === step.non_terminal);
    if (index === -1) break;
    const target = pending[index];
    target.step = step.step;
    target.codon_index = step.codon_index;
    target.choice = step.choice;
    const children: DerivationNode[] = tokenize(step.expansion).map((token, childIndex) => ({
      id: `${step.step}-${childIndex}`,
      label: token.value,
      kind: token.type,
      step: step.step,
      codon_index: null,
      choice: null,
      children: [],
    }));
    target.children = children;
    pending.splice(index, 1, ...children.filter((child) => child.kind === "nonterminal"));
  }
  return root;
}

export interface LayoutNode {
  node: DerivationNode;
  x: number;
  y: number;
}

export interface TreeLayout {
  nodes: LayoutNode[];
  edges: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>;
  width: number;
  height: number;
}

/** Tidy tree layout (d3-hierarchy) with SVG-ready coordinates and edge paths. */
export function layoutTree(root: DerivationNode): TreeLayout {
  const rootNode = hierarchy<DerivationNode>(root, (node) => node.children);
  // Spacing sized for the 90×34 rounded-rect nodes the dashboard renders.
  tree<DerivationNode>().nodeSize([106, 84])(rootNode);
  const descendants = rootNode.descendants();
  const points = descendants.map((node) => ({ node, x: node.x ?? 0, y: node.y ?? 0 }));
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const padding = 48;
  const width = Math.max(...points.map((point) => point.x)) - minX + padding * 2;
  const height = Math.max(...points.map((point) => point.y)) - minY + padding * 2;
  const positioned = new Map<string, LayoutNode>();
  const nodes: LayoutNode[] = points.map((point) => {
    const layout: LayoutNode = {
      node: point.node.data,
      x: point.x - minX + padding,
      y: point.y - minY + padding,
    };
    positioned.set(point.node.data.id, layout);
    return layout;
  });
  const edges: TreeLayout["edges"] = [];
  for (const node of descendants) {
    for (const child of node.children ?? []) {
      const parent = positioned.get(node.data.id);
      const target = positioned.get(child.data.id);
      if (parent && target) {
        edges.push({ id: `${parent.node.id}->${target.node.id}`, x1: parent.x, y1: parent.y, x2: target.x, y2: target.y });
      }
    }
  }
  return { nodes, edges, width, height };
}
