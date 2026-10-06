import { describe, expect, it } from "vitest";

import { EngineClient, EngineError, type WorkerLike } from "./client";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import type { EvolutionEvent, GrammarValidation, MapResponse } from "../types";

class FakeWorker implements WorkerLike {
  readonly requests: WorkerRequest[] = [];
  private listener: ((event: MessageEvent<WorkerResponse>) => void) | null = null;

  postMessage(message: WorkerRequest): void {
    this.requests.push(message);
  }

  addEventListener(_type: "message", listener: (event: MessageEvent<WorkerResponse>) => void): void {
    this.listener = listener;
  }

  removeEventListener(): void {
    this.listener = null;
  }

  emit(message: WorkerResponse): void {
    this.listener?.({ data: message } as MessageEvent<WorkerResponse>);
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const VALIDATION: GrammarValidation = { valid: true, rules: 2, start_rule: "<start>", error: null };
const MAP: MapResponse = {
  genome: [1, 2],
  params: {
    codon_size: 400,
    bits_per_codon: 8,
    consumption: "eager",
    max_depth: 40,
    genome_representation: "codons",
    wrap: false,
  },
  trace: [],
  phenotype: "a",
  status: "complete",
  summary: { used_codons: 1, nodes: 1, depth: 1, n_wraps: 0 },
};

function setup() {
  const worker = new FakeWorker();
  const client = new EngineClient(() => worker);
  return { worker, client };
}

describe("EngineClient", () => {
  it("boots the worker with an init message and flips to ready", async () => {
    const { worker, client } = setup();
    const statuses: string[] = [];
    client.subscribe(() => statuses.push(client.getStatus()));

    expect(client.getStatus()).toBe("loading");
    const pending = client.validateGrammar("<start> ::= a");
    await flush();
    expect(worker.requests[0]).toEqual({ id: 0, type: "init" });

    worker.emit({ id: 0, type: "ready" });
    await flush();
    expect(statuses).toContain("ready");

    worker.emit({ id: 1, type: "validated", value: VALIDATION });
    await expect(pending).resolves.toEqual(VALIDATION);
  });

  it("correlates concurrent map and validate requests by id", async () => {
    const { worker, client } = setup();
    const validation = client.validateGrammar("<start> ::= a");
    const mapping = client.mapGenome({ grammar_text: "g", genome: [1], params: MAP.params });
    worker.emit({ id: 0, type: "ready" });
    await flush();

    const validateReq = worker.requests.find((r) => r.type === "validate")!;
    const mapReq = worker.requests.find((r) => r.type === "map")!;
    worker.emit({ id: mapReq.id, type: "mapped", value: MAP });
    worker.emit({ id: validateReq.id, type: "validated", value: VALIDATION });

    await expect(mapping).resolves.toEqual(MAP);
    await expect(validation).resolves.toEqual(VALIDATION);
  });

  it("streams evolution events and resolves when the run is done", async () => {
    const { worker, client } = setup();
    const events: EvolutionEvent[] = [];
    const pending = client.streamEvolution(
      { grammar_text: "g", problem: "string_match" } as never,
      (event) => events.push(event),
    );
    worker.emit({ id: 0, type: "ready" });
    await flush();

    const req = worker.requests.find((r) => r.type === "evolve")!;
    worker.emit({ id: req.id, type: "event", value: { type: "generation", gen: 1 } as EvolutionEvent });
    worker.emit({ id: req.id, type: "done" });

    await expect(pending).resolves.toBeUndefined();
    expect(events).toHaveLength(1);
  });

  it("reports a boot failure as error status and rejects work", async () => {
    const { worker, client } = setup();
    const pending = client.mapGenome({ grammar_text: "g", genome: [1], params: MAP.params });
    worker.emit({ id: 0, type: "error", message: "no wasm" });
    await expect(pending).rejects.toBeInstanceOf(EngineError);
    expect(client.getStatus()).toBe("error");
    expect(client.getLoadError()).toBe("no wasm");
  });
});
