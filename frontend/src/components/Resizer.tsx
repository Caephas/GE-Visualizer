import { useRef, useState } from "react";

export interface ResizerProps {
  /** "vertical" is a vertical bar that resizes a width; "horizontal" resizes a height. */
  orientation: "vertical" | "horizontal";
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  className?: string;
}

/**
 * A draggable divider. Pointer events cover mouse and touch; the arrow keys move
 * it too, so it is usable without a pointer.
 */
export function Resizer({
  orientation,
  value,
  onChange,
  min,
  max,
  label,
  className = "",
}: ResizerProps) {
  const startRef = useRef<{ position: number; value: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  const axis = (event: { clientX: number; clientY: number }) =>
    orientation === "vertical" ? event.clientX : event.clientY;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    startRef.current = { position: axis(event), value };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    if (!start) return;
    onChange(clamp(start.value + (axis(event) - start.position)));
  };

  const endDrag = () => {
    startRef.current = null;
    setDragging(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 10;
    const back = orientation === "vertical" ? "ArrowLeft" : "ArrowUp";
    const forward = orientation === "vertical" ? "ArrowRight" : "ArrowDown";
    if (event.key === back) {
      event.preventDefault();
      onChange(clamp(value - step));
    } else if (event.key === forward) {
      event.preventDefault();
      onChange(clamp(value + step));
    }
  };

  return (
    <div
      className={`resizer resizer-${orientation}${dragging ? " is-dragging" : ""} ${className}`.trim()}
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    />
  );
}
