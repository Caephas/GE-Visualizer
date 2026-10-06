import { useEngineStatus } from "../pyodide/useEngineStatus";

/**
 * First-visit feedback: Pyodide (CPython + the real GRAPE) takes a moment to
 * boot. Everything after that runs locally in the browser.
 */
export function EngineBanner() {
  const { status, error } = useEngineStatus();

  if (status === "ready") return null;

  if (status === "error") {
    return (
      <div className="engine-banner engine-banner-error" role="alert">
        <strong>Could not start the GRAPE engine.</strong>
        <span>{error ?? "Unknown error while loading the in-browser Python runtime."}</span>
      </div>
    );
  }

  return (
    <div className="engine-banner engine-banner-loading" role="status">
      <span className="engine-spinner" aria-hidden="true" />
      <strong>Starting the GRAPE engine…</strong>
      <span className="engine-banner-detail">
        Loading CPython, GRAPE and DEAP into your browser — this is a one-time, several-second
        download. Nothing is sent to a server.
      </span>
    </div>
  );
}
