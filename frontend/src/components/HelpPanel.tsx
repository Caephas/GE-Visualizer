import { useEffect, useRef } from "react";

export interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  onStartTour?: () => void;
  onSendFeedback?: () => void;
}

function Kbd({ children }: { children: string }) {
  return <kbd>{children}</kbd>;
}

export function HelpPanel({ open, onClose, onStartTour, onSendFeedback }: HelpPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-label="Using the visualizer">
      <div className="help-drawer">
        <header className="help-header">
          <span className="help-title">Using the visualizer</span>
          <button
            ref={closeRef}
            type="button"
            className="help-close"
            onClick={onClose}
            aria-label="Close guide"
          >
            ×
          </button>
        </header>

        {onStartTour && (
          <section className="help-section">
            <button type="button" className="button-primary help-action-button" onClick={onStartTour}>
              Take the interactive tour
            </button>
            <p className="help-paragraph">
              A one-minute walkthrough that points at each part of the screen, in order.
            </p>
          </section>
        )}

        <section className="help-section">
          <h3>Quick start</h3>
          <ol className="help-list help-ordered">
            <li>Pick an example grammar or paste your own BNF.</li>
            <li>Wait for the header chip to turn green (✓ Valid). Invalid grammars are rejected before mapping.</li>
            <li>Click <strong>Apply grammar &amp; map</strong> — the sidebar shows the parsed rules.</li>
            <li>Step through the derivation tree with the controls and watch codons get consumed.</li>
            <li>
              If nothing maps, click <strong>Suggest working settings</strong>: it works out a genome
              and depth that complete your grammar, and says how many codons each consumption mode
              needs.
            </li>
          </ol>
        </section>

        <section className="help-section">
          <h3>Controls</h3>
          <ul className="help-list">
            <li><Kbd>Space</Kbd> play / pause the mapping</li>
            <li><Kbd>←</Kbd> <Kbd>→</Kbd> step backward / forward</li>
            <li><Kbd>Home</Kbd> <Kbd>End</Kbd> jump to start / end</li>
            <li>Drag the tree to pan, scroll to zoom, use <span className="help-mono">+ − ⊞</span> to zoom and fit</li>
            <li>Hover any tree node to see its step, codon, and choice</li>
            <li><span className="help-mono">⤓</span> in the tree toolbar exports the tree as SVG or PNG, or the derivation as text / CSV</li>
            <li>Drag any divider to resize a panel — the grammar sidebar, the tree, or any panel in the middle column</li>
          </ul>
        </section>

        <section className="help-section">
          <h3>Settings that matter</h3>
          <dl className="help-dl">
            <dt>Genome length</dt>
            <dd>How many codons the mapper may consume. If you see <em>genome exhausted</em>, raise this. The Grover grammar needs roughly 17 codons per iteration — start at 40–80.</dd>
            <dt>Wrap</dt>
            <dd>When on, the genome is reused after the last codon, so a short genome can build long programs. Off, the derivation stops when codons run out.</dd>
            <dt>Max depth</dt>
            <dd>How deep the derivation tree may grow before truncation. Recursive grammars (Grover iterations, nested gates) eat depth quickly — 40 fits one iteration, use 200–400 for real programs.</dd>
            <dt>Consumption</dt>
            <dd><span className="help-mono">eager</span> consumes a codon on every expansion; <span className="help-mono">lazy</span> skips single-choice rules and stretches the genome further.</dd>
            <dt>Codon size</dt>
            <dd>Upper bound for random codon values. 400 is the classic GE default; higher = more variety per choice.</dd>
          </dl>
        </section>

        <section className="help-section">
          <h3>Reading the status</h3>
          <ul className="help-list">
            <li><span className="status-dot status-dot-ok" /> <strong>complete</strong> — every non-terminal expanded to a final phenotype.</li>
            <li><span className="status-dot status-dot-warn" /> <strong>depth-limited</strong> — a branch exceeded Max depth. Raise it.</li>
            <li><span className="status-dot status-dot-danger" /> <strong>invalid</strong> — non-terminals left over. Enable Wrap or lengthen the genome.</li>
          </ul>
        </section>

        <section className="help-section">
          <h3>Evolution playground</h3>
          <p className="help-paragraph">
            Run evolves the current grammar with GRAPE/DEAP, streaming fitness per generation into the chart.
            Click <strong>Load</strong> on any individual to copy its genome into the editor and map it —
            then step through exactly why that program looks the way it does.
          </p>
          <p className="help-paragraph">
            <strong>Generations</strong> opens a drawer where you can step back through the run and see
            what the operators actually did. Each offspring's genome is coloured by where every codon
            came from — <em>from parent A</em>, <em>from parent B</em>, <em>mutated</em>, or
            <em>carried over</em> by elitism — with the mutations spelled out and the fitness of child
            versus parents. The summary above the list counts how often crossover and mutation
            improved on their parents in that generation.
          </p>
          <p className="help-paragraph">
            Three problems are built in: string match, symbolic regression, and
            <strong>Custom (Python)</strong>, where you write your own{" "}
            <span className="help-mono">def fitness(phenotype)</span>. It runs in your browser with the
            standard library only, and there is a bundled Grover example to start from.
          </p>
          <p className="help-paragraph">
            Pick a problem and the panel offers a matching grammar if yours can't express it — one
            click and you're ready to run. Click the fitness number on any row to see exactly how
            that score was calculated. If the target is unreachable it says so before you run: a
            warning names any character the grammar cannot produce, or reports that no derivation
            produces that string.
          </p>
          <p className="help-paragraph">
            The whole run happens in your browser, so keep the population modest — around 300 or fewer.
            Large runs (big population × generations) can take minutes and make the tab feel stuck.
          </p>
        </section>

        <section className="help-section">
          <h3>Send feedback</h3>
          <p className="help-paragraph">
            Found a bug or have an idea? Open a prefilled GitHub issue — it includes your current
            grammar, genome, and settings so it is easy to reproduce.
          </p>
          {onSendFeedback && (
            <button type="button" className="button-primary help-action-button" onClick={onSendFeedback}>
              Send feedback
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
