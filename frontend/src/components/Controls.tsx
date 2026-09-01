export interface ControlsProps {
  hasResult: boolean;
  currentStep: number;
  totalSteps: number;
  loading: boolean;
  error: string | null;
  onStepBack: () => void;
  onStepForward: () => void;
  onJump: (step: number) => void;
  onReset: () => void;
  onMap: () => void;
}

export function Controls({
  hasResult,
  currentStep,
  totalSteps,
  loading,
  error,
  onStepBack,
  onStepForward,
  onJump,
  onReset,
  onMap,
}: ControlsProps) {
  return (
    <div className="controls">
      <div className="controls-row">
        <button type="button" onClick={onMap} disabled={loading}>
          {loading ? "Mapping…" : "Map genome"}
        </button>
        <button type="button" onClick={onReset} disabled={!hasResult || currentStep <= -1}>
          ⏮ Reset
        </button>
        <button type="button" onClick={onStepBack} disabled={!hasResult || currentStep <= -1} aria-label="Step back">
          ◀
        </button>
        <button type="button" onClick={onStepForward} disabled={!hasResult || currentStep >= totalSteps - 1} aria-label="Step forward">
          ▶
        </button>
        <label className="step-slider">
          Step {currentStep + 1} / {totalSteps}
          <input
            type="range"
            min={-1}
            max={Math.max(0, totalSteps - 1)}
            value={currentStep}
            onChange={(event) => onJump(Number(event.target.value))}
            disabled={!hasResult}
          />
        </label>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onMap} disabled={loading}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
