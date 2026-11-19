import "./xyflow-mock";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { ChatTelemetry } from "../../../src/agent/components/chat-telemetry/ChatTelemetry.js";
import {
  ChatStructuredObject,
  flattenAgentChatStructuredObject,
  summarizeAgentChatStructuredValue,
} from "../../../src/agent/components/chat-structured-object/ChatStructuredObject.js";
import type {
  AgentChatRoundtripTelemetry,
  AgentChatStructuredObjectEntry,
} from "../../../src/agent/types.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * SAA-2095 coverage requirement 6–7 — telemetry strip and structured object.
 */

describe("ChatTelemetry", () => {
  it("is collapsed by default and expands on toggle", () => {
    const onToggle = jest.fn();
    renderInAgentProvider(
      <ChatTelemetry roundtrips={[]} onToggle={onToggle} />
    );

    const trigger = screen.getByRole("button", { name: /Run telemetry/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      document.querySelector(".dcf-chat-telemetry__content")
    ).toBeNull();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      document.querySelector(".dcf-chat-telemetry__content")
    ).toHaveAttribute("role", "region");
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("formats millisecond and second durations", () => {
    const { container } = renderInAgentProvider(
      <ChatTelemetry
        open
        roundtrips={[
          { runId: "run-ms", status: "succeeded", durationMs: 450 },
          { runId: "run-s", status: "succeeded", durationMs: 1500 },
        ]}
      />
    );

    const durations = Array.from(
      container.querySelectorAll(".dcf-chat-telemetry__duration")
    ).map((node) => node.textContent?.replace(/\s+/g, " ").trim());
    expect(durations).toEqual(["450 ms", "1.5 s"]);
  });

  it("derives the duration from timestamps when durationMs is absent", () => {
    const { container } = renderInAgentProvider(
      <ChatTelemetry
        open
        roundtrips={[
          {
            runId: "run-ts",
            status: "succeeded",
            startedAt: "2026-11-19T10:00:00.000Z",
            finishedAt: "2026-11-19T10:00:02.500Z",
          },
        ]}
      />
    );

    expect(
      container.querySelector(".dcf-chat-telemetry__duration")?.textContent
        ?.replace(/\s+/g, " ")
        .trim()
    ).toBe("2.5 s");
  });

  it("renders token, trace, function and runtime-context rows", () => {
    const roundtrip: AgentChatRoundtripTelemetry = {
      runId: "run-meta",
      status: "succeeded",
      replayed: true,
      nodeCount: 5,
      completedNodeCount: 4,
      totalTokens: 120,
      promptTokens: 80,
      completionTokens: 40,
      functionId: "answer",
      traceId: "trace-abc",
      runtimeContext: { model: "test-model" },
    };
    const { container } = renderInAgentProvider(
      <ChatTelemetry open roundtrips={[roundtrip]} />
    );

    expect(screen.getByText("4/5")).toBeInTheDocument();
    expect(screen.getByText("Replayed")).toBeInTheDocument();
    expect(screen.getByText("answer")).toBeInTheDocument();
    expect(screen.getByText("trace-abc")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("120 tokens")).toBeInTheDocument();
    expect(
      container.querySelector(".dcf-chat-telemetry__json")?.textContent
    ).toContain('"model": "test-model"');
  });

  it("renders the empty state and a failing row's error", () => {
    const empty = renderInAgentProvider(<ChatTelemetry open roundtrips={[]} />);
    expect(screen.getByText("No roundtrips yet.")).toBeInTheDocument();
    empty.unmount();

    renderInAgentProvider(
      <ChatTelemetry
        open
        roundtrips={[
          {
            runId: "run-bad",
            status: "failed",
            error: { message: "graph run failed" },
          },
        ]}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("graph run failed");
  });
});

describe("ChatStructuredObject flattening", () => {
  it("flattens nested objects and arrays into depth-ordered rows", () => {
    const rows = flattenAgentChatStructuredObject({
      order: { id: "ORD-1", lines: [{ sku: "A" }, { sku: "B" }] },
      total: 42,
    });

    expect(rows.map((row) => [row.path, row.kind, row.depth, row.display])).toEqual([
      ["$", "object", 0, "{2}"],
      ["$.order", "object", 1, "{2}"],
      ["$.order.id", "primitive", 2, "ORD-1"],
      ["$.order.lines", "array", 2, "[2]"],
      ["$.order.lines[0]", "object", 3, "{1}"],
      ["$.order.lines[0].sku", "primitive", 4, "A"],
      ["$.order.lines[1]", "object", 3, "{1}"],
      ["$.order.lines[1].sku", "primitive", 4, "B"],
      ["$.total", "primitive", 1, "42"],
    ]);
  });

  it("returns no rows for null/undefined and truncates summaries", () => {
    expect(flattenAgentChatStructuredObject(null)).toEqual([]);
    expect(flattenAgentChatStructuredObject(undefined)).toEqual([]);

    const long = "x".repeat(200);
    expect(summarizeAgentChatStructuredValue(long, 10)).toBe(`${"x".repeat(10)}…`);
  });
});

describe("ChatStructuredObject", () => {
  it("renders the empty variant when there is no value", () => {
    renderInAgentProvider(<ChatStructuredObject value={null} />);
    expect(screen.getByText("No structured data yet")).toBeInTheDocument();
  });

  it("renders a ghost preview while streaming", () => {
    const { container } = renderInAgentProvider(
      <ChatStructuredObject
        value={{ order: { id: "ORD-1" } }}
        streaming
        runId="run-1"
      />
    );

    const section = container.querySelector(
      ".dcf-chat-structured-object"
    ) as HTMLElement;
    expect(section).toHaveAttribute("aria-busy", "true");
    expect(
      container.querySelector(".dcf-chat-structured-object__state")
    ).toHaveAttribute("data-state", "ghost");
    expect(screen.getByText("Streaming preview")).toBeInTheDocument();
    expect(screen.getByText("Waiting for the next field…")).toBeInTheDocument();
    expect(screen.getByText("ORD-1")).toBeInTheDocument();
  });

  it("commits the value once streaming ends and records history", () => {
    const onCommitted = jest.fn();
    const value = { order: { id: "ORD-1" } };
    const view = renderInAgentProvider(
      <ChatStructuredObject value={value} streaming runId="run-1" onCommitted={onCommitted} />
    );

    expect(onCommitted).not.toHaveBeenCalled();

    view.rerender(
      <ChatStructuredObject value={value} runId="run-1" onCommitted={onCommitted} />
    );

    expect(onCommitted).toHaveBeenCalledTimes(1);
    expect(onCommitted.mock.calls[0][0]).toMatchObject({ runId: "run-1", value });
    expect(screen.getByText("Committed")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("run-1")).toBeInTheDocument();
  });

  it("emits the selected history entry", () => {
    const onHistorySelected = jest.fn();
    const entry: AgentChatStructuredObjectEntry = {
      runId: "run-old",
      value: { total: 7 },
      committedAt: "2026-11-19T09:00:00.000Z",
    };
    renderInAgentProvider(
      <ChatStructuredObject
        value={{ total: 9 }}
        history={[entry]}
        onHistorySelected={onHistorySelected}
      />
    );

    fireEvent.click(screen.getByText("run-old"));
    expect(onHistorySelected).toHaveBeenCalledWith(entry);
  });
});
