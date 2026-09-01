import { useCallback, useEffect, useMemo, useState } from "react";

import { Controls } from "./components/Controls";
import { DerivationTree } from "./components/DerivationTree";
import { EvolutionPanel } from "./components/EvolutionPanel";
import { GenomeEditor } from "./components/GenomeEditor";
import { GrammarPanel } from "./components/GrammarPanel";
import { GrammarLibrary } from "./components/GrammarLibrary";
import { ParamsPanel } from "./components/ParamsPanel";
import { PhenotypeView } from "./components/PhenotypeView";
import { StatusBanner } from "./components/StatusBanner";
import { StepDetail } from "./components/StepDetail";
import { useUrlState } from "./hooks/useUrlState";
import { usePlayback } from "./hooks/usePlayback";
import { buildDerivationTree } from "./lib/derivation";
import type { PersistedState } from "./lib/serialization";
import { DEFAULT_PARAMS, useVisualizer } from "./state";

function App() {
  const { state, dispatch, map, mapSoon, applyGrammar, generateGenome } = useVisualizer();
  const [genomeLength, setGenomeLength] = useState(10);
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
  const { playing, speed, togglePlay, stop, setSpeed } = usePlayback({
    onStep: () => dispatch({ type: "STEP_FWD" }),
    canStep: canStepForward,
  });

  useEffect(() => {
    stop();
  }, [state.result, stop]);

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
      const step = restored.currentStep;
      void map({
        grammarText: restored.grammarText,
        genome: restored.genome,
        params: restored.params ? { ...DEFAULT_PARAMS, ...restored.params } : undefined,
      }).then(() => {
        if (step !== undefined) dispatch({ type: "JUMP_TO_STEP", step });
      });
    },
    [dispatch, map],
  );

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
          <span className="header-chip" data-state={state.grammarStatus} title="Grammar status">
            {grammarChip}
          </span>
          <span className="header-chip" data-state={state.result?.status ?? "none"} title="Mapping status">
            {mappingChip}
          </span>
        </div>
      </header>
      <div className="dashboard">
        <aside className="sidebar grammar-panel">
          <GrammarPanel
            grammarText={state.grammarText}
            grammarStatus={state.grammarStatus}
            grammarError={state.grammarError}
            grammarRules={state.grammarRules}
            onChange={(grammarText) => dispatch({ type: "SET_GRAMMAR_TEXT", grammarText })}
            onApply={applyGrammar}
            activeRule={activeRule}
          />
          <GrammarLibrary grammarText={state.grammarText} onLoad={applyGrammar} />
        </aside>
        <main className="main">
          <section className="strip controls-panel">
            <Controls
              hasResult={state.result !== null}
              currentStep={currentStep}
              totalSteps={trace.length}
              error={state.error}
              playing={playing}
              speed={speed}
              consumption={state.params.consumption}
              onStepBack={() => dispatch({ type: "STEP_BACK" })}
              onStepForward={() => dispatch({ type: "STEP_FWD" })}
              onStepLast={() => {
                if (trace.length > 0) dispatch({ type: "JUMP_TO_STEP", step: trace.length - 1 });
              }}
              onJump={(step) => dispatch({ type: "JUMP_TO_STEP", step })}
              onReset={() => dispatch({ type: "RESET_PLAYBACK" })}
              onTogglePlay={togglePlay}
              onSpeedChange={setSpeed}
            />
          </section>
          <section className="strip genome-panel">
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
          <section className="strip tree-panel">
            {state.result && state.result.status !== "complete" && (
              <StatusBanner status={state.result.status} params={state.params} />
            )}
            {trace.length > 0 ? (
              <DerivationTree root={treeRoot} currentStep={currentStep} />
            ) : (
              <p className="panel-empty">{state.loading ? "Mapping…" : "No trace yet — click “Map genome”."}</p>
            )}
          </section>
          <section className="strip phenotype-panel">
            <PhenotypeView phenotype={phenotype} status={state.result?.status ?? null} />
            <StepDetail step={activeStep} totalSteps={trace.length} />
          </section>
          <section className="strip evolution-panel">
            <EvolutionPanel
              grammarText={state.grammarText}
              grammarValid={state.grammarStatus === "valid"}
              onDrillDown={(genome) => {
                dispatch({ type: "SET_GENOME", genome });
                void map({ genome });
              }}
            />
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
