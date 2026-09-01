# Claude Design prompt — GE Visualizer frontend

Paste the block below into Claude Design. The zip it exports will be integrated
into the existing repo (`backend/` stays as-is; `frontend/` gets replaced).

---

You are designing the frontend for **GE Visualizer**, a single-page web app that
visualizes Grammatical Evolution (GE): users load a BNF grammar, generate or edit a
genome (a list of codons), then watch — step by step — how codons are consumed, how
`codon % number_of_choices` picks a production rule, how the derivation tree is
constructed, and how the final phenotype emerges. A separate evolution playground
runs a genetic algorithm and lets users drill into any individual's mapping.

## Stack and constraints

- React 19 + TypeScript (strict) + Vite, single page, **no router**, **no Three.js**,
  **no UI kit/Tailwind**.
- Plain CSS in one `styles.css` driven by CSS custom properties (tokens below).
- The derivation tree is an interactive **SVG** (d3-hierarchy's tidy tree layout is
  allowed; a hand-rolled tidy layout is also fine).
- All data comes from a FastAPI backend at `/api` (Vite dev proxy). The frontend is
  purely a client: fetch, render, animate. Do not invent endpoints or data shapes.
- Accessibility: keyboard operable, visible focus rings, `prefers-reduced-motion`
  respected (freeze decorative animation, keep timers).

## Design language — "Anthropic: scientific field journal on warm parchment" (light)

The interface should read like a curated research publication on warm paper.

- **Canvas** `#f0eee6` (page background) · **Card surface** `#faf9f5` · **Oat** `#e3dacc`
  (secondary warm surfaces, hovers) · **Manilla** `#f5e3c7` (highlights, active fills,
  featured rows) · **Ink** `#141413` (text, focus, strong lines — near-black, warm) ·
  **Ink muted** `#3d3d3a` · **Ink faint** `#87867f` (outlined button borders) ·
  **Cloud** `#b0aea5` (disabled/muted text) · **Stone** `#cccbc8` (hairline borders).
- **Clay** `#d97757` (hover `#c6613f`) is the ONLY chromatic accent. It appears on
  exactly one element per view: the primary action button. Never use it for
  decorative highlights, charts, or status colors.
- Semantic status colors (muted to fit the palette): ok `#6d8a63`,
  warn `#b5893f`, danger `#c6613f`.
- Typography split: serif (`Georgia, "Source Serif Pro", Charter, serif`) for the app
  title and any editorial headings; sans (`Inter, system-ui, Arial`) for UI chrome,
  labels, buttons; mono (`"JetBrains Mono", ui-monospace, Menlo, Consolas`) for ALL
  data — codons, bit boxes, phenotype strings, grammar rules, tables, timers.
- Shape: cards `24px` radius, hairline `1px` stone borders, **no shadows** (elevation
  comes from tone shift). Outlined buttons `12px` radius; the single filled clay CTA
  uses the signature bottom-only `8px` radius (`border-radius: 0 0 8px 8px`).
- Focus rings: `2px` ink outline.

## Layout (desktop)

Header bar: serif app title "GE Visualizer" + status chip. Below, a dashboard grid:

- **Left column (fixed ~340px, full height): Grammar panel** — example grammar
  selector, grammar textarea, live validation status, "Apply grammar & map" button,
  parsed rule list with numbered productions, and a grammar library (save/load/
  delete/export/import).
- **Top right: Controls bar** — Play/Pause, Map genome (the single clay CTA),
  reset, step back/forward, step slider, speed slider, consumption mode chip,
  keyboard-shortcut hints, error banner with retry.
- **Below controls: Genome & parameters row** — codon editor (left, flexible) and
  parameters panel (right, ~290px).
- **Center stage (largest area): Derivation tree** — spans the full main column.
  Interactive: auto-fits on load, drag to pan, wheel + buttons to zoom toward
  cursor, Fit button, pop-in animation for newly created nodes, hover tooltips with
  step/codon/choice, active node pulse, node count in a corner.
- **Bottom row (capped height, side by side): Phenotype & step detail** and
  **Evolution playground**.

On narrow screens (<1100px) everything stacks in one scrolling column.

## Components and behavior

Build these components (same file names and exported names, so the zip can drop into
the existing repo):

1. **GrammarPanel** (`grammarText`, `grammarStatus: "unknown"|"validating"|"valid"|"invalid"`,
   `grammarError`, `grammarRules`, `onChange`, `onApply`, `activeRule`). Status line:
   "Checking grammar…" / "✓ Grammar valid — N rules" / "✗ Invalid grammar" + reason.
   Rule list shows each `NT ::=` with productions numbered 0..n; the production chosen
   by the current step is highlighted (manilla fill + ink inset bar).
2. **GrammarLibrary** (`grammarText`, `onLoad`): name + save current, load, delete,
   export JSON, import JSON.
3. **GenomeEditor** (`genome`, `bitsPerCodon`, `activeCodonIndex`, `activeConsumed`,
   `activeWraps`, `onChange`, `onAutoMap`, `onGenerate`): editable codon number inputs
   (index label above each); "Binary view" toggle renders each bit as a clickable box
   (edits round-trip losslessly to codons); "Generate genome" button; active codon
   highlighted with ink border + manilla fill + pulse; not-consumed codons dashed and
   faded; "↻ wrapped ×N" badge when wrapping occurred.
4. **ParamsPanel** (`params`, `genomeLength`, `onChange`, `onGenomeLengthChange`):
   consumption select (eager/lazy), wrap checkbox, codon size, bits per codon, max
   depth, genome length (number fields, invalid values blocked with an inline message).
   Edits re-map automatically (debounced ~400ms).
