# `@decaf-ts/for-react/agent`

Agent conversation UI for a graph workflow run. The entry point ships the
React `AgentChatProvider`/`useAgentChat` composition, the `AgentChat` component
and the chat component families (messages, composer, tools, approvals,
artifacts, history, knowledge base, telemetry, structured objects), the
transport contract with its default graph-run transport, the legacy->SDK
bridge and the deterministic demo transport, the event-envelope fold with its
`UIMessageChunk` producer, the media-URL allowlist, the Decaf composer/message
models, and the translation fallback helper.

Conversation state lives on the `@ai-sdk/react` `useChat` state machine (a
direct dependency of this package, loaded only through this subpath):
`AgentChatProvider` resolves the transport, `useAgentChat` projects the SDK
`UIMessage`s into the `AgentChatMessageView` read model and adds the
Decaf-owned side channel (telemetry, structured object, approval, demo panels,
backend availability) through a Zustand store.

## Install

```bash
npm install @decaf-ts/for-react
```

`/agent` is a named subpath export and the only entry point that evaluates
`@ai-sdk/react`, `ai` and `zustand`; hosts that import
`@decaf-ts/for-react` alone never load them.

The default `GraphRunAgentChatTransport` talks to the graph run backend through
`@decaf-ts/as-graph`, an **optional peer dependency** of
`@decaf-ts/for-react`. Install it (and its own peers) when you keep the default
transport:

```bash
npm install @decaf-ts/as-graph@^0.11.5
```

Required root peers (`react`, `react-dom`, `@decaf-ts/core`,
`@decaf-ts/db-decorators`, `@decaf-ts/decorator-validation`,
`@decaf-ts/ui-decorators`) apply unchanged. Import the stylesheet once from the
subpath:

```ts
import "@decaf-ts/for-react/agent/styles.css";
```

### Compatibility

| Package | Tested range |
| --- | --- |
| `react` / `react-dom` | `>=18.0.0` |
| `@ai-sdk/react` | `^4.0.181` (transitive) |
| `ai` | `^7.0.177` (transitive) |
| `zustand` | `^5.1.0` (transitive) |
| `@decaf-ts/as-graph` | `^0.11.5` (optional peer) |
| `@decaf-ts/for-react` | `0.0.x` |

## Usage

```tsx
import {
  AgentChat,
  AgentChatProvider,
} from "@decaf-ts/for-react/agent";
import "@decaf-ts/for-react/agent/styles.css";

export function WorkflowChat({ workflowId }: { workflowId: string }) {
  return (
    <AgentChatProvider>
      <AgentChat
        workflowId={workflowId}
        knowledgeSources={[]}
        onApprovalDecision={(decision) => {
          // decision is AgentChatApprovalResume ({ type: "resume" }) or
          // AgentChatApprovalDenial ({ type: "deny" })
          console.log(decision);
        }}
      />
    </AgentChatProvider>
  );
}
```

`AgentChatProvider` defaults to `GraphRunAgentChatTransport`, an empty
in-memory history source, an empty in-memory knowledge-base source, a fresh
Zustand store and the for-react i18n cache. Override each seam with a prop:

```tsx
<AgentChatProvider
  transport={myTransport}
  historySource={myHistorySource}
  knowledgeBaseSource={myKnowledgeBaseSource}
  translate={(key, fallback) => i18n.t(key, { defaultValue: fallback })}
>
  <AgentChat workflowId="my-workflow" />
</AgentChatProvider>
```

Use `useAgentChat` directly when you render your own shell instead of the
`AgentChat` component:

```tsx
import { useAgentChat } from "@decaf-ts/for-react/agent";

function CustomChat() {
  const chat = useAgentChat({ workflowId: "my-workflow" });
  return (
    <div>
      {chat.messages.map((message) => (
        <article key={message.id}>{message.content}</article>
      ))}
      <button disabled={chat.running} onClick={() => chat.send("Hello")}>
        Send
      </button>
    </div>
  );
}
```

### Transport seam

A transport implements the legacy envelope-callback `AgentChatTransport`
(`send`, `replay`, `cancel`) and is bridged onto the `@ai-sdk/react`
`ChatTransport` seam by `AgentChatLegacyChatTransportAdapter`. A transport that
implements the SDK seam directly (`AgentChatSdkTransport`, i.e. `sendMessages`
plus the side-channel source) is used as-is. This is what lets
`AgentChatFakeTransport` (demo/Storybook) and any consumer-supplied transport
participate in the SDK message model.

