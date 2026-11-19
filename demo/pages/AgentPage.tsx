import React, { useMemo, useState } from "react";
import {
  AgentChat,
  AgentChatFakeTransport,
  AgentChatProvider,
  ChatAgentStep,
  ChatApproval,
  ChatArtifact,
  ChatArtifactConsole,
  ChatArtifactDiff,
  ChatArtifactDocument,
  ChatArtifactEditor,
  ChatArtifactSkeleton,
  ChatArtifactToolbar,
  ChatArtifactVersionFooter,
  ChatHistoryItem,
  ChatNestedAgent,
  ChatProgress,
  ChatStructuredObject,
  ChatTelemetry,
  ChatTool,
  ChatToolOrders,
  ChatToolTracker,
  ChatToolWeather,
  ChatWorkflowStatus,
  InMemoryAgentChatHistorySource,
  InMemoryAgentKnowledgeBaseSource,
  useAgentChatDecafStore,
  useAgentTranslate,
  type AgentChatApprovalDenial,
  type AgentChatApprovalResume,
  type AgentChatArtifactDocument,
  type AgentChatArtifactKind,
  type AgentChatConsoleRow,
  type AgentChatHistoryEntry,
  type AgentChatModel,
  type AgentChatSlashCommand,
} from "../../src/agent";
import type { ChatArtifactDiffMode } from "../../src/agent";

const DEMO_HISTORY: AgentChatHistoryEntry[] = [
  {
    id: "conversation-orders",
    title: "Recent orders and shipment",
    preview: "Three orders are on file and the shipment is in transit.",
    updatedAt: "2026-11-18T09:24:00.000Z",
    messageCount: 6,
    visibility: "private",
  },
  {
    id: "conversation-forecast",
    title: "Lisbon forecast",
    preview: "Sunny, 24°C high and 17°C low.",
    updatedAt: "2026-11-17T16:02:00.000Z",
    messageCount: 4,
    visibility: "shared",
    sharedWith: ["team@example.com"],
  },
  {
    id: "conversation-tooling",
    title: "Tool approval walkthrough",
    preview: "Approve sending the summary to the customer.",
    updatedAt: "2026-11-15T11:41:00.000Z",
    messageCount: 9,
    visibility: "public",
  },
];

const DEMO_KNOWLEDGE = [
  {
    id: "kb-orders",
    label: "Orders handbook",
    fileName: "orders-handbook.pdf",
    mime: "application/pdf",
    size: 248_320,
    status: "ready" as const,
    updatedAt: "2026-11-10T08:00:00.000Z",
  },
  {
    id: "kb-shipping",
    label: "Shipping policy",
    fileName: "shipping-policy.md",
    mime: "text/markdown",
    size: 12_800,
    status: "ready" as const,
    updatedAt: "2026-11-12T08:00:00.000Z",
  },
  {
    id: "kb-weather",
    label: "Weather briefings",
    fileCount: 4,
    status: "ready" as const,
    updatedAt: "2026-11-14T08:00:00.000Z",
  },
];

const DEMO_ARTIFACT_DOCUMENT: AgentChatArtifactDocument = {
  id: "artifact-summary",
  title: "Customer summary",
  kind: "text",
  version: 2,
  content:
    "Three orders are on file. One shipment is in transit from Lisbon to Porto, expected tomorrow. Lisbon is currently 24°C and sunny.",
};

const DEMO_CONSOLE_ROWS: AgentChatConsoleRow[] = [
  { id: "console-1", level: "log", text: "connected to demo transport" },
  { id: "console-2", level: "info", text: "orders tool returned 3 rows" },
  { id: "console-3", level: "warn", text: "forecast cache expired; refetching" },
  { id: "console-4", level: "error", text: "no approval recorded yet" },
];

const DEMO_DIFF_PREVIOUS = [
  "const total = price * quantity;",
  "return total;",
].join("\n");

const DEMO_DIFF_CURRENT = [
  "const subtotal = price * quantity;",
  "const total = subtotal * (1 + taxRate);",
  "return total;",
].join("\n");

