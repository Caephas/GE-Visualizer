import { useState } from "react";

import { streamEvolution } from "../api";
import { TOY_PROBLEMS } from "../examples/problems";
import type { EvolutionConfig, EvolutionEvent, EvolvedIndividual } from "../types";

export interface EvolutionPanelProps {
  grammarText: string;
  grammarValid: boolean;
  onDrillDown: (genome: number[]) => void;
}

type GenerationEvent = Extract<EvolutionEvent, { type: "generation" }>;

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

export function EvolutionPanel({ grammarText, grammarValid, onDrillDown }: EvolutionPanelProps) {
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

  const selected = TOY_PROBLEMS.find((item) => item.id === problem) ?? TOY_PROBLEMS[0];
  const latest = events[events.length - 1] ?? null;

  const run = async () => {
    setRunning(true);
    setError(null);
    setEvents([]);
    setDone(null);
    const config: EvolutionConfig = {
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
    };
    try {
      await streamEvolution(config, (event) => {
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

  return (
    <div className="evolution-panel-body">
      <div className="evo-header">
        <span className="evo-title">Evolution Playground</span>
        <button
          type="button"
          className="button-primary button-evo"
          onClick={() => void run()}
          disabled={running || !grammarValid}
          title={!grammarValid ? "Fix grammar errors first" : undefined}
        >
          {running ? "Running…" : grammarValid ? "Run evolution" : "Fix grammar to run"}
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
        <div className="evo-config-grid">
          <label className="evo-field">
            <span>Pop</span>
            <input type="number" min={2} value={populationSize} onChange={(event) => setPopulationSize(Number(event.target.value))} />
          </label>
          <label className="evo-field">
            <span>Gen</span>
            <input type="number" min={1} value={generations} onChange={(event) => setGenerations(Number(event.target.value))} />
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
                {latest.top.map((individual, index) => (
                  <tr key={`${latest.gen}-${index}`}>
                    <td>{index + 1}</td>
                    <td className="evo-fitness">{formatFitness(individual.fitness)}</td>
                    <td className="evo-phenotype">{individual.phenotype}</td>
                    <td>{individual.invalid ? "invalid" : "ok"}</td>
                    <td>
                      <button type="button" onClick={() => drillDown(individual)}>
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
