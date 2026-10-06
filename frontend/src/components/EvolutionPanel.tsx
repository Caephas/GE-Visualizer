import { Fragment, useEffect, useState } from "react";

import { analyseTarget, explainFitness, streamEvolution } from "../api";
import type { TargetReachability } from "../api";
import { TOY_PROBLEMS } from "../examples/problems";
import type { EvolutionConfig, EvolutionEvent, EvolvedIndividual } from "../types";

export interface EvolutionPanelProps {
  grammarText: string;
  grammarValid: boolean;
  onDrillDown: (genome: number[]) => void;
  onUseGrammar: (grammarText: string) => void;
}

type GenerationEvent = Extract<EvolutionEvent, { type: "generation" }>;

// Rough guidance for what stays snappy in a browser tab. Every generation maps
// the whole population several times (selection, crossover, mutation, scoring),
// so the real cost is population_size * generations.
const HEAVY_POPULATION = 400;
const HEAVY_WORKLOAD = 15000;
const MAX_POPULATION = 2000;
const MAX_GENERATIONS = 500;

function clampField(raw: string, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.trunc(value)), max);
}

function FitnessChart({ events }: { events: GenerationEvent[] }) {
  if (events.length === 0) return null;
  const width = 420;
  const height = 120;
  const maxGen = events[events.length - 1].gen;
  const maxFitness = Math.max(...events.map((event) => event.best_fitness), ...events.map((event) => event.mean_fitness), 1);

  const line = (key: "best_fitness" | "mean_fitness") =>
    events
      .map((event) => {
        const x = (event.gen / maxGen) * (width - 20) + 10;
        const y = height - 10 - (Math.min(event[key], maxFitness) / maxFitness) * (height - 20);
        return `${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg className="fitness-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fitness over generations">
      <polyline points={line("mean_fitness")} className="chart-line chart-line-mean" fill="none" />
      <polyline points={line("best_fitness")} className="chart-line chart-line-best" fill="none" />
    </svg>
  );
}

function formatFitness(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function EvolutionPanel({
  grammarText,
  grammarValid,
  onDrillDown,
  onUseGrammar,
}: EvolutionPanelProps) {
  const [problem, setProblem] = useState<"string_match" | "symbolic_regression">("string_match");
  const [target, setTarget] = useState(TOY_PROBLEMS[0].defaultTarget);
  const [populationSize, setPopulationSize] = useState(100);
  const [generations, setGenerations] = useState(30);
  const [crossoverRate, setCrossoverRate] = useState(0.8);
  const [mutationRate, setMutationRate] = useState(0.1);
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<GenerationEvent[]>([]);
  const [done, setDone] = useState<Extract<EvolutionEvent, { type: "done" }> | null>(null);
  const [explain, setExplain] = useState<{
    key: string;
    loading: boolean;
    lines: string[];
    error?: string;
  } | null>(null);
  const [reachability, setReachability] = useState<TargetReachability | null>(null);

  const selected = TOY_PROBLEMS.find((item) => item.id === problem) ?? TOY_PROBLEMS[0];
  const latest = events[events.length - 1] ?? null;
  const workload = populationSize * generations;
  const heavyLoad = populationSize > HEAVY_POPULATION || workload > HEAVY_WORKLOAD;
  const configValid = populationSize >= 2 && generations >= 1;
  const recommended = selected.recommendedGrammar;
  const grammarMatches = grammarText.trim() === recommended.trim();

  // Warn before a run that cannot possibly succeed.
  useEffect(() => {
    if (problem !== "string_match" || target.trim() === "" || !grammarValid) {
      setReachability(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void analyseTarget(grammarText, target)
        .then((result) => {
          if (!cancelled) setReachability(result);
        })
        .catch(() => {
          if (!cancelled) setReachability(null);
        });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [problem, target, grammarText, grammarValid]);

  const buildConfig = (): EvolutionConfig => ({
      grammar_text: grammarText,
      problem,
      target: problem === "string_match" ? target : "",
      samples: selected.defaultSamples,
      coeffs: selected.defaultCoeffs,
      population_size: populationSize,
      generations,
      p_crossover: crossoverRate,
      p_mutation: mutationRate,
      elite_size: 1,
      tournament_size: 3,
      codon_size: 400,
      max_depth: 40,
      min_init_genome_length: 5,
      max_init_genome_length: 20,
      max_genome_length: null,
      consumption: "eager",
      top_k: 20,
      seed,
      early_stop: true,
    });

  const run = async () => {
    setRunning(true);
    setError(null);
    setEvents([]);
    setDone(null);
    setExplain(null);
    try {
      await streamEvolution(buildConfig(), (event) => {
        if (event.type === "generation") setEvents((previous) => [...previous, event]);
        else if (event.type === "done") setDone(event);
        else setError(event.message);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const drillDown = (individual: EvolvedIndividual) => onDrillDown(individual.genome);

  const toggleExplain = async (key: string, phenotype: string) => {
    if (explain?.key === key) {
      setExplain(null);
      return;
    }
    setExplain({ key, loading: true, lines: [] });
    try {
      const result = await explainFitness({ config: buildConfig(), phenotype });
      setExplain({ key, loading: false, lines: result.lines });
    } catch (caught) {
      setExplain({
        key,
        loading: false,
        lines: [],
        error: caught instanceof Error ? caught.message : String(caught),
      });
    }
  };

  return (
    <div className="evolution-panel-body">
      <div className="evo-header">
        <span className="evo-title">Evolution Playground</span>
        <button
          type="button"
          className="button-primary button-evo"
          onClick={() => void run()}
          disabled={running || !grammarValid || !configValid}
          title={
            !grammarValid
              ? "Fix grammar errors first"
              : !configValid
                ? "Population must be at least 2 and generations at least 1"
                : undefined
          }
        >
          {running ? "Running…" : "Run"}
        </button>
      </div>
      <div className="evo-controls">
        <div className="evo-config-row">
          <select
            value={problem}
            onChange={(event) => setProblem(event.target.value as "string_match" | "symbolic_regression")}
          >
            {TOY_PROBLEMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {problem === "string_match" && (
            <input type="text" value={target} onChange={(event) => setTarget(event.target.value)} />
          )}
        </div>
        {!grammarMatches && (
          <div className="evo-suggestion">
            <span>
              {selected.name} works best with the{" "}
              <strong>{selected.recommendedGrammarName}</strong> grammar.
            </span>
            <button type="button" onClick={() => onUseGrammar(recommended)}>
              Use it
            </button>
          </div>
        )}
        <div className="evo-config-grid">
          <label className="evo-field">
            <span>Pop</span>
            <input
              type="number"
              min={2}
              max={MAX_POPULATION}
              value={populationSize}
              onChange={(event) => setPopulationSize(clampField(event.target.value, MAX_POPULATION))}
            />
          </label>
          <label className="evo-field">
            <span>Gen</span>
            <input
              type="number"
              min={1}
              max={MAX_GENERATIONS}
              value={generations}
              onChange={(event) => setGenerations(clampField(event.target.value, MAX_GENERATIONS))}
            />
          </label>
          <label className="evo-field">
            <span>Seed</span>
            <input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} />
          </label>
          <label className="evo-field">
            <span>P(cx)</span>
            <input type="number" min={0} max={1} step={0.05} value={crossoverRate} onChange={(event) => setCrossoverRate(Number(event.target.value))} />
          </label>
          <label className="evo-field">
            <span>P(mut)</span>
            <input type="number" min={0} max={1} step={0.05} value={mutationRate} onChange={(event) => setMutationRate(Number(event.target.value))} />
          </label>
        </div>
        {heavyLoad && (
          <div className="evo-warning" role="status">
            <strong>Large run</strong>
            <span>
              Pop {populationSize} × {generations} gens ≈ {workload.toLocaleString()} individuals,
              all mapped in your browser. Runs this size can take minutes and leave the tab
              unresponsive — keep Pop around 300 or less for a snappy demo.
            </span>
          </div>
        )}
        {reachability?.reachable === false && (
          <div className="evo-blocked" role="status">
            <strong>Unreachable target</strong>
            <span>
              {reachability.missing.length > 0
                ? `This grammar has no way to produce ${reachability.missing
                    .map((symbol) => `"${symbol}"`)
                    .join(", ")}, so no run can reach “${target}”.`
                : `No derivation of this grammar produces “${target}”. Change the target or the grammar.`}
            </span>
          </div>
        )}
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <div className="evo-results">
        <FitnessChart events={events} />
        {done && (
          <p className="evo-summary">
            Best fitness after {done.generations} generations: {formatFitness(done.best_fitness)} — {done.best.phenotype}
          </p>
        )}
        {latest && (
          <div className="evo-table-wrap">
            <table className="evo-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fitness</th>
                  <th>Phenotype</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {latest.top.map((individual, index) => {
                  const key = `${latest.gen}-${index}`;
                  const open = explain?.key === key;
                  return (
                    <Fragment key={key}>
                      <tr>
                        <td>{index + 1}</td>
                        <td className="evo-fitness">
                          <button
                            type="button"
                            className="evo-why"
                            title="How is this score calculated?"
                            aria-expanded={open}
                            onClick={() => void toggleExplain(key, individual.phenotype)}
                          >
                            {formatFitness(individual.fitness)}
                          </button>
                        </td>
                        <td className="evo-phenotype">{individual.phenotype}</td>
                        <td>{individual.invalid ? "invalid" : "ok"}</td>
                        <td>
                          <button type="button" onClick={() => drillDown(individual)}>
                            Load
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="evo-explain-row">
                          <td colSpan={5}>
                            {explain?.loading ? (
                              <span className="evo-explain-note">Scoring…</span>
                            ) : explain?.error ? (
                              <span className="evo-explain-note evo-explain-error">
                                {explain.error}
                              </span>
                            ) : (
                              <ul className="evo-explain">
                                {explain?.lines.map((line, lineIndex) => (
                                  <li key={lineIndex}>{line}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
