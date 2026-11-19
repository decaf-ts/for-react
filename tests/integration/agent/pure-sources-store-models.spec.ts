import { InMemoryAgentChatHistorySource } from "../../../src/agent/services/InMemoryAgentChatHistorySource.js";
import { InMemoryAgentKnowledgeBaseSource } from "../../../src/agent/services/InMemoryAgentKnowledgeBaseSource.js";
import { createAgentChatDecafStore } from "../../../src/agent/react/agentChatStore.js";
import {
  AGENT_CHAT_ROLES,
  AgentChatMessageModel,
} from "../../../src/agent/models/AgentChatMessageModel.js";
import { AgentChatComposerModel } from "../../../src/agent/models/AgentChatComposerModel.js";
import type {
  AgentChatDemoEvent,
  AgentChatHistoryEntry,
} from "../../../src/agent/types.js";

const HISTORY: AgentChatHistoryEntry[] = [
  { id: "c1", title: "One", preview: "first" },
  { id: "c2", title: "Two", preview: "second" },
  { id: "c3", title: "Three", preview: "third" },
];

describe("InMemoryAgentChatHistorySource", () => {
  it("copies the entries array on write and read", async () => {
    const source = new InMemoryAgentChatHistorySource(HISTORY);
    const all = source.all();
    all.push({ id: "c4", title: "Four", preview: "fourth" });
    all.shift();

    expect(source.all()).toEqual(HISTORY);
    source.seed(HISTORY.slice(0, 1));
    expect(await source.list()).toHaveLength(1);
  });

  it("supports setEntries as a seed alias", async () => {
    const source = new InMemoryAgentChatHistorySource();
    source.setEntries(HISTORY);
    expect(await source.list()).toEqual(HISTORY);
  });

  it("pages entries one-based", async () => {
    const source = new InMemoryAgentChatHistorySource(HISTORY);
    expect(await source.list({ page: 1, pageSize: 2 })).toEqual(
      HISTORY.slice(0, 2)
    );
    expect(await source.list({ page: 2, pageSize: 2 })).toEqual(
      HISTORY.slice(2)
    );
    expect(await source.list({ page: 0, pageSize: 2 })).toEqual(
      HISTORY.slice(0, 2)
    );
  });

  it("deletes entries by id", async () => {
    const source = new InMemoryAgentChatHistorySource(HISTORY);
    await source.delete("c2");
    expect(source.all().map((entry) => entry.id)).toEqual(["c1", "c3"]);
  });
});