function AgentDemoContent() {
  const t = useAgentTranslate();
  const demo = useAgentChatDecafStore((state) => state.demo);
  const roundtrips = useAgentChatDecafStore((state) => state.roundtrips);
  const structured = useAgentChatDecafStore((state) => state.structuredObject);
  const approval = useAgentChatDecafStore((state) => state.approval);

  const [artifactKind, setArtifactKind] =
    useState<AgentChatArtifactKind>("code");
  const [version, setVersion] = useState(2);
  const [consoleRows, setConsoleRows] =
    useState<AgentChatConsoleRow[]>(DEMO_CONSOLE_ROWS);
  const [editorContent, setEditorContent] = useState(
    "export function total(items) {\n  return items.reduce((sum, item) => sum + item.price, 0);\n}"
  );
  const [diffMode, setDiffMode] = useState<ChatArtifactDiffMode>("side-by-side");
  const [decision, setDecision] = useState<string | null>(null);

  const suggestions = useMemo(
    () => [
      t("agent.chat.demo.suggestion.orders", "Show my recent orders"),
      t("agent.chat.demo.suggestion.track", "Where is my shipment?"),
      t("agent.chat.demo.suggestion.weather", "What is the forecast for Lisbon?"),
    ],
    [t]
  );

  const slashCommands: AgentChatSlashCommand[] = useMemo(
    () => [
      {
        name: "summarize",
        description: t(
          "agent.chat.demo.command.summarize",
          "Summarize the conversation"
        ),
      },
      {
        name: "translate",
        description: t(
          "agent.chat.demo.command.translate",
          "Translate the last message"
        ),
      },
    ],
    [t]
  );

  const models: AgentChatModel[] = useMemo(
    () => [
      {
        id: "demo-agent",
        name: t("agent.chat.demo.model.agent", "Demo agent"),
        description: t(
          "agent.chat.demo.model.agentDescription",
          "Deterministic scripted transport"
        ),
        provider: "decaf",
      },
      {
        id: "demo-fast",
        name: t("agent.chat.demo.model.fast", "Fast agent"),
        provider: "decaf",
      },
    ],
    [t]
  );

  const onApprovalDecision = (
    next: AgentChatApprovalResume | AgentChatApprovalDenial
  ) => {
    setDecision(
      next.type === "resume"
        ? t("agent.chat.demo.approval.approved", "Approved")
        : t("agent.chat.demo.approval.rejected", "Rejected")
    );
  };

  return (
    <div className="agent-demo">
      <section className="agent-demo__chat" aria-label={t("agent.chat.demo.chat", "Agent chat")}>
        <AgentChat
          suggestions={suggestions}
          slashCommands={slashCommands}
          models={models}
          onApprovalDecision={onApprovalDecision}
        />
      </section>

      <aside className="agent-demo__panels">
        <section className="agent-demo__panel">
          <h2>{t("agent.chat.demo.workflow", "Workflow")}</h2>
          <ChatWorkflowStatus steps={demo.workflowSteps} />
          <ChatProgress events={demo.progress ? [demo.progress] : []} />
          {demo.agentStep ? (
            <ChatAgentStep
              name={demo.agentStep.name}
              status={demo.agentStep.status}
              stepInput={demo.agentStep.input}
              stepOutput={demo.agentStep.output}
              error={demo.agentStep.error ?? null}
            />
          ) : null}
          {demo.nestedAgent ? (
            <ChatNestedAgent
              runId={demo.nestedAgent.runId ?? null}
              depth={demo.nestedAgent.depth ?? 0}
              ancestry={demo.nestedAgent.ancestry ?? []}
              text={demo.nestedAgent.text ?? ""}
              streaming={demo.nestedAgent.streaming ?? false}
              status={demo.nestedAgent.status ?? "running"}
              toolErrors={demo.nestedAgent.toolErrors ?? []}
            />
          ) : null}
        </section>

        <section className="agent-demo__panel">
          <h2>{t("agent.chat.demo.toolResults", "Tool results")}</h2>
          <ChatTool
            name="searchOrders"
            title={t("agent.chat.demo.tool.searchOrders", "Search orders")}
            state="output-available"
            toolInput={{ query: "lisbon", limit: 3 }}
            toolOutput={{ count: demo.orders.length }}
          />
          <ChatToolOrders orders={demo.orders} />
          {demo.tracker ? (
            <ChatToolTracker
              status={demo.tracker.status}
              progress={demo.tracker.progress}
              label={demo.tracker.label ?? null}
              description={demo.tracker.description ?? null}
            />
          ) : null}
          {demo.weather ? (
            <ChatToolWeather
              location={demo.weather.location}
              condition={demo.weather.condition ?? null}
              high={demo.weather.high}
              low={demo.weather.low}
              unit={demo.weather.unit ?? "°C"}
              night={demo.weather.night ?? false}
              state={demo.weather.state ?? "success"}
            />
          ) : null}
        </section>

        <section className="agent-demo__panel">
          <h2>{t("agent.chat.demo.telemetry", "Telemetry")}</h2>
          <ChatTelemetry roundtrips={roundtrips} open />
          <ChatStructuredObject
            value={structured?.value ?? { orders: 3, inTransit: 1 }}
            runId={structured?.runId ?? "demo-run-structured"}
            history={[]}
          />
          {approval ? (
            <ChatApproval
              runId={approval.runId}
              status={approval.status}
              payload={approval.payload}
              toolName={approval.toolName ?? null}
              onApprove={(next) => onApprovalDecision(next)}
              onReject={(next) => onApprovalDecision(next)}
            />
          ) : (
            <ChatApproval
              runId="demo-run-approval"
              status="pending"
              toolName="sendSummary"
              payload={{
                to: "customer@example.com",
                summary: "Three orders, one shipment in transit.",
              }}
              onApprove={(next) => onApprovalDecision(next)}
              onReject={(next) => onApprovalDecision(next)}
            />
          )}
          {decision ? (
            <p className="agent-demo__decision" role="status">
              {t("agent.chat.demo.approval.lastDecision", "Last decision")}:{" "}
              {decision}
            </p>
          ) : null}
        </section>

        <section className="agent-demo__panel">
          <h2>{t("agent.chat.demo.historyItem", "History item")}</h2>
          <ChatHistoryItem entry={DEMO_HISTORY[0]} active />
        </section>
      </aside>

      <section className="agent-demo__gallery" aria-label={t("agent.chat.demo.artifacts", "Artifacts")}>
        <h2>{t("agent.chat.demo.artifacts", "Artifacts")}</h2>

        <ChatArtifactToolbar
          selected={artifactKind}
          onToolSelected={(kind) => setArtifactKind(kind)}
        />

        <div className="agent-demo__grid">
          <ChatArtifact
            kind={artifactKind}
            title={t("agent.chat.demo.artifact.title", "Draft artifact")}
            visibility="shared"
            content={
              artifactKind === "image"
                ? "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='%230f766e'/></svg>"
                : "The artifact body renders the currently selected kind."
            }
          />

          <ChatArtifactEditor
            kind={artifactKind}
            language="ts"
            content={editorContent}
            onContentChange={setEditorContent}
          />

          <ChatArtifactSkeleton variant="full" lines={3} />

          <ChatArtifactSkeleton variant="inline" />

          <ChatArtifactDiff
            previous={DEMO_DIFF_PREVIOUS}
            current={DEMO_DIFF_CURRENT}
            mode={diffMode}
            onModeChange={setDiffMode}
          />

          <ChatArtifactConsole
            rows={consoleRows}
            onCleared={() => setConsoleRows([])}
            onHeightChange={() => undefined}
          />

          <ChatArtifactDocument document={DEMO_ARTIFACT_DOCUMENT} />

          <ChatArtifactDocument
            status="loading"
            documentId="artifact-loading"
            toolName="loadDocument"
          />

          <div>
            <ChatArtifactVersionFooter
              currentVersion={version}
              totalVersions={4}
              versions={[
                { id: "v1", label: "Initial draft" },
                { id: "v2", label: "Added tax rate" },
                { id: "v3", label: "Clarified totals" },
                { id: "v4", label: "Final review" },
              ]}
              onVersionChange={setVersion}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export function AgentPage() {
  const [transport] = useState(() => {
    const fake = new AgentChatFakeTransport();
    fake.configure({ speed: 2 });
    return fake;
  });
  const [historySource] = useState(
    () => new InMemoryAgentChatHistorySource(DEMO_HISTORY)
  );
  const [knowledgeBaseSource] = useState(
    () => new InMemoryAgentKnowledgeBaseSource(DEMO_KNOWLEDGE)
  );

  return (
    <AgentChatProvider
      transport={transport}
      historySource={historySource}
      knowledgeBaseSource={knowledgeBaseSource}
    >
      <AgentDemoContent />
    </AgentChatProvider>
  );
}
