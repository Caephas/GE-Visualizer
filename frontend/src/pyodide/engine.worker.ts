/**
 * Web Worker that runs the real GRAPE engine inside Pyodide.
 *
 * The Python sources in ../engine are written into Pyodide's virtual file
 * system, then ge_bridge exposes JSON entry points for validating a grammar,
 * mapping a genome, and streaming a GRAPE/DEAP evolution one generation at a
 * time. Running it in a worker keeps the UI responsive while the GA runs.
 */
import { loadPyodide, type PyodideInterface } from "pyodide";

import bridgeSource from "../engine/ge_bridge.py?raw";
import grapeCoreSource from "../engine/grape_core.py?raw";
import deapLiteSource from "../engine/deap_lite.py?raw";
import type { WorkerRequest, WorkerResponse } from "./protocol";

interface WorkerScope {
  postMessage(message: WorkerResponse): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerRequest>) => void): void;
}

const scope = self as unknown as WorkerScope;

let enginePromise: Promise<PyodideInterface> | null = null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeModule(py: PyodideInterface, name: string, source: string): void {
  py.FS.writeFile(`/engine/${name}`, source);
}

async function boot(): Promise<PyodideInterface> {
  const py = await loadPyodide({
    indexURL: `${import.meta.env.BASE_URL}pyodide/`,
    stdout: () => undefined,
    stderr: () => undefined,
  });
  py.FS.mkdirTree("/engine");
  writeModule(py, "grape_core.py", grapeCoreSource);
  writeModule(py, "deap_lite.py", deapLiteSource);
  writeModule(py, "ge_bridge.py", bridgeSource);
  py.runPython("import sys\nsys.path.insert(0, '/engine')\nimport ge_bridge");
  return py;
}

function ensureEngine(): Promise<PyodideInterface> {
  if (!enginePromise) enginePromise = boot();
  return enginePromise;
}

function call(py: PyodideInterface, fn: string, arg: string): string {
  py.globals.set("__gev_arg", arg);
  return py.runPython(`ge_bridge.${fn}(__gev_arg)`);
}

function yieldToLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function handle(message: WorkerRequest): Promise<void> {
  try {
    switch (message.type) {
      case "init": {
        await ensureEngine();
        scope.postMessage({ id: message.id, type: "ready" });
        return;
      }
      case "validate": {
        const py = await ensureEngine();
        const value = JSON.parse(call(py, "validate_json", message.grammarText));
        scope.postMessage({ id: message.id, type: "validated", value });
        return;
      }
      case "map": {
        const py = await ensureEngine();
        const value = JSON.parse(call(py, "map_json", JSON.stringify(message.payload)));
        scope.postMessage({ id: message.id, type: "mapped", value });
        return;
      }
      case "explain": {
        const py = await ensureEngine();
        const value = JSON.parse(call(py, "explain_json", JSON.stringify(message.payload)));
        scope.postMessage({ id: message.id, type: "explained", value });
        return;
      }
      case "suggest": {
        const py = await ensureEngine();
        const value = JSON.parse(
          call(
            py,
            "suggest_json",
            JSON.stringify({ grammar_text: message.grammarText, consumption: message.consumption }),
          ),
        );
        scope.postMessage({ id: message.id, type: "suggested", value });
        return;
      }
      case "analyse": {
        const py = await ensureEngine();
        const value = JSON.parse(
          call(
            py,
            "analyse_json",
            JSON.stringify({ grammar_text: message.grammarText, target: message.target }),
          ),
        );
        scope.postMessage({ id: message.id, type: "analysed", value });
        return;
      }
      case "evolve": {
        const py = await ensureEngine();
        const { run } = JSON.parse(call(py, "evolve_start_json", JSON.stringify(message.config)));
        for (;;) {
          const value = JSON.parse(call(py, "evolve_next_json", JSON.stringify(run)));
          if (value === null) break;
          scope.postMessage({ id: message.id, type: "event", value });
          await yieldToLoop();
        }
        scope.postMessage({ id: message.id, type: "done" });
        return;
      }
    }
  } catch (error) {
    scope.postMessage({ id: message.id, type: "error", message: errorMessage(error) });
  }
}

scope.addEventListener("message", (event) => {
  void handle(event.data);
});