describe("InMemoryAgentKnowledgeBaseSource", () => {
  it("lists seeded entries", async () => {
    const source = new InMemoryAgentKnowledgeBaseSource([
      { id: "kb-1", label: "Policy" },
    ]);
    expect(await source.list()).toEqual([{ id: "kb-1", label: "Policy" }]);
  });

  it("uploads a new file as a ready entry", async () => {
    const source = new InMemoryAgentKnowledgeBaseSource();
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });

    const entry = await source.upload(undefined, file);

    expect(entry).toEqual(
      expect.objectContaining({
        label: "notes.txt",
        fileName: "notes.txt",
        mime: "text/plain",
        size: 5,
        status: "ready",
      })
    );
    expect(entry.id).toMatch(/^kb-/);
    expect(await source.list()).toEqual([entry]);
  });

  it("defaults the MIME type for files without one", async () => {
    const source = new InMemoryAgentKnowledgeBaseSource();
    const file = new File(["x"], "blob.bin", { type: "" });
    const entry = await source.upload(undefined, file);
    expect(entry.mime).toBe("application/octet-stream");
  });

  it("updates an existing entry while preserving its id and label", async () => {
    const source = new InMemoryAgentKnowledgeBaseSource([
      {
        id: "kb-existing",
        label: "Policy",
        fileName: "old.txt",
        mime: "text/plain",
        size: 1,
        status: "ready",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const file = new File(["new content"], "new.md", { type: "text/markdown" });

    const entry = await source.upload("kb-existing", file);

    expect(entry).toEqual(
      expect.objectContaining({
        id: "kb-existing",
        label: "Policy",
        fileName: "new.md",
        mime: "text/markdown",
        size: 11,
        status: "ready",
      })
    );
    expect(await source.list()).toEqual([entry]);
  });

  it("removes an entry by id", async () => {
    const source = new InMemoryAgentKnowledgeBaseSource([
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ]);
    await source.remove("a");
    expect((await source.list()).map((entry) => entry.id)).toEqual(["b"]);
  });
});

describe("agentChatStore", () => {
  it("starts from empty decaf state with optional seeds", () => {
    const state = createAgentChatDecafStore().getState();
    expect(state).toEqual(
      expect.objectContaining({
        roundtrips: [],
        structuredObject: null,
        structuredObjectHistory: [],
        approval: null,
        backendAvailable: null,
        error: null,
        activeRunId: null,
      })
    );
    expect(state.demo).toEqual({
      workflowSteps: [],
      agentStep: null,
      nestedAgent: null,
      progress: null,
      orders: [],
      tracker: null,
      weather: null,
      notifications: [],
    });

    const seeded = createAgentChatDecafStore({
      backendAvailable: true,
      error: "boom",
      activeRunId: "run-9",
    }).getState();
    expect(seeded.backendAvailable).toBe(true);
    expect(seeded.error).toBe("boom");
    expect(seeded.activeRunId).toBe("run-9");
  });

  it("merges telemetry rows and tracks the active run", () => {
    const store = createAgentChatDecafStore();

    store.getState().mergeTelemetry({ runId: "run-1", status: "running" });
    expect(store.getState().roundtrips).toEqual([
      { runId: "run-1", status: "running" },
    ]);
    expect(store.getState().activeRunId).toBe("run-1");

    store.getState().mergeTelemetry({ runId: "run-1", status: "succeeded" });
    expect(store.getState().roundtrips).toHaveLength(1);
    expect(store.getState().roundtrips[0].status).toBe("succeeded");
    expect(store.getState().activeRunId).toBeNull();

    store.getState().mergeTelemetry({ runId: "run-2", status: "queued" });
    expect(store.getState().roundtrips.map((row) => row.runId)).toEqual([
      "run-1",
      "run-2",
    ]);
    expect(store.getState().activeRunId).toBe("run-2");
  });

  it("records structured objects with de-duplicated history", () => {
    const store = createAgentChatDecafStore();
    const first = { runId: "run-1", value: { a: 1 } };

    store.getState().setStructuredObject(first);
    expect(store.getState().structuredObject).toBe(first);
    expect(store.getState().structuredObjectHistory).toHaveLength(1);

    store.getState().setStructuredObject(first);
    expect(store.getState().structuredObjectHistory).toHaveLength(1);

    store.getState().setStructuredObject({ runId: "run-1", value: { a: 2 } });
    expect(store.getState().structuredObjectHistory).toHaveLength(2);

    store.getState().setStructuredObject(null);
    expect(store.getState().structuredObject).toBeNull();
    expect(store.getState().structuredObjectHistory).toHaveLength(2);
  });

  it("commits structured-object history entries directly", () => {
    const store = createAgentChatDecafStore();
    store.getState().commitStructuredObject({
      runId: "run-1",
      value: { a: 1 },
      committedAt: "2026-11-19T10:00:00.000Z",
    });
    expect(store.getState().structuredObjectHistory).toHaveLength(1);
  });

  it("stores approval, availability and error projections", () => {
    const store = createAgentChatDecafStore();
    store.getState().setApproval({ runId: "r", status: "pending" });
    store.getState().setBackendAvailable(false);
    store.getState().setError("offline");

    expect(store.getState().approval).toEqual({ runId: "r", status: "pending" });
    expect(store.getState().backendAvailable).toBe(false);
    expect(store.getState().error).toBe("offline");
  });

  it("applies every demo event kind", () => {
    const store = createAgentChatDecafStore();
    const events: AgentChatDemoEvent[] = [
      {
        kind: "workflow-steps",
        steps: [{ id: "s1", name: "Step", status: "running" }],
      },
      {
        kind: "agent-step",
        step: { id: "a1", name: "Agent", status: "running" },
      },
      {
        kind: "nested-agent",
        snapshot: {
          runId: "nested",
          depth: 1,
          ancestry: ["root"],
          status: "running",
        },
      },
      {
        kind: "progress",
        event: { id: "p1", label: "Loading", value: 10, total: 100 },
      },
      {
        kind: "orders",
        orders: [{ id: "o1", name: "Order", date: "2026-11-19", status: "Shipped" }],
      },
      {
        kind: "tracker",
        status: "shipped",
        progress: 60,
        label: "In transit",
        description: "Lisbon to Porto",
      },
      {
        kind: "weather",
        weather: { location: "Lisbon", high: 24, low: 17, state: "success" },
      },
      {
        kind: "notification",
        notification: { id: "n1", severity: "success", message: "Done" },
      },
      {
        kind: "approval",
        status: "pending",
        runId: "run-approval",
        toolName: "sendSummary",
        payload: { to: "a@b.c" },
      },
    ];

    for (const event of events) store.getState().applyDemoEvent(event);

    const state = store.getState();
    expect(state.demo.workflowSteps).toHaveLength(1);
    expect(state.demo.agentStep?.id).toBe("a1");
    expect(state.demo.nestedAgent?.runId).toBe("nested");
    expect(state.demo.progress?.value).toBe(10);
    expect(state.demo.orders).toHaveLength(1);
    expect(state.demo.tracker).toEqual({
      status: "shipped",
      progress: 60,
      label: "In transit",
      description: "Lisbon to Porto",
    });
    expect(state.demo.weather?.location).toBe("Lisbon");
    expect(state.demo.notifications).toHaveLength(1);
    expect(state.approval).toEqual({
      runId: "run-approval",
      status: "pending",
      toolName: "sendSummary",
      payload: { to: "a@b.c" },
    });
  });

  it("deduplicates notifications and dismisses by id", () => {
    const store = createAgentChatDecafStore();
    const notification = { id: "n1", message: "Done" };
    store.getState().applyDemoEvent({ kind: "notification", notification });
    store.getState().applyDemoEvent({ kind: "notification", notification });
    expect(store.getState().demo.notifications).toHaveLength(1);

    store.getState().dismissNotification("n1");
    expect(store.getState().demo.notifications).toEqual([]);
  });

  it("resets demo panels and approval while preserving backend availability", () => {
    const store = createAgentChatDecafStore({ backendAvailable: true });
    store.getState().setError("boom");
    store.getState().setApproval({ runId: "r", status: "approved" });
    store.getState().applyDemoEvent({
      kind: "orders",
      orders: [{ id: "o", name: "Order", date: "2026-11-19", status: "Shipped" }],
    });

    store.getState().applyDemoEvent({ kind: "reset" });

    expect(store.getState().demo.orders).toEqual([]);
    expect(store.getState().approval).toBeNull();
  });

  it("clears every mutable field on reset", () => {
    const store = createAgentChatDecafStore({ backendAvailable: true });
    store.getState().mergeTelemetry({ runId: "r", status: "running" });
    store.getState().setStructuredObject({ runId: "r", value: { a: 1 } });
    store.getState().setError("boom");
    store.getState().applyDemoEvent({
      kind: "notification",
      notification: { id: "n", message: "x" },
    });

    store.getState().reset();

    const state = store.getState();
    expect(state.roundtrips).toEqual([]);
    expect(state.structuredObject).toBeNull();
    expect(state.structuredObjectHistory).toEqual([]);
    expect(state.activeRunId).toBeNull();
    expect(state.error).toBeNull();
    expect(state.demo.notifications).toEqual([]);
    expect(state.backendAvailable).toBe(true);
  });

  it("ignores unknown demo events", () => {
    const store = createAgentChatDecafStore();
    const before = store.getState().demo;
    store.getState().applyDemoEvent({ kind: "unknown" } as never);
    expect(store.getState().demo).toBe(before);
  });
});

describe("agent chat models", () => {
  it("validates the composer message as required and non-empty", () => {
    const empty = new AgentChatComposerModel({ message: "" });
    expect(empty.hasErrors()).toBeTruthy();

    const valid = new AgentChatComposerModel({ message: "Hello" });
    expect(valid.hasErrors()).toBeFalsy();
  });

  it("requires a role and content on the message model", () => {
    const invalid = new AgentChatMessageModel({});
    expect(invalid.hasErrors()).toBeTruthy();

    const valid = new AgentChatMessageModel({
      role: "user",
      content: "Hello",
      runId: "run-1",
      createdAt: "2026-11-19T10:00:00.000Z",
    });
    expect(valid.hasErrors()).toBeFalsy();
  });

  it("exposes the role options with their i18n keys", () => {
    expect(AGENT_CHAT_ROLES).toEqual([
      { value: "user", text: "agent.chat.role.user" },
      { value: "assistant", text: "agent.chat.role.assistant" },
      { value: "system", text: "agent.chat.role.system" },
      { value: "error", text: "agent.chat.role.error" },
    ]);
  });
});
