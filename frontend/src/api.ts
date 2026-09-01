import type { EvolutionConfig, EvolutionEvent, MapRequest, MapResponse } from "./types";

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError("Cannot reach the backend. Is it running on http://127.0.0.1:8000?", 0);
  }
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // keep the default message
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

export function mapGenome(payload: MapRequest): Promise<MapResponse> {
  return request<MapResponse>("/map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function uploadGrammar(grammarText: string): Promise<{ message: string }> {
  return request("/grammar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grammar_text: grammarText }),
  });
}

export function fetchStoredGrammar(): Promise<{ grammar_text: string }> {
  return request("/grammar");
}

/**
 * Consumes complete SSE frames from a buffer, invoking onEvent for each
 * `data:` payload, and returns any partial frame still in the buffer.
 */
export function consumeSseBuffer(buffer: string, onEvent: (event: EvolutionEvent) => void): string {
  let rest = buffer;
  let separator = rest.indexOf("\n\n");
  while (separator !== -1) {
    const chunk = rest.slice(0, separator);
    rest = rest.slice(separator + 2);
    const dataLine = chunk.split("\n").find((line) => line.startsWith("data:"));
    if (dataLine) {
      try {
        onEvent(JSON.parse(dataLine.slice(5).trim()) as EvolutionEvent);
      } catch {
        // ignore malformed frames
      }
    }
    separator = rest.indexOf("\n\n");
  }
  return rest;
}

export async function streamEvolution(
  config: EvolutionConfig,
  onEvent: (event: EvolutionEvent) => void,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/evolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  } catch {
    throw new ApiError("Cannot reach the backend. Is it running on http://127.0.0.1:8000?", 0);
  }
  if (!response.ok || !response.body) {
    throw new ApiError(`Request failed (${response.status})`, response.status);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer = consumeSseBuffer(buffer + decoder.decode(value, { stream: true }), onEvent);
  }
  consumeSseBuffer(buffer + decoder.decode(), onEvent);
}
