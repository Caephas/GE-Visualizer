import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePlayback } from "./usePlayback";

describe("usePlayback", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances at the configured speed while playing", () => {
    vi.useFakeTimers();
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback({ onStep, canStep: true }));
    act(() => result.current.togglePlay());
    expect(result.current.playing).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(onStep).toHaveBeenCalledTimes(2); // speed defaults to 2 steps/s
    act(() => vi.advanceTimersByTime(500));
    expect(onStep).toHaveBeenCalledTimes(3);
  });

  it("pauses and stops advancing", () => {
    vi.useFakeTimers();
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback({ onStep, canStep: true }));
    act(() => result.current.togglePlay());
    act(() => vi.advanceTimersByTime(500));
    act(() => result.current.togglePlay());
    const count = onStep.mock.calls.length;
    act(() => vi.advanceTimersByTime(2000));
    expect(onStep.mock.calls.length).toBe(count);
  });

  it("stops automatically when no more steps are available", () => {
    vi.useFakeTimers();
    const onStep = vi.fn();
    const { result, rerender } = renderHook(
      ({ canStep }) => usePlayback({ onStep, canStep }),
      { initialProps: { canStep: true } },
    );
    act(() => result.current.togglePlay());
    rerender({ canStep: false });
    expect(result.current.playing).toBe(false);
    act(() => vi.advanceTimersByTime(2000));
    expect(onStep).not.toHaveBeenCalled();
  });

  it("respects speed changes", () => {
    vi.useFakeTimers();
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback({ onStep, canStep: true }));
    act(() => result.current.setSpeed(10));
    act(() => result.current.togglePlay());
    act(() => vi.advanceTimersByTime(1000));
    expect(onStep).toHaveBeenCalledTimes(10);
  });
});
