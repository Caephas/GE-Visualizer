import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { TutorialStep } from "./tutorialSteps";

export interface TutorialProps {
  steps: TutorialStep[];
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const MARGIN = 12;
const SPOTLIGHT_PADDING = 6;
const MIN_CARD_WIDTH = 300;
const MAX_CARD_WIDTH = 360;

function elementRect(selector: string | null): Rect | null {
  if (!selector) return null;
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

/**
 * A spotlight walkthrough: dims the app, rings the element a step refers to,
 * and shows an explanation card next to it. Falls back to a centred card when
 * the target is missing or off-screen (and in the test environment).
 */
export function Tutorial({ steps, onClose }: TutorialProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
    height: typeof window === "undefined" ? 768 : window.innerHeight,
  }));
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const next = useCallback(() => {
    if (index >= steps.length - 1) {
      onClose();
    } else {
      setIndex(index + 1);
    }
  }, [index, steps.length, onClose]);

  const back = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);

  // Keep the spotlight pinned to the target as the layout moves (scroll, resize).
  useEffect(() => {
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setRect(elementRect(step.target));
    };
    if (step.target) {
      document.querySelector(step.target)?.scrollIntoView?.({
        block: "center",
        inline: "center",
        behavior: "smooth",
      });
    }
    const raf = requestAnimationFrame(measure);
    const settle = window.setTimeout(measure, 350); // after a smooth scroll finishes
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.target, index]);

  useLayoutEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    setCardSize((previous) =>
      previous.width === width && previous.height === height ? previous : { width, height },
    );
  }, [index, rect, viewport]);

  // Capture-phase so the playback shortcuts don't fire underneath the tour.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["Escape", "ArrowRight", "ArrowLeft", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") back();
      else if (["ArrowRight", "Enter", " "].includes(event.key)) next();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [back, next, onClose]);

  useEffect(() => {
    primaryRef.current?.focus();
  }, [index]);

  const width = Math.max(
    Math.min(cardSize.width || MAX_CARD_WIDTH, viewport.width - MARGIN * 2),
    Math.min(MIN_CARD_WIDTH, viewport.width - MARGIN * 2),
  );

  const cardStyle =
    rect && cardSize.height > 0
      ? placeCard(rect, width, cardSize.height, viewport)
      : centred(width);

  return (
    <div
      className={`tutorial-root${rect ? "" : " tutorial-root-dim"}`}
      role="dialog"
      aria-modal="true"
      aria-label="App tour"
    >
      {rect && (
        <div
          className="tutorial-spotlight"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
          }}
        />
      )}
      <div ref={cardRef} className="tutorial-card" style={cardStyle}>
        <div className="tutorial-meta">
          <span className="tutorial-progress">
            Step {index + 1} of {steps.length}
          </span>
          <button type="button" className="tutorial-skip" onClick={onClose}>
            Skip tour
          </button>
        </div>
        <h2 className="tutorial-title">{step.title}</h2>
        <div className="tutorial-body">{step.body}</div>
        <div className="tutorial-actions">
          <button
            type="button"
            className="tutorial-back"
            onClick={back}
            disabled={index === 0}
          >
            Back
          </button>
          <button
            ref={primaryRef}
            type="button"
            className="button-primary tutorial-next"
            onClick={next}
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function clampLeft(rect: Rect, width: number, viewportWidth: number): number {
  const desired = rect.left + rect.width / 2 - width / 2;
  return Math.max(MARGIN, Math.min(desired, viewportWidth - width - MARGIN));
}

function placeCard(
  rect: Rect,
  width: number,
  height: number,
  viewport: { width: number; height: number },
): CSSProperties {
  const clampTop = (desired: number) =>
    Math.max(MARGIN, Math.min(desired, viewport.height - height - MARGIN));

  const fitsAbove = rect.top - MARGIN - height - MARGIN >= 0;
  const fitsLeft = rect.left - MARGIN - width - MARGIN >= 0;
  const fitsRight = rect.left + rect.width + MARGIN + width + MARGIN <= viewport.width;

  if (rect.top + rect.height + MARGIN + height + MARGIN <= viewport.height) {
    return { top: rect.top + rect.height + MARGIN, left: clampLeft(rect, width, viewport.width), width };
  }
  if (fitsAbove) {
    return { top: rect.top - MARGIN - height, left: clampLeft(rect, width, viewport.width), width };
  }
  // Tall target: sit beside it if there is room, so the card doesn't cover it.
  if (fitsRight) {
    return {
      top: clampTop(rect.top + rect.height / 2 - height / 2),
      left: rect.left + rect.width + MARGIN,
      width,
    };
  }
  if (fitsLeft) {
    return {
      top: clampTop(rect.top + rect.height / 2 - height / 2),
      left: rect.left - MARGIN - width,
      width,
    };
  }
  // Last resort: dock at the bottom, keeping the top of the target visible.
  return {
    top: clampTop(viewport.height - height - MARGIN),
    left: clampLeft(rect, width, viewport.width),
    width,
  };
}

function centred(width: number): CSSProperties {
  return { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width };
}
