import { useEffect, useRef } from "react";

import type { Consumption } from "../types";

export interface ControlsProps {
  hasResult: boolean;
  currentStep: number;
  totalSteps: number;
  loading: boolean;
  error: string | null;
  canMap: boolean;
  playing: boolean;
  speed: number;
  consumption: Consumption;
  onStepBack: () => void;
  onStepForward: () => void;
  onStepLast: () => void;
  onJump: (step: number) => void;
  onReset: () => void;
  onMap: () => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
}

export function Controls({
  hasResult,
  currentStep,
  totalSteps,
  loading,
  error,
  canMap,
  playing,
  speed,
  consumption,
  onStepBack,
  onStepForward,
  onStepLast,
  onJump,
  onReset,
  onMap,
  onTogglePlay,
  onSpeedChange,
}: ControlsProps) {
  const handlersRef = useRef({ onTogglePlay, onStepBack, onStepForward, onReset, onStepLast });

  useEffect(() => {
    handlersRef.current = { onTogglePlay, onStepBack, onStepForward, onReset, onStepLast };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      switch (event.key) {
        case " ":
          event.preventDefault();
          handlersRef.current.onTogglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlersRef.current.onStepBack();
          break;
        case "ArrowRight":
          event.preventDefault();
          handlersRef.current.onStepForward();
          break;
        case "Home":
          event.preventDefault();
          handlersRef.current.onReset();
          break;
        case "End":
          event.preventDefault();
          handlersRef.current.onStepLast();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="controls">
      <div className="controls-row">
        <button
          type="button"
          className="icon-button"
          onClick={onTogglePlay}
          disabled={!hasResult}
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onStepBack}
          disabled={!hasResult || currentStep <= -1}
          aria-label="Step back"
          title="Step back"
        >
          ◀
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onStepForward}
          disabled={!hasResult || currentStep >= totalSteps - 1}
          aria-label="Step forward"
          title="Step forward"
        >
          ▶
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onReset}
          disabled={!hasResult || currentStep <= -1}
          aria-label="Reset"
          title="Reset"
        >
          ⟲
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={onMap}
          disabled={loading || !canMap}
          title={!canMap ? "Fix grammar errors first" : undefined}
        >
          {loading ? "Mapping…" : "Map genome"}
        </button>
        <label className="step-slider">
          <span>
            Step <b>{currentStep + 1}</b>/{totalSteps}
          </span>
          <input
            type="range"
            min={-1}
            max={Math.max(0, totalSteps - 1)}
            value={currentStep}
            onChange={(event) => onJump(Number(event.target.value))}
            disabled={!hasResult}
          />
        </label>
        <label className="speed-slider">
          <span>Speed</span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          />
          <b>{speed}×</b>
        </label>
        <span className="mode-chip">{consumption} consumption</span>
      </div>
      <p className="shortcut-hint">
        Shortcuts: <kbd>Space</kbd> play · <kbd>←</kbd>/<kbd>→</kbd> step ·{" "}
        <kbd>Home</kbd>/<kbd>End</kbd> jump
      </p>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onMap} disabled={loading || !canMap}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
