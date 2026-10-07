import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { suggestSettings } from "./api";
import type { GrammarSuggestion } from "./api";
import { Controls } from "./components/Controls";
import { DerivationTree } from "./components/DerivationTree";
import { EngineBanner } from "./components/EngineBanner";
import { EvolutionPanel } from "./components/EvolutionPanel";
import { FeedbackDialog } from "./components/FeedbackDialog";
import { GenomeEditor } from "./components/GenomeEditor";
import { GrammarPanel } from "./components/GrammarPanel";
import { GrammarLibrary } from "./components/GrammarLibrary";
import { HelpPanel } from "./components/HelpPanel";
import { ParamsPanel } from "./components/ParamsPanel";
import { PhenotypeView } from "./components/PhenotypeView";
import { Resizer } from "./components/Resizer";
import { StatusBanner } from "./components/StatusBanner";
import { StepDetail } from "./components/StepDetail";
import { Tutorial } from "./components/Tutorial";
import { TOUR_SEEN_KEY, TUTORIAL_STEPS } from "./components/tutorialSteps";
import { useUrlState } from "./hooks/useUrlState";
import { usePlayback } from "./hooks/usePlayback";
import { buildDerivationTree } from "./lib/derivation";
import {
  readLayout,
  writeLayout,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  STRIP_BOUNDS,
} from "./lib/layoutStorage";
import type { LayoutSizes, StripId } from "./lib/layoutStorage";
import type { PersistedState } from "./lib/serialization";
import { DEFAULT_PARAMS, useVisualizer } from "./state";

