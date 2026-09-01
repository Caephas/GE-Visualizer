import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePlaybackOptions {
  /** Advance one step; called on a timer while playing. */
  onStep: () => void;
  /** Whether another step is available. Playback stops when false. */
  canStep: boolean;
}

export interface Playback {
  playing: boolean;
  speed: number;
  togglePlay: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
}

export function usePlayback({ onStep, canStep }: UsePlaybackOptions): Playback {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const onStepRef = useRef(onStep);

  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  useEffect(() => {
    if (!playing) return;
    if (!canStep) {
      setPlaying(false);
      return;
    }
    const interval = window.setInterval(() => onStepRef.current(), 1000 / speed);
    return () => window.clearInterval(interval);
  }, [playing, canStep, speed]);

  const togglePlay = useCallback(() => setPlaying((value) => !value), []);
  const stop = useCallback(() => setPlaying(false), []);

  return { playing, speed, togglePlay, stop, setSpeed };
}
