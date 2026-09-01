import { describe, expect, it } from "vitest";

import { consumeSseBuffer } from "./api";

describe("consumeSseBuffer", () => {
  it("parses complete frames", () => {
    const events: unknown[] = [];
    const rest = consumeSseBuffer(
      'data: {"type":"generation","gen":1}\n\ndata: {"type":"done","generations":1}\n\n',
      (event) => events.push(event),
    );
    expect(events).toHaveLength(2);
    expect(rest).toBe("");
  });

  it("buffers partial frames across chunks", () => {
    const events: unknown[] = [];
    let rest = consumeSseBuffer('data: {"type":"generation","gen":1}\n\ndata: {"type":"d', (event) =>
      events.push(event),
    );
    expect(events).toHaveLength(1);
    rest = consumeSseBuffer(rest + 'one","generations":1}\n\n', (event) => events.push(event));
    expect(events).toHaveLength(2);
    expect(rest).toBe("");
  });

  it("ignores malformed frames", () => {
    const events: unknown[] = [];
    consumeSseBuffer("not json\n\n", (event) => events.push(event));
    expect(events).toHaveLength(0);
  });
});