- `GraphRunAgentChatTransport` — default. Creates a run via `POST /graph/runs`,
  streams its envelopes through `AgentChatEnvelopeChunkProducer`, replays with
  `reconnectToStream`, and issues the idempotent
  `DELETE /graph/runs/{runId}` on cancel.
- `AgentChatLegacyChatTransportAdapter` — legacy transport bridge.
- `AgentChatFakeTransport` — deterministic, timed scripted transport with no
  network or backend; drives every component family, including approvals and
  the tool cards.

### Approval side-channel contract

Run-level approvals are **not** `tool-approval-*` chunks. The envelope fold
surfaces a suspended run through the Decaf side channel as
`onDemoEvent({ kind: "approval", status, runId, payload? })` (see
`AgentChatSideChannelHandlers`), and `useAgentChat` projects it into the store's
`approval` view. `ChatApproval` renders it and emits exactly one of:

- `AgentChatApprovalResume` — `{ type: "resume", runId, resumeData }`
- `AgentChatApprovalDenial` — `{ type: "deny", runId, reason? }`

`AgentChat` forwards either through `onApprovalDecision`; render `ChatApproval`
directly to use `onApprove`/`onReject`. The approval-bridge decision of record
is on SAA-1755 (`#document-approval-bridge-spike`).

### i18n

Every component resolves `agent.chat.*` keys through
`agentChatTranslate`/`useAgentTranslate`. The default resolver reads the
for-react i18n cache and returns the caller-supplied English fallback when a
key is missing or not yet loaded, so the chat never renders a raw locale key.
`public/i18n/en.json` and `public/i18n/pt.json` carry the full, identical
`agent.chat.*` key set; hosts may inject their own resolver through the
provider's `translate` prop with the same `(key, fallback) => string`
contract.

### Demo page

`demo/pages/AgentPage.tsx` wires `AgentChatFakeTransport` (speed `2`) with
`InMemoryAgentChatHistorySource` and `InMemoryAgentKnowledgeBaseSource`, then
renders the component families (`ChatApproval`, `ChatArtifact*`, `ChatTool*`,
`ChatWorkflowStatus`, `ChatTelemetry`, `ChatStructuredObject`, …) from the
`useAgentChatDecafStore` side-channel state.

## Exported surface (130 runtime exports)

- Composition: `AgentChatProvider`, `useAgentChat`, `useAgentChatContext`,
  `useAgentChatDecafStore`, `useAgentTranslate`, `createAgentChatDecafStore`,
  `isAgentChatSdkTransport`, `AGENT_CHAT_SESSION_PREFIX`
- Transports: `GraphRunAgentChatTransport`, `requestFromMessages`,
  `AgentChatLegacyChatTransportAdapter`, `AgentChatFakeTransport`,
  `AGENT_CHAT_DEMO_WORKFLOW_ID`, `InMemoryAgentChatHistorySource`,
  `InMemoryAgentKnowledgeBaseSource`
- Envelope pipeline: `agentChatFoldEnvelope`, `emptyAgentChatFoldState`,
  `AgentChatEnvelopeChunkProducer`, `agentChatTranscriptMarkdown`
- Projection helpers: `agentChatMessagesFromUI`, `projectParts`,
  `projectToolPart`, `errorTextOf`
- Media: `safeMediaUrl`
- i18n: `agentChatTranslate`, `defaultAgentChatTranslate`
- Models: `AgentChatComposerModel`, `AgentChatMessageModel`,
  `AGENT_CHAT_ROLES`
- Components: `AgentChat`, the `Chat*` families and their `*Component`
  aliases, the `Dsw*` layout shells, `AGENT_CHAT_ICON_NAMES`,
  `DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS`, plus the artifact/structured-object
  utilities (`diffAgentChatArtifactText`, `hasAgentChatArtifactChanges`,
  `tokenizeAgentChatCode`, `flattenAgentChatStructuredObject`,
  `summarizeAgentChatStructuredValue`)
- Types: the `AgentChatTransport`/read-model/attachment/artifact/approval
  types re-exported from `types.ts`

## Controlled-view contract

The components own only presentation state. Conversation state lives on the
`@ai-sdk/react` `useChat` state machine plus the Decaf side-channel store, and
every run is delegated to the resolved transport. `send`/`replay` are
asynchronous and report failures through the controller's `error`;
`cancel` stops the active run and cancels the backend run. File attachments are
metadata only — their contents are never read.

## License

`@decaf-ts/as-graph` is an external optional peer and is not vendored.
