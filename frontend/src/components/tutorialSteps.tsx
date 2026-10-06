import type { ReactNode } from "react";

export interface TutorialStep {
  /** CSS selector for the element to spotlight, or null for a centred card. */
  target: string | null;
  title: string;
  body: ReactNode;
}

export const TOUR_SEEN_KEY = "ge-visualizer.tourSeen";

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: null,
    title: "Welcome to the GE Visualizer",
    body: (
      <>
        This is a one-minute tour of how a genome becomes a program. Everything — the mapping and
        the evolution — runs in your browser with the real GRAPE library. No server, nothing to
        install.
      </>
    ),
  },
  {
    target: ".grammar-panel",
    title: "Start with a grammar",
    body: (
      <>
        A BNF grammar describes every program you can build, like{" "}
        <code>&lt;expr&gt; ::= &lt;term&gt; | &lt;expr&gt; + &lt;term&gt;</code>. Pick a preset or
        paste your own — it is validated as you type, and the header chip turns{" "}
        <strong>✓ Valid</strong> when it parses.
      </>
    ),
  },
  {
    target: ".genome-panel",
    title: "Meet the genome",
    body: (
      <>
        The genome is a list of integers called <strong>codons</strong>. Each time a rule is
        chosen, one codon is read and <code>codon % number_of_choices</code> picks which production
        to use. Generate a random genome, or edit the numbers directly.
      </>
    ),
  },
  {
    target: ".controls-panel",
    title: "Step through the mapping",
    body: (
      <>
        Press play, or walk one expansion at a time with the arrows (or <code>space</code>). The
        highlighted codon in the strip is the exact one being consumed this step.
      </>
    ),
  },
  {
    target: ".tree-panel",
    title: "Watch the tree grow",
    body: (
      <>
        Each step rewrites the leftmost non-terminal, so the derivation tree grows from the root
        down. Drag to pan, scroll to zoom, and hover any node to see its step, codon, and choice.
        The <code>⤓</code> button exports the tree (SVG/PNG) or the whole derivation (text/CSV).
      </>
    ),
  },
  {
    target: ".phenotype-panel",
    title: "Read the result",
    body: (
      <>
        The partial phenotype is the program built so far. If a derivation stops early it is
        because the genome ran out — turn on <strong>Wrap</strong> or add codons — or a branch hit{" "}
        <strong>Max depth</strong>.
      </>
    ),
  },
  {
    target: ".evolution-panel",
    title: "Then let it evolve",
    body: (
      <>
        In the playground, GRAPE mutates and crosses genomes while DEAP handles selection, and
        fitness streams in one generation at a time. Click <strong>Load</strong> on any individual
        to pull its genome back into the editor and step through exactly why it looks that way.
      </>
    ),
  },
  {
    target: ".guide-toggle",
    title: "That’s the whole loop",
    body: (
      <>
        Reopen this tour or read the full reference with the <strong>Guide</strong> button. Everything
        you did here stayed on your machine.
      </>
    ),
  },
];
