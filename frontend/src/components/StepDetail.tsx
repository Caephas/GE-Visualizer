import type { TraceStep } from "../types";

export interface StepDetailProps {
  step: TraceStep | null;
  totalSteps: number;
}

export function StepDetail({ step, totalSteps }: StepDetailProps) {
  if (!step) {
    return (
      <div className="step-detail">
        <p className="step-detail-empty">Press ▶ to step through the mapping.</p>
      </div>
    );
  }

  const arithmetic = `${step.codon_value} % ${step.rule_count} = ${step.choice}`;

  return (
    <div className="step-detail">
      <h2>
        Step {step.step + 1} / {totalSteps}
      </h2>
      <table className="step-table">
        <tbody>
          <tr>
            <th>Non-terminal</th>
            <td>{step.non_terminal}</td>
          </tr>
          <tr>
            <th>Codon</th>
            <td>
              {step.consumed ? (
                <>
                  genome[{step.codon_index}] = {step.codon_value} → <code>{arithmetic}</code>
                </>
              ) : (
                <>no codon consumed (single production rule)</>
              )}
            </td>
          </tr>
          <tr>
            <th>Expansion</th>
            <td>{step.expansion}</td>
          </tr>
          <tr>
            <th>Depth</th>
            <td>{step.depth}</td>
          </tr>
          {step.wraps > 0 && (
            <tr>
              <th>Wraps</th>
              <td>{step.wraps}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
