import { useState } from "react";

const DISMISS_KEY = "ge-visualizer.mobileNoticeDismissed";

/**
 * A nudge, not a barrier: the app works on a phone, but the derivation tree and
 * the generation view are much easier to read with room. Hidden by CSS above the
 * phone breakpoint, and dismissible for good.
 */
export function MobileNotice() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  return (
    <div className="mobile-notice" role="note">
      <span>
        <strong>Better on a bigger screen.</strong> Everything works here, but the derivation tree
        and the generation view need room — a laptop or desktop gives you the full picture.
      </span>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            window.localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // localStorage can be unavailable (private mode); it stays dismissed.
          }
        }}
      >
        Got it
      </button>
    </div>
  );
}
