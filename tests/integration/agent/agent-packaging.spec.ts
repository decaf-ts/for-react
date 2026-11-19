/**
 * SAA-2094 coverage requirement 3 — packaging and subpath isolation for
 * `@decaf-ts/for-react/agent`.
 *
 * Proves the emitted package in fresh Node processes (outside Jest's module
 * registry):
 *
 * - `package.json` maps `./agent` and `./agent/styles.css` to emitted files;
 * - CJS `require` and ESM `import` of the self-referenced subpath resolve and
 *   expose the same 130-symbol surface;
 * - every `<Name>Component` alias is the same function as `<Name>`;
 * - importing the package root evaluates none of `@ai-sdk/react`, `ai` or
 *   `zustand`, while the subpath itself loads the chat runtime;
 * - `npm pack --dry-run` ships the `agent` trees plus the bundled stylesheet.
 *
 * The suite skips with an explicit message only when `lib/` has not been
 * built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../../..");

const CJS_ROOT = path.join(ROOT, "lib/cjs/index.cjs");
const CJS_AGENT = path.join(ROOT, "lib/cjs/agent/index.cjs");
const ESM_ROOT = path.join(ROOT, "lib/esm/index.js");
const ESM_AGENT = path.join(ROOT, "lib/esm/agent/index.js");
const AGENT_STYLES = path.join(ROOT, "lib/agent/styles.css");

const HAS_LIB = [CJS_ROOT, CJS_AGENT, ESM_ROOT, ESM_AGENT].every((file) =>
  fs.existsSync(file)
);
const SKIP_REASON = HAS_LIB
  ? undefined
  : "lib/ is not built; run `npm run build:prod` before this probe";

const EXPECTED_AGENT_EXPORT_COUNT = 130;

const COMPONENT_NAMES = [
  "AgentChat",
  "ChatAgentStep",
  "ChatApproval",
  "ChatArtifact",
  "ChatArtifactConsole",
  "ChatArtifactDiff",
  "ChatArtifactDocument",
  "ChatArtifactEditor",
  "ChatArtifactSkeleton",
  "ChatArtifactToolbar",
  "ChatArtifactVersionFooter",
  "ChatAttachmentInput",
  "ChatAttachmentPart",
  "ChatAttachmentPreview",
  "ChatCodeBlock",
  "ChatComposer",
  "ChatConversation",
  "ChatGreeting",
  "ChatHeader",
  "ChatHistory",
  "ChatHistoryItem",
  "ChatIcon",
  "ChatKnowledgeBaseSelector",
  "ChatMessage",
  "ChatMessageActions",
  "ChatMessageEditor",
  "ChatModelSelector",
  "ChatNestedAgent",
  "ChatNotification",
  "ChatProgress",
  "ChatReasoning",
  "ChatSlashCommands",
  "ChatStructuredObject",
  "ChatSuggestedActions",
  "ChatSuggestionDialog",
  "ChatTelemetry",
  "ChatThinkingMessage",
  "ChatTool",
  "ChatToolOrders",
  "ChatToolTracker",
  "ChatToolWeather",
  "ChatVisibilitySelector",
  "ChatWorkflowStatus",
  "DswComposerShell",
  "DswSessionHeader",
  "DswSettingsDrawer",
  "DswSidebar",
];

const EXPECTED_AGENT_SYMBOLS = [
  ...COMPONENT_NAMES,
  "AGENT_CHAT_DEMO_WORKFLOW_ID",
  "AGENT_CHAT_ICON_NAMES",
  "AGENT_CHAT_ROLES",
  "AGENT_CHAT_SESSION_PREFIX",
  "AgentChatComposerModel",
  "AgentChatEnvelopeChunkProducer",
  "AgentChatFakeTransport",
  "AgentChatLegacyChatTransportAdapter",
  "AgentChatMessageModel",
  "AgentChatProvider",
  "DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS",
  "GraphRunAgentChatTransport",
  "InMemoryAgentChatHistorySource",
  "InMemoryAgentKnowledgeBaseSource",
  "agentChatFoldEnvelope",
  "agentChatMessagesFromUI",
  "agentChatTranscriptMarkdown",
  "agentChatTranslate",
  "createAgentChatDecafStore",
  "defaultAgentChatTranslate",
  "diffAgentChatArtifactText",
  "emptyAgentChatFoldState",
  "errorTextOf",
  "flattenAgentChatStructuredObject",
  "hasAgentChatArtifactChanges",
  "isAgentChatSdkTransport",
  "projectParts",
  "projectToolPart",
  "requestFromMessages",
  "safeMediaUrl",
  "summarizeAgentChatStructuredValue",
  "tokenizeAgentChatCode",
  "useAgentChat",
  "useAgentChatContext",
  "useAgentChatDecafStore",
  "useAgentTranslate",
];

const LOADED_MODULE = /[\\/]node_modules[\\/](?:@ai-sdk[\\/]react|ai|zustand)[\\/]/;
const LOADED_SPECIFIER = /^(@ai-sdk\/react|ai|zustand)(\/|$)/;

function probe(script: string, flags: string[] = []): Record<string, unknown> {
  const stdout = execFileSync(process.execPath, [...flags, "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env },
  });
  return JSON.parse(stdout.trim()) as Record<string, unknown>;
}

const CJS_PROBE = (specifier: string) => `
const mod = require('${specifier}');
const cache = Object.keys(require.cache).filter((key) => ${LOADED_MODULE.toString()}.test(key));
const keys = Object.keys(mod).sort();
const badAliases = keys.filter((key) => key.endsWith('Component')).filter((key) => {
  const base = key.slice(0, -'Component'.length);
  return mod[base] == null || mod[key] !== mod[base];
});
process.stdout.write(JSON.stringify({ keys, count: keys.length, cache, badAliases }));
`;

const ESM_PROBE = (specifier: string) => `
import { registerHooks } from 'node:module';
const seen = [];
registerHooks({ resolve(specifier, context, nextResolve) { seen.push(specifier); return nextResolve(specifier, context); } });
const mod = await import('${specifier}');
const keys = Object.keys(mod).sort();
const loaded = seen.filter((specifier) => ${LOADED_SPECIFIER.toString()}.test(specifier));
process.stdout.write(JSON.stringify({ keys, count: keys.length, loaded }));
`;

interface PackFile {
  path: string;
}

function packDryRun(): { files: string[]; total: number } {
  const stdout = execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env } }
  );
  const parsed = JSON.parse(stdout) as [{ files: PackFile[] }];
  const files = parsed[0].files.map((file) => file.path);
  return { files, total: files.length };
}

(HAS_LIB ? describe : describe.skip)("agent packaging and subpath isolation", () => {
  jest.setTimeout(120_000);

  if (SKIP_REASON) it.skip(SKIP_REASON, () => undefined);

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  ) as {
    exports?: Record<string, unknown>;
  };

  it("maps ./agent and its stylesheet in package.json", () => {
    const agent = packageJson.exports?.["./agent"] as {
      import?: { default?: string };
      require?: { default?: string };
    };
    expect(agent?.import?.default).toBe("./lib/esm/agent/index.js");
    expect(agent?.require?.default).toBe("./lib/cjs/agent/index.cjs");
    expect(packageJson.exports?.["./agent/styles.css"]).toBe(
      "./lib/agent/styles.css"
    );
  });

  it("round-trips a CJS require and an ESM import of the self-referenced subpath", () => {
    const cjs = probe(CJS_PROBE("@decaf-ts/for-react/agent"));
    const esm = probe(ESM_PROBE("@decaf-ts/for-react/agent"), [
      "--input-type=module",
    ]);

    expect(cjs.count).toBe(EXPECTED_AGENT_EXPORT_COUNT);
    expect(esm.count).toBe(EXPECTED_AGENT_EXPORT_COUNT);
    expect(esm.keys).toEqual(cjs.keys);
  });

  it("resolves every named export and its Component alias", () => {
    const cjs = probe(CJS_PROBE("@decaf-ts/for-react/agent"));
    const keys = cjs.keys as string[];

    expect(cjs.badAliases).toEqual([]);
    for (const symbol of EXPECTED_AGENT_SYMBOLS) {
      expect(keys).toContain(symbol);
    }
    for (const component of COMPONENT_NAMES) {
      expect(keys).toContain(`${component}Component`);
    }
  });

  it("does not evaluate @ai-sdk/react, ai or zustand from the CJS root", () => {
    const root = probe(CJS_PROBE("@decaf-ts/for-react"));
    expect(root.cache).toEqual([]);
    expect(root.count as number).toBeGreaterThan(100);
  });

  it("does not evaluate @ai-sdk/react, ai or zustand from the ESM root", () => {
    const root = probe(ESM_PROBE("@decaf-ts/for-react"), [
      "--input-type=module",
    ]);
    expect(root.loaded).toEqual([]);
    expect(root.count as number).toBeGreaterThan(100);
  });

  it("loads the chat runtime through the agent subpath", () => {
    const cjs = probe(CJS_PROBE("@decaf-ts/for-react/agent"));
    const cache = cjs.cache as string[];
    expect(
      cache.some((key) => /node_modules[\\/]@ai-sdk[\\/]react[\\/]/.test(key))
    ).toBe(true);
    expect(
      cache.some((key) => /node_modules[\\/]zustand[\\/]/.test(key))
    ).toBe(true);

    const esm = probe(ESM_PROBE("@decaf-ts/for-react/agent"), [
      "--input-type=module",
    ]);
    const loaded = esm.loaded as string[];
    expect(loaded).toContain("@ai-sdk/react");
    expect(loaded.some((specifier) => specifier.startsWith("zustand"))).toBe(
      true
    );
  });

  it("ships the agent ESM/CJS/types trees and bundled stylesheet", () => {
    expect(fs.existsSync(AGENT_STYLES)).toBe(true);
    const { files } = packDryRun();

    for (const prefix of [
      "lib/esm/agent/",
      "lib/cjs/agent/",
      "lib/types/agent/",
    ]) {
      expect(files.some((file) => file.startsWith(prefix))).toBe(true);
    }
    expect(files).toContain("lib/agent/styles.css");
    expect(files).toContain("lib/types/agent/index.d.mts");
    expect(files).toContain("lib/types/agent/index.d.cts");
  });
});
