import type { MapStatus } from "../types";

export interface PhenotypeViewProps {
  phenotype: string;
  status: MapStatus | null;
}

export function PhenotypeView({ phenotype, status }: PhenotypeViewProps) {
  return (
    <div className="phenotype-view">
      <div className="phenotype-heading">
        <h2>Phenotype</h2>
        {status && (
          <span className="status-chip" data-status={status}>
            {status}
          </span>
        )}
      </div>
      <pre className="phenotype-text">{phenotype || "—"}</pre>
    </div>
  );
}
