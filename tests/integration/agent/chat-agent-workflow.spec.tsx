import "./xyflow-mock";
import React from "react";
import { screen } from "@testing-library/react";
import { ChatAgentStep } from "../../../src/agent/components/chat-agent-step/ChatAgentStep.js";
import { ChatNestedAgent } from "../../../src/agent/components/chat-nested-agent/ChatNestedAgent.js";
import { ChatWorkflowStatus } from "../../../src/agent/components/chat-workflow-status/ChatWorkflowStatus.js";
import { ChatProgress } from "../../../src/agent/components/chat-progress/ChatProgress.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * SAA-2095 coverage requirement 4–5 — agent step, nested agent, workflow
 * status, and progress.
 */

describe("ChatAgentStep", () => {
  it.each([
    ["waiting", "Waiting"],
    ["running", "Running"],
    ["success", "Succeeded"],
    ["failed", "Failed"],
    ["suspended", "Suspended"],
  ] as const)("renders the %s status label", (status, label) => {
    const { container } = renderInAgentProvider(
      <ChatAgentStep name="Retrieve context" status={status} />
    );

    const section = container.querySelector(
      ".dcf-chat-agent-step"
    ) as HTMLElement;
    expect(section.dataset.status).toBe(status);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders the agent id, error row, and collapsible input/output panes", () => {
    renderInAgentProvider(
      <ChatAgentStep
        name="Retrieve context"
        agentId="agent-7"
        status="failed"
        stepInput={{ query: "orders" }}
        stepOutput={{ rows: 2 }}
        error="tool exploded"
      />
    );

    expect(screen.getByText("agent-7")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("tool exploded");

    const panes = Array.from(document.querySelectorAll("details"));
    expect(panes).toHaveLength(2);
    expect(panes[0]).not.toHaveAttribute("open");
    expect(panes[0].querySelector("summary")).toHaveTextContent("Input");
    expect(panes[0].querySelector("pre")?.textContent).toContain(
      '"query": "orders"'
    );
    expect(panes[1].querySelector("summary")).toHaveTextContent("Output");
    expect(panes[1].querySelector("pre")?.textContent).toContain('"rows": 2');
  });
});

describe("ChatNestedAgent", () => {
  it("renders name, run id, ancestry, depth indent, and streaming caret", () => {
    const { container } = renderInAgentProvider(
      <ChatNestedAgent
        name="Researcher"
        runId="run-9"
        depth={2}
        ancestry={["Planner", "Researcher"]}
        text="Gathering sources"
        streaming
        status="running"
      />
    );

    const section = container.querySelector(
      ".dcf-chat-nested-agent"
    ) as HTMLElement;
    expect(section.dataset.status).toBe("running");
    expect(section).toHaveStyle({ paddingLeft: "32px" });
    expect(screen.getByText("Researcher")).toBeInTheDocument();
    expect(screen.getByText("run-9")).toBeInTheDocument();
    expect(screen.getByText("Planner › Researcher")).toBeInTheDocument();
    expect(screen.getByText("Gathering sources")).toBeInTheDocument();
    expect(
      container.querySelector(".dcf-chat-nested-agent__caret")
    ).not.toBeNull();
  });

  it("renders tool error rows", () => {
    renderInAgentProvider(
      <ChatNestedAgent
        name="Researcher"
        status="failed"
        toolErrors={[
          { id: "call-1", toolName: "web_search", message: "rate limited" },
        ]}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("web_search");
    expect(screen.getByRole("alert")).toHaveTextContent("rate limited");
  });
});

describe("ChatWorkflowStatus", () => {
  it("renders each step with its status chip, error row, and output details", () => {
    const { container } = renderInAgentProvider(
      <ChatWorkflowStatus
        steps={[
          { id: "a", name: "Intake", status: "success", output: { ok: true } },
          { id: "b", name: "Retrieve", status: "failed", error: "timeout" },
          { id: "c", name: "Compose", status: "running" },
        ]}
      />
    );

    const rows = container.querySelectorAll(
      ".dcf-chat-workflow-status__step"
    );
    expect(rows).toHaveLength(3);
    expect((rows[0] as HTMLElement).dataset.status).toBe("success");
    expect((rows[1] as HTMLElement).dataset.status).toBe("failed");
    expect((rows[2] as HTMLElement).dataset.status).toBe("running");

    expect(screen.getByText("Succeeded")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("timeout");

    const output = container.querySelector(
      "details.dcf-chat-workflow-status__output"
    ) as HTMLDetailsElement;
    expect(output).not.toBeNull();
    expect(output.querySelector("summary")).toHaveTextContent("Output");
    expect(output.querySelector("pre")?.textContent).toContain('"ok": true');
  });

  it("renders the empty state", () => {
    renderInAgentProvider(<ChatWorkflowStatus steps={[]} />);
    expect(screen.getByText("No workflow steps yet.")).toBeInTheDocument();
  });
});

describe("ChatProgress", () => {
  it("renders the empty state", () => {
    renderInAgentProvider(<ChatProgress events={[]} />);
    expect(screen.getByText("Waiting for progress…")).toBeInTheDocument();
  });

  it("lets the latest event win and renders the computed percent", () => {
    renderInAgentProvider(
      <ChatProgress
        events={[
          { id: "a", label: "First", value: 10, total: 40 },
          { id: "b", label: "Second", value: 30, total: 40 },
        ]}
      />
    );

    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.queryByText("First")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "75"
    );
  });

  it("clamps percentages into 0–100", () => {
    const high = renderInAgentProvider(
      <ChatProgress events={[{ label: "Over", value: 200, total: 100 }]} />
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
    high.unmount();

    renderInAgentProvider(
      <ChatProgress events={[{ label: "Under", value: -10, total: 100 }]} />
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
  });

  it("marks the done state and renders the message", () => {
    const { container } = renderInAgentProvider(
      <ChatProgress
        events={[
          {
            label: "Finishing",
            value: 1,
            total: 4,
            done: true,
            message: "All steps settled",
          },
        ]}
      />
    );

    const section = container.querySelector(".dcf-chat-progress") as HTMLElement;
    expect(section.dataset.done).toBe("true");
    expect(screen.getByText("All steps settled")).toBeInTheDocument();
    expect(
      container.querySelector(".dcf-chat-progress__icon--done")
    ).not.toBeNull();
  });
});