5. **Controls** (`hasResult`, `currentStep`, `totalSteps`, `loading`, `error`, `canMap`,
   `playing`, `speed`, `consumption`, handlers): play/pause, Map (disabled unless
   `canMap`), reset, step back/forward, range slider over steps, speed slider,
   consumption chip, shortcut hints (Space play · ←/→ step · Home/End jump), error
   banner. Global keyboard shortcuts must be ignored while typing in inputs/textareas.
6. **DerivationTree** (`root`, `currentStep`): see layout notes above. Node colors:
   root ink, non-terminal oat, terminal manilla; edges stone hairline curves; labels
   mono. Tooltips show "step N · codon genome[i] → choice C" for expanded nodes and
   "terminal · created in step N" for leaves.
7. **PhenotypeView** (`phenotype`, `status`): mono text of the current partial
   phenotype + status chip (complete/invalid/depth-limited).
8. **StepDetail** (`step`, `totalSteps`): current step card — non-terminal, codon
   consumed (`genome[i] = v → v % n = choice`) or "no codon consumed (single
   production rule)", expansion text, depth, wrap count if > 0.
9. **StatusBanner** (`status`, `params`): explanatory banner when the mapping is
   `depth-limited` or `invalid` (mention max_depth / wrapping).
10. **EvolutionPanel** (`grammarText`, `grammarValid`, `onDrillDown`): problem select
    (String match / Symbolic regression), target input (string match), population,
    generations, crossover rate, mutation rate, seed; Run button (disabled until
    grammar is valid); live fitness chart (best = ink line, mean = dashed cloud line);
    top-20 individuals table (rank, fitness, phenotype, status, Load button); "Load"
    calls `onDrillDown(genome)` which shows that genome in the main dashboard; done
    summary line. Streams results from SSE (below) and updates per generation.

## App-level state and behavior

- Single `useVisualizer` hook (reducer): grammar text, validation status, genome,
  params, map result, current step, loading, error.
- On load: validate grammar → if valid, auto-map. On grammar edits: debounced
  re-validation. Map and evolution Run are disabled unless the grammar is valid.
- Editing genome/params re-maps debounced (~400ms); ignore stale responses.
- URL persistence: serialize `grammar`, `genome` (comma list), `params` (JSON),
  `step`, `len` into the query string; restore on load; debounced `pushState`.
- Playback auto-stops at the last step or when inputs change.
- Eager consumption consumes a codon for every expansion; lazy skips single-option
  rules (shown as not-consumed).

## API contract (consume exactly this)

All requests go to `/api` (dev proxy → `http://127.0.0.1:8000`).

**POST `/api/grammar/validate`** — body `{ "grammar_text": string }` →
`{ "valid": boolean, "rules": number, "start_rule": string|null, "error": string|null }`.

**POST `/api/map`** — body:
```json
{
  "grammar_text": "<expr> ::= <term> | <expr> + <term>\n<term> ::= x | 1",
  "genome": [42, 7, 13],
  "params": {
    "codon_size": 400, "bits_per_codon": 8,
    "consumption": "eager", "max_depth": 40,
    "genome_representation": "codons", "wrap": false
  }
}
```
Response:
```json
{
  "genome": [42, 7, 13],
  "params": { "codon_size": 400, "bits_per_codon": 8, "consumption": "eager",
              "max_depth": 40, "genome_representation": "codons", "wrap": false },
  "trace": [
    { "step": 0, "non_terminal": "<expr>", "codon_index": 0, "codon_value": 42,
      "rule_count": 3, "choice": 0, "expansion": "<term>",
      "partial_phenotype": "<term>", "depth": 2, "wraps": 0,
      "consumed": true, "complete": false }
  ],
  "phenotype": "3 / 3 * 2",
  "status": "complete",
  "summary": { "used_codons": 10, "nodes": 3, "depth": 7, "n_wraps": 0 }
}
```
`status` is one of `complete | invalid | depth-limited`. `genome` in the request is
codon values when `genome_representation === "codons"`, or raw bits (0/1) when
`"binary"`. The response `genome` is always the decoded codon list.

**POST `/api/grammar`** / **GET `/api/grammar`** — upload/store/retrieve the current
grammar (`{ "grammar_text": string }`).

**POST `/api/evolve`** — body:
```json
{
  "grammar_text": "...",
  "problem": "string_match",
  "target": "abc",
  "samples": [], "coeffs": [],
  "population_size": 100, "generations": 30,
  "p_crossover": 0.8, "p_mutation": 0.1,
  "elite_size": 1, "tournament_size": 3,
  "codon_size": 400, "max_depth": 40,
  "min_init_genome_length": 5, "max_init_genome_length": 20,
  "max_genome_length": null, "consumption": "eager",
  "top_k": 20, "seed": 42, "early_stop": true
}
```
Returns a `text/event-stream` of `data: {json}` frames:
- generation: `{ "type": "generation", "gen": 1, "best_fitness": 0.0,
  "mean_fitness": 3.4, "worst_fitness": 9.0, "valid_count": 100,
  "best": {"genome": [...], "phenotype": "...", "fitness": 0.0, "invalid": false},
  "top": [ {individual}, ... ] }`
- done: `{ "type": "done", "generations": 4, "best_fitness": 0.0, "best": {...} }`
- error: `{ "type": "error", "message": "..." }`
Parse frames chunk-safely (frames may split across network chunks).

## Deliverable

Export a zip of a complete Vite + React + TypeScript project (or the `src/` tree with
`package.json` and `tsconfig.json`) implementing everything above, typed strictly,
with the components named as listed, the exact API contract, the design tokens above,
and no placeholder data in the live flows (use the endpoints). Include a short
`README.md` in the zip noting how to run it (`npm install && npm run dev` with the
backend at `:8000`).
