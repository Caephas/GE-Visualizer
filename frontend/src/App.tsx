import { useEffect, useMemo, useState } from "react";

import { Controls } from "./components/Controls";
import { DerivationTree } from "./components/DerivationTree";
import { EvolutionPanel } from "./components/EvolutionPanel";
import { GenomeEditor } from "./components/GenomeEditor";
import { GrammarPanel } from "./components/GrammarPanel";
import { ParamsPanel } from "./components/ParamsPanel";
import { PhenotypeView } from "./components/PhenotypeView";
import { StatusBanner } from "./components/StatusBanner";
import { StepDetail } from "./components/StepDetail";
import { usePlayback } from "./hooks/usePlayback";
import { buildDerivationTree } from "./lib/derivation";
import { useVisualizer } from "./state";

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>GE Visualizer</h1>
        {state.result && (
          <span className="status-chip" data-status={state.result.status}>
            {state.result.status}
          </span>
        )}
      </header>
      <div className="dashboard">
        <section className="panel grammar-panel">
          <h2>Grammar</h2>
          <GrammarPanel
            grammarText={state.grammarText}
            onChange={(grammarText) => dispatch({ type: "SET_GRAMMAR_TEXT", grammarText })}
            onApply={applyGrammar}
            activeRule={activeRule}
          />
        </section>
        <section className="panel controls-panel">
          <Controls
            hasResult={state.result !== null}
            currentStep={currentStep}
            totalSteps={trace.length}
            loading={state.loading}
            error={state.error}
            playing={playing}
            speed={speed}
            consumption={state.params.consumption}
            onMap={() => void map()}
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
        <section className="panel genome-panel">
          <h2>Genome & parameters</h2>
          <div className="genome-panel-content">
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
          </div>
        </section>
        <section className="panel tree-panel">
          <h2>Derivation tree</h2>
          {state.result && state.result.status !== "complete" && (
            <StatusBanner status={state.result.status} params={state.params} />
          )}
          {trace.length > 0 ? (
            <DerivationTree root={treeRoot} currentStep={currentStep} />
          ) : (
            <p className="panel-empty">{state.loading ? "Mapping…" : "No trace yet — click “Map genome”."}</p>
          )}
        </section>
        <section className="panel phenotype-panel">
          <PhenotypeView phenotype={phenotype} status={state.result?.status ?? null} />
          <StepDetail step={activeStep} totalSteps={trace.length} />
        </section>
        <section className="panel evolution-panel">
          <h2>Evolution</h2>
          <EvolutionPanel
            grammarText={state.grammarText}
            onDrillDown={(genome) => {
              dispatch({ type: "SET_GENOME", genome });
              void map({ genome });
            }}
          />
        </section>
      </div>
    </div>
  );
}

export default App;
