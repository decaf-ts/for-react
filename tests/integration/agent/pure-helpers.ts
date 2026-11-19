import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import type { AgentChatMessageView } from "../../../src/agent/types.js";

let sequence = 0;

/** Builds a graph run envelope with a monotonically increasing sequence. */
export function envelope(
  type: GraphExecutionEventType,
  overrides: Partial<GraphRunEventEnvelope> = {}
): GraphRunEventEnvelope {
  sequence += 1;
  return {
    runId: "run-1",
    workflowId: "wf-1",
    sequence,
    type,
    timestamp: `2026-11-19T10:00:${String(sequence % 60).padStart(2, "0")}.000Z`,
    ...overrides,
  } as GraphRunEventEnvelope;
}

/** Builds a transcript message view with sensible defaults. */
export function message(
  overrides: Partial<AgentChatMessageView> = {}
): AgentChatMessageView {
  return {
    id: "message-1",
    role: "assistant",
    content: "",
    attachments: [],
    knowledgeSourceIds: [],
    createdAt: "2026-11-19T10:00:00.000Z",
    ...overrides,
  };
}
