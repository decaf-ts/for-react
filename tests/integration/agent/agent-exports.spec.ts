import "./ai-sdk-mock";
import "./xyflow-mock";
import * as components from "../../../src/agent/components/index.js";
import * as agentSubpath from "../../../src/agent/index.js";
import * as rootEntry from "../../../src/index.js";

/**
 * SAA-2095 coverage requirement 1 — the `./agent` slice-3 export contract.
 *
 * Every ported component family is a function on the `./agent` subpath, each
 * ships the Angular-style `<Name>Component` alias that is the exact same
 * function reference, and none of these symbols are reachable from the package
 * root entrypoint (the subpath must not leak into hosts that never import it).
 */

const COMPONENT_NAMES = [
  "ChatTool",
  "ChatToolOrders",
  "ChatToolTracker",
  "ChatToolWeather",
  "ChatAgentStep",
  "ChatNestedAgent",
  "ChatWorkflowStatus",
  "ChatProgress",
  "ChatTelemetry",
  "ChatStructuredObject",
  "ChatApproval",
  "ChatArtifact",
  "ChatArtifactConsole",
  "ChatArtifactDiff",
  "ChatArtifactDocument",
  "ChatArtifactEditor",
  "ChatArtifactSkeleton",
  "ChatArtifactToolbar",
  "ChatArtifactVersionFooter",
  "ChatHistory",
  "ChatHistoryItem",
  "ChatKnowledgeBaseSelector",
] as const;

const AGENT_ONLY_SYMBOLS = [
  ...COMPONENT_NAMES,
  "AgentChat",
  "AgentChatProvider",
  "useAgentChat",
  "createAgentChatDecafStore",
  "AgentChatFakeTransport",
  "InMemoryAgentChatHistorySource",
  "InMemoryAgentKnowledgeBaseSource",
] as const;

type SymbolTable = Record<string, unknown>;

const asTable = (value: unknown): SymbolTable => value as SymbolTable;

describe("agent export contract", () => {
  it.each(COMPONENT_NAMES)(
    "exports %s as a function with a <Name>Component alias",
    (name) => {
      const subpath = asTable(agentSubpath);
      const component = subpath[name];
      expect(typeof component).toBe("function");
      expect(subpath[`${name}Component`]).toBe(component);
    }
  );

  it("re-exports the same component references from the components barrel", () => {
    const subpath = asTable(agentSubpath);
    const barrel = asTable(components);
    for (const name of COMPONENT_NAMES) {
      expect(barrel[name]).toBe(subpath[name]);
      expect(barrel[`${name}Component`]).toBe(subpath[name]);
    }
  });

  it("exports AgentChat with its component alias", () => {
    const subpath = asTable(agentSubpath);
    expect(typeof subpath.AgentChat).toBe("function");
    expect(subpath.AgentChatComponent).toBe(subpath.AgentChat);
  });

  it("does not leak the agent subpath symbols into the root entrypoint", () => {
    const root = asTable(rootEntry);
    const leaked = AGENT_ONLY_SYMBOLS.filter((name) =>
      Object.prototype.hasOwnProperty.call(root, name)
    );
    expect(leaked).toEqual([]);
  });
});
