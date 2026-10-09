import { Fragment } from "react";

import type { CodonOrigin, LineageRecord, LineageStats } from "../types";

export interface GenerationViewProps {
  lineage: LineageRecord[] | null;
  stats: LineageStats | null;
  onDrillDown: (genome: number[]) => void;
}

const ORIGIN_CLASS: Record<CodonOrigin, string> = {
  0: "origin-parent-a",
  1: "origin-parent-b",
  2: "origin-mutated",
  3: "origin-elite",
};

const OPERATION_LABEL: Record<LineageRecord["operation"], string> = {
  elite: "carried over unchanged",
  clone: "cloned, unchanged",
  crossover: "crossover",
  mutation: "mutation",
  "crossover+mutation": "crossover + mutation",
};

function Strip({ genome, classes = [] }: { genome: number[]; classes?: string[] }) {
  return (
    <div className="gen-strip">
      {genome.map((codon, index) => (
        <span key={index} className={`gen-codon ${classes[index] ?? ""}`}>
          {codon}
        </span>
      ))}
    </div>
  );
}

function verdict(record: LineageRecord): { label: string; tone: string } {
  if (!record.parent_fitness.length) return { label: "", tone: "" };
  const bestParent = Math.min(...record.parent_fitness);
  if (record.fitness < bestParent) return { label: "better than its parents", tone: "is-better" };
  if (record.fitness > bestParent) return { label: "worse than its parents", tone: "is-worse" };
  return { label: "no change in fitness", tone: "" };
}

/**
 * What the genetic operators did in one generation: each offspring's genome
 * coloured by where every codon came from, with the mutations spelled out.
 */
export function GenerationView({ lineage, stats, onDrillDown }: GenerationViewProps) {
  if (!stats || !lineage || lineage.length === 0) {
    return <p className="gen-empty">Run the evolution to see how each generation was built.</p>;
  }

  return (
    <div className="gen-view">
      <div className="gen-legend">
        <span className="gen-key origin-parent-a">from parent A</span>
        <span className="gen-key origin-parent-b">from parent B</span>
        <span className="gen-key origin-mutated">mutated</span>
        <span className="gen-key origin-elite">carried over</span>
      </div>

      <div className="gen-stats">
        <span>
          crossover: <b className="is-better">{stats.crossover.better}</b> better /{" "}
          <b className="is-worse">{stats.crossover.worse}</b> worse
        </span>
        <span>
          mutation: <b className="is-better">{stats.mutation.better}</b> better /{" "}
          <b className="is-worse">{stats.mutation.worse}</b> worse
        </span>
        <span>
          elite kept: <b>{stats.elite}</b>
        </span>
      </div>

      <ul className="gen-list">
        {lineage.map((record) => {
          const result = verdict(record);
          const split = record.crossover_points;
          return (
            <li key={`${record.gen}-${record.slot}`} className={`gen-record ${result.tone}`}>
              <div className="gen-record-head">
                <span className="gen-operation">{OPERATION_LABEL[record.operation]}</span>
                <span className="gen-fitness">
                  fitness {record.fitness}
                  {record.parent_fitness.length > 0 && (
                    <> ← {record.parent_fitness.join(" & ")}</>
                  )}
                </span>
                {result.label && <span className={`gen-verdict ${result.tone}`}>{result.label}</span>}
              </div>

              {record.parents.map((parent, position) => (
                <Fragment key={position}>
                  <span className="gen-strip-label">
                    parent {position === 0 ? "A" : "B"} · fitness {parent.fitness}
                  </span>
                  <Strip
                    genome={parent.genome}
                    classes={parent.genome.map((_, index) => {
                      if (!split) return "";
                      if (position === 0) return index < split[0] ? "origin-parent-a" : "";
                      return index >= split[1] ? "origin-parent-b" : "";
                    })}
                  />
                </Fragment>
              ))}

              <span className="gen-strip-label">
                {record.parents.length > 0 ? "offspring" : "individual"}
              </span>
              <Strip genome={record.genome} classes={record.origins.map((origin) => ORIGIN_CLASS[origin])} />

              {record.changes.length > 0 && (
                <p className="gen-changes">
                  {record.changes
                    .map((change) => `genome[${change.index}]: ${change.from} → ${change.to}`)
                    .join("   ")}
                </p>
              )}

              <button
                type="button"
                className="gen-open"
                onClick={() => onDrillDown(record.genome)}
              >
                Open in tree view
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
