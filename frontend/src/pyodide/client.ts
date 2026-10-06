import type {
  EvolutionConfig,
  EvolutionEvent,
  GrammarValidation,
  MapRequest,
  MapResponse,
} from "../types";
import type {
  GrammarSuggestion,
  FitnessExplanation,
  FitnessExplainRequest,
  TargetReachability,
  WorkerRequest,
  WorkerResponse,
} from "./protocol";
import type { Consumption } from "../types";

/** The subset of the Worker API the client needs (so tests can fake it). */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerResponse>) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<WorkerResponse>) => void): void;
}

export type EngineStatus = "loading" | "ready" | "error";

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

type Pending =
  | { kind: "validate"; resolve: (value: GrammarValidation) => void; reject: (error: Error) => void }
  | { kind: "map"; resolve: (value: MapResponse) => void; reject: (error: Error) => void }
  | {
      kind: "suggest";
      resolve: (value: GrammarSuggestion) => void;
      reject: (error: Error) => void;
    }
  | {
      kind: "analyse";
      resolve: (value: TargetReachability) => void;
      reject: (error: Error) => void;
    }
  | {
      kind: "explain";
      resolve: (value: FitnessExplanation) => void;
      reject: (error: Error) => void;
    }
  | {
      kind: "evolve";
      onEvent: (event: EvolutionEvent) => void;
      resolve: () => void;
      reject: (error: Error) => void;
    };

const INIT_ID = 0;

/**
 * Talks to the Pyodide engine worker: it lazily boots the worker, correlates
 * request/response pairs by id, and fans out streamed evolution events.
 */
export class EngineClient {
  private worker: WorkerLike | null = null;
  private readonly pending = new Map<number, Pending>();
  private readonly statusListeners = new Set<() => void>();
  private nextId = 1;
  private status: EngineStatus = "loading";
  private loadError: string | null = null;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((error: Error) => void) | null = null;

  constructor(private readonly createWorker: () => WorkerLike) {}

  getStatus(): EngineStatus {
    return this.status;
  }

  getLoadError(): string | null {
    return this.loadError;
  }

  subscribe(listener: () => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  async validateGrammar(grammarText: string): Promise<GrammarValidation> {
    await this.ready();
    return this.request<GrammarValidation>({ type: "validate", grammarText });
  }

  async mapGenome(payload: MapRequest): Promise<MapResponse> {
    await this.ready();
    return this.request<MapResponse>({ type: "map", payload });
  }

  async explainFitness(payload: FitnessExplainRequest): Promise<FitnessExplanation> {
    await this.ready();
    const id = this.nextId++;
    return new Promise<FitnessExplanation>((resolve, reject) => {
      this.pending.set(id, { kind: "explain", resolve, reject });
      this.worker!.postMessage({ id, type: "explain", payload });
    });
  }

  async suggestSettings(
    grammarText: string,
    consumption: Consumption,
  ): Promise<GrammarSuggestion> {
    await this.ready();
    const id = this.nextId++;
    return new Promise<GrammarSuggestion>((resolve, reject) => {
      this.pending.set(id, { kind: "suggest", resolve, reject });
      this.worker!.postMessage({ id, type: "suggest", grammarText, consumption });
    });
  }

  async analyseTarget(grammarText: string, target: string): Promise<TargetReachability> {
    await this.ready();
    const id = this.nextId++;
    return new Promise<TargetReachability>((resolve, reject) => {
      this.pending.set(id, { kind: "analyse", resolve, reject });
      this.worker!.postMessage({ id, type: "analyse", grammarText, target });
    });
  }

  async streamEvolution(
    config: EvolutionConfig,
    onEvent: (event: EvolutionEvent) => void,
  ): Promise<void> {
    await this.ready();
    const id = this.nextId++;
    return new Promise<void>((resolve, reject) => {
      this.pending.set(id, { kind: "evolve", onEvent, resolve, reject });
      this.worker!.postMessage({ id, type: "evolve", config });
    });
  }

  private ready(): Promise<void> {
    if (!this.worker) this.boot();
    return this.readyPromise!;
  }

  private boot(): void {
    this.worker = this.createWorker();
    this.worker.addEventListener("message", this.onMessage);
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    // Surface load failures through the status listeners instead of an
    // unhandled rejection.
    void this.readyPromise.catch(() => undefined);
    this.worker.postMessage({ id: INIT_ID, type: "init" });
  }

  private request<T>(message: { type: "validate"; grammarText: string } | { type: "map"; payload: MapRequest }): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        kind: message.type,
        resolve: resolve as (value: never) => void,
        reject,
      } as Pending);
      this.worker!.postMessage({ id, ...message } as WorkerRequest);
    });
  }

  private setStatus(status: EngineStatus, error?: string): void {
    this.status = status;
    if (error) this.loadError = error;
    for (const listener of this.statusListeners) listener();
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private readonly onMessage = (event: MessageEvent<WorkerResponse>): void => {
    const message = event.data;
    switch (message.type) {
      case "ready":
        this.setStatus("ready");
        this.readyResolve?.();
        return;
      case "validated": {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (pending?.kind === "validate") pending.resolve(message.value);
        return;
      }
      case "mapped": {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (pending?.kind === "map") pending.resolve(message.value);
        return;
      }
      case "explained": {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (pending?.kind === "explain") pending.resolve(message.value);
        return;
      }
      case "suggested": {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (pending?.kind === "suggest") pending.resolve(message.value);
        return;
      }
      case "analysed": {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (pending?.kind === "analyse") pending.resolve(message.value);
        return;
      }
      case "event": {
        const pending = this.pending.get(message.id);
        if (pending?.kind === "evolve") pending.onEvent(message.value);
        return;
      }
      case "done": {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (pending?.kind === "evolve") pending.resolve();
        return;
      }
      case "error": {
        const error = new EngineError(message.message);
        if (message.id === INIT_ID) {
          this.setStatus("error", message.message);
          this.readyReject?.(error);
          this.failAll(error);
        } else {
          const pending = this.pending.get(message.id);
          this.pending.delete(message.id);
          pending?.reject(error);
        }
        return;
      }
    }
  };
}

let singleton: EngineClient | null = null;

/** Lazily-created engine client backed by the real Web Worker. */
export function getEngine(): EngineClient {
  if (!singleton) {
    singleton = new EngineClient(
      () => new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" }),
    );
  }
  return singleton;
}
