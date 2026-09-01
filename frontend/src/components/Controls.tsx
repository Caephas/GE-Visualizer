import { useEffect, useRef } from "react";

import type { Consumption } from "../types";

export interface ControlsProps {
  hasResult: boolean;
  currentStep: number;
  totalSteps: number;
  loading: boolean;
  error: string | null;
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
        <button type="button" onClick={onTogglePlay} disabled={!hasResult}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
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
        <label className="speed-slider">
          {speed} steps/s
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          />
        </label>
        <span className="mode-chip">{consumption} consumption</span>
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