function App() {
  const { state, dispatch, map, mapSoon, applyGrammar, generateGenome } = useVisualizer();
  const [genomeLength, setGenomeLength] = useState(10);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<GrammarSuggestion | null>(null);
  const [layout, setLayout] = useState<LayoutSizes>(() => readLayout());
  const stripRefs = useRef<Partial<Record<StripId, HTMLElement | null>>>({});
  const [measured, setMeasured] = useState<Partial<Record<StripId, number>>>({});
  const pendingStepRef = useRef<number | null>(null);
  const pendingTimerRef = useRef<number | null>(null);

  const startTour = useCallback(() => {
    setHelpOpen(false);
    setTourOpen(true);
  }, []);

  // Fill in a genome and depth that actually complete the current grammar.
  const applySuggestedSettings = useCallback(async () => {
    setSuggesting(true);
    try {
      const result = await suggestSettings(state.grammarText, state.params.consumption);
      setSuggestion(result);
      const params = { ...state.params, max_depth: result.suggested_max_depth };
      dispatch({ type: "SET_PARAMS", params: { max_depth: result.suggested_max_depth } });
      dispatch({ type: "SET_GENOME", genome: result.genome });
      setGenomeLength(result.genome.length);
      // Show the finished derivation rather than the bare root.
      pendingStepRef.current = Number.MAX_SAFE_INTEGER;
      await map({ params, genome: result.genome });
    } catch (error) {
      dispatch({
        type: "MAP_ERROR",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSuggesting(false);
    }
  }, [state.grammarText, state.params, dispatch, map]);

  const closeTour = useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {
      // localStorage can be unavailable (private mode); the tour still closes.
    }
    setTourOpen(false);
  }, []);

  // Show the tour automatically on a first visit, unless the URL already carries
  // shared state (in which case the visitor came here to look at something).
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(TOUR_SEEN_KEY) === "1";
    } catch {
      seen = false;
    }
    const hasSharedState = new URLSearchParams(window.location.search).has("grammar");
    if (!seen && !hasSharedState) setTourOpen(true);
  }, []);
  const trace = useMemo(() => state.result?.trace ?? [], [state.result]);
  const currentStep = Math.max(-1, Math.min(state.currentStep, trace.length - 1));
  const activeStep = currentStep >= 0 ? trace[currentStep] : null;
  const treeRoot = useMemo(
    () => buildDerivationTree(trace, currentStep + 1),
    [trace, currentStep],
  );
  const phenotype =
    activeStep?.partial_phenotype ?? (trace.length > 0 ? trace[0].non_terminal : "");
  const canStepForward = state.result !== null && currentStep < trace.length - 1;

  // Any explicit step cancels a pending URL restore, so a restored step never
  // fights the controls.
  const clearPendingStep = useCallback(() => {
    pendingStepRef.current = null;
  }, []);

  const { playing, speed, togglePlay, stop, setSpeed } = usePlayback({
    onStep: () => {
      clearPendingStep();
      dispatch({ type: "STEP_FWD" });
    },
    canStep: canStepForward,
  });

  useEffect(() => {
    stop();
  }, [state.result, stop]);

  useEffect(() => {
    const timer = window.setTimeout(() => writeLayout(layout), 300);
    return () => window.clearTimeout(timer);
  }, [layout]);

  // Before a panel has been resized it takes whatever space it needs, so a drag
  // has to start from its real height rather than a guess.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      setMeasured((previous) => {
        const next = { ...previous };
        let changed = false;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.strip as StripId | undefined;
          if (!id) continue;
          const box = entry.borderBoxSize?.[0]?.blockSize;
          const height = Math.round(box ?? entry.contentRect.height);
          if (height > 0 && next[id] !== height) {
            next[id] = height;
            changed = true;
          }
        }
        return changed ? next : previous;
      });
    });
    for (const element of Object.values(stripRefs.current)) {
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  const setStrip = useCallback((id: StripId, height: number) => {
    setLayout((previous) => ({ ...previous, strips: { ...previous.strips, [id]: height } }));
  }, []);

  const stripProps = (id: StripId) => ({
    "data-strip": id,
    ref: (element: HTMLElement | null) => {
      stripRefs.current[id] = element;
    },
    className: `strip ${id}-panel${layout.strips[id] !== undefined ? " is-resized" : ""}`,
    style:
      layout.strips[id] !== undefined
        ? ({ "--strip-height": `${layout.strips[id]}px` } as React.CSSProperties)
        : undefined,
  });

  const stripResizer = (id: StripId, label: string, fallback: number) => (
    <Resizer
      className="resizer-strip"
      orientation="horizontal"
      value={layout.strips[id] ?? measured[id] ?? fallback}
      onChange={(height) => setStrip(id, height)}
      min={STRIP_BOUNDS[id].min}
      max={STRIP_BOUNDS[id].max}
      label={label}
    />
  );

  const activeRule = activeStep
    ? { nonTerminal: activeStep.non_terminal, choice: activeStep.choice }
    : null;

  const persistedState = useMemo<PersistedState>(
    () => ({
      grammarText: state.grammarText,
      genome: state.genome,
      params: state.params,
      currentStep,
      genomeLength,
    }),
    [state.grammarText, state.genome, state.params, currentStep, genomeLength],
  );

  const applyRestored = useCallback(
    (restored: Partial<PersistedState>) => {
      if (restored.grammarText !== undefined) {
        dispatch({ type: "SET_GRAMMAR_TEXT", grammarText: restored.grammarText });
      }
      if (restored.genome !== undefined) {
        dispatch({ type: "SET_GENOME", genome: restored.genome });
      }
      if (restored.params !== undefined) {
        dispatch({ type: "SET_PARAMS", params: { ...DEFAULT_PARAMS, ...restored.params } });
      }
      if (restored.genomeLength !== undefined) setGenomeLength(restored.genomeLength);
      pendingStepRef.current = restored.currentStep ?? null;
      void map({
        grammarText: restored.grammarText,
        genome: restored.genome,
        params: restored.params ? { ...DEFAULT_PARAMS, ...restored.params } : undefined,
      });
    },
    [dispatch, map],
  );

  // A restored step is re-applied whenever a fresh mapping lands. Restore and
  // the mount auto-map can race, and the last MAP_SUCCESS resets the step to
  // -1, so keep the pending step until no new mapping arrives for a moment.
  useEffect(() => {
    const pending = pendingStepRef.current;
    if (pending === null || !state.result) return;
    if (state.result.trace.length === 0) {
      pendingStepRef.current = null;
      return;
    }
    const target = Math.min(pending, state.result.trace.length - 1);
    if (state.currentStep !== target) {
      dispatch({ type: "JUMP_TO_STEP", step: target });
    }
  }, [state.result, state.currentStep, dispatch]);

  useEffect(() => {
    if (pendingStepRef.current === null) return;
    if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = window.setTimeout(() => {
      pendingStepRef.current = null;
    }, 1200);
    return () => {
      if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
    };
  }, [state.result, state.currentStep]);

  useUrlState({ state: persistedState, onRestore: applyRestored });

  const grammarChip =
    state.grammarStatus === "valid"
      ? `✓ Valid — ${state.grammarRules ?? 0} rules`
      : state.grammarStatus === "validating"
        ? "Checking…"
        : state.grammarStatus === "invalid"
          ? "✗ Invalid"
          : "Not checked";
  const mappingChip = state.result?.status ?? "no mapping";

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <h1>GE Visualizer</h1>
          <span className="version">v0.1</span>
        </div>
        <div className="header-chips">
          <button
            type="button"
            className="guide-toggle tour-toggle"
            onClick={startTour}
            aria-label="Start the tour"
          >
            Tour
          </button>
          <button
            type="button"
            className="guide-toggle"
            onClick={() => setHelpOpen(true)}
            aria-label="Open guide"
          >
            Guide
          </button>
          <button
            type="button"
            className="guide-toggle"
            onClick={() => setFeedbackOpen(true)}
            aria-label="Send feedback"
          >
            Feedback
          </button>
          <span className="header-chip" data-state={state.grammarStatus} title="Grammar status">
            {grammarChip}
          </span>
          <span className="header-chip" data-state={state.result?.status ?? "none"} title="Mapping status">
            {mappingChip}
          </span>
        </div>
      </header>
      <EngineBanner />
      <div
        className="dashboard"
        style={
          layout.sidebarWidth !== null
            ? ({ "--sidebar-width": `${layout.sidebarWidth}px` } as React.CSSProperties)
            : undefined
        }
      >
        <aside className="sidebar grammar-panel">
          <GrammarPanel
            grammarText={state.grammarText}
            grammarStatus={state.grammarStatus}
            grammarError={state.grammarError}
            grammarRules={state.grammarRules}
            onChange={(grammarText) => {
              setSuggestion(null);
              dispatch({ type: "SET_GRAMMAR_TEXT", grammarText });
            }}
            onApply={applyGrammar}
            onSuggestSettings={() => void applySuggestedSettings()}
            suggesting={suggesting}
            suggestion={suggestion}
            activeRule={activeRule}
          />
          <GrammarLibrary
            grammarText={state.grammarText}
            onLoad={(grammarText) => {
              setSuggestion(null);
              void applyGrammar(grammarText);
            }}
          />
        </aside>
        <Resizer
          className="resizer-sidebar"
          orientation="vertical"
          value={layout.sidebarWidth ?? 340}
          onChange={(sidebarWidth) => setLayout((previous) => ({ ...previous, sidebarWidth }))}
          min={SIDEBAR_MIN}
          max={SIDEBAR_MAX}
          label="Resize the grammar panel"
        />
        <main className={`main${Object.keys(layout.strips).length > 0 ? " is-resized" : ""}`}>
          <section {...stripProps("controls")}>
            <Controls
              hasResult={state.result !== null}
              currentStep={currentStep}
              totalSteps={trace.length}
              error={state.error}
              playing={playing}
              speed={speed}
              consumption={state.params.consumption}
              onStepBack={() => {
                clearPendingStep();
                dispatch({ type: "STEP_BACK" });
              }}
              onStepForward={() => {
                clearPendingStep();
                dispatch({ type: "STEP_FWD" });
              }}
              onStepLast={() => {
                clearPendingStep();
                if (trace.length > 0) dispatch({ type: "JUMP_TO_STEP", step: trace.length - 1 });
              }}
              onJump={(step) => {
                clearPendingStep();
                dispatch({ type: "JUMP_TO_STEP", step });
              }}
              onReset={() => {
                clearPendingStep();
                dispatch({ type: "RESET_PLAYBACK" });
              }}
              onTogglePlay={togglePlay}
              onSpeedChange={setSpeed}
            />
          </section>
          {stripResizer("controls", "Resize the playback controls", 44)}
          <section {...stripProps("genome")}>
            <GenomeEditor
              genome={state.result?.genome ?? state.genome}
              bitsPerCodon={state.params.bits_per_codon}
              activeCodonIndex={activeStep?.codon_index ?? null}
              activeConsumed={activeStep?.consumed ?? null}
              activeWraps={activeStep?.wraps ?? 0}
              onChange={(genome) => dispatch({ type: "SET_GENOME", genome })}
              onAutoMap={(genome) => mapSoon({ genome })}
              onGenerate={() => generateGenome(genomeLength)}
            />
            <ParamsPanel
              params={state.params}
              genomeLength={genomeLength}
              onChange={(partial) => {
                const nextParams = { ...state.params, ...partial };
                dispatch({ type: "SET_PARAMS", params: partial });
                mapSoon({ params: nextParams });
              }}
              onGenomeLengthChange={setGenomeLength}
            />
          </section>
          {stripResizer("genome", "Resize the genome editor", 86)}
          <section {...stripProps("tree")}>
            {state.result && state.result.status !== "complete" && (
              <StatusBanner status={state.result.status} params={state.params} />
            )}
            {trace.length > 0 ? (
              <DerivationTree root={treeRoot} currentStep={currentStep} trace={trace} />
            ) : (
              <p className="panel-empty">
                {state.loading ? "Mapping…" : "No trace yet — click “Apply grammar & map”."}
              </p>
            )}
          </section>
          {stripResizer("tree", "Resize the derivation tree", 420)}
          <section {...stripProps("phenotype")}>
            <PhenotypeView phenotype={phenotype} status={state.result?.status ?? null} />
            <StepDetail step={activeStep} totalSteps={trace.length} />
          </section>
          {stripResizer("phenotype", "Resize the phenotype and step detail", 100)}
          <section className="strip evolution-panel">
            <EvolutionPanel
              grammarText={state.grammarText}
              grammarValid={state.grammarStatus === "valid"}
              onUseGrammar={applyGrammar}
              onDrillDown={(genome) => {
                dispatch({ type: "SET_GENOME", genome });
                void map({ genome });
              }}
            />
          </section>
        </main>
      </div>
      <HelpPanel
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onStartTour={startTour}
        onSendFeedback={() => {
          setHelpOpen(false);
          setFeedbackOpen(true);
        }}
      />
      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        context={{
          grammarStatus: state.grammarStatus,
          rules: state.grammarRules,
          mappingStatus: state.result?.status ?? "no mapping",
          steps: state.result?.trace.length ?? 0,
        }}
      />
      {tourOpen && <Tutorial steps={TUTORIAL_STEPS} onClose={closeTour} />}
    </div>
  );
}

export default App;
