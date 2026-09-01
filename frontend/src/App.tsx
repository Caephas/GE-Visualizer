import { useMemo } from "react";

import { Controls } from "./components/Controls";
import { DerivationTree } from "./components/DerivationTree";
import { GenomeStrip } from "./components/GenomeStrip";
import { GrammarPanel } from "./components/GrammarPanel";
import { PhenotypeView } from "./components/PhenotypeView";
import { StepDetail } from "./components/StepDetail";
import { buildDerivationTree } from "./lib/derivation";
import { useVisualizer } from "./state";

function App() {
  const { state, dispatch, map, applyGrammar, generateGenome } = useVisualizer();
  const trace = useMemo(() => state.result?.trace ?? [], [state.result]);
  const currentStep = Math.max(-1, Math.min(state.currentStep, trace.length - 1));
  const activeStep = currentStep >= 0 ? trace[currentStep] : null;
  const treeRoot = useMemo(
    () => buildDerivationTree(trace, currentStep + 1),
    [trace, currentStep],
  );
  const phenotype =
    activeStep?.partial_phenotype ?? (trace.length > 0 ? trace[0].non_terminal : "");

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
          />
        </section>
        <section className="panel controls-panel">
          <Controls
            hasResult={state.result !== null}
            currentStep={currentStep}
            totalSteps={trace.length}
            loading={state.loading}
            error={state.error}
            onMap={() => void map()}
            onStepBack={() => dispatch({ type: "STEP_BACK" })}
            onStepForward={() => dispatch({ type: "STEP_FWD" })}
            onJump={(step) => dispatch({ type: "JUMP_TO_STEP", step })}
            onReset={() => dispatch({ type: "RESET_PLAYBACK" })}
          />
        </section>
        <section className="panel genome-panel">
          <h2>Genome</h2>
          <GenomeStrip
            genome={state.result?.genome ?? state.genome}
            bitsPerCodon={state.params.bits_per_codon}
            activeCodonIndex={activeStep?.codon_index ?? null}
            activeConsumed={activeStep?.consumed ?? null}
            onGenerate={generateGenome}
          />
        </section>
        <section className="panel tree-panel">
          <h2>Derivation tree</h2>
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
      </div>
    </div>
  );
}

export default App;
