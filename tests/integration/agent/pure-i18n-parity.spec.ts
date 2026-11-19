import fs from "node:fs";
import path from "node:path";

/**
 * SAA-2110 — agent i18n dictionary parity.
 *
 * Two guarantees over the delivered port:
 *
 * 1. `public/i18n/en.json` and `public/i18n/pt.json` expose the exact same
 *    `agent` key set, so no key can exist in one locale only.
 * 2. Every `agent.chat.*` key referenced by `src/agent/**` (and the demo page)
 *    resolves in `en.json`. Static keys are read from string literals;
 *    template keys are expanded against the enum/constant families that feed
 *    them, mirroring the CTO review's scripted check. A template family that
 *    has no declared expansion fails the suite instead of being skipped.
 */

const ROOT = path.resolve(__dirname, "../../..");
const EN_PATH = path.join(ROOT, "public/i18n/en.json");
const PT_PATH = path.join(ROOT, "public/i18n/pt.json");
const SOURCE_ROOT = path.join(ROOT, "src/agent");
const DEMO_PAGE = path.join(ROOT, "demo/pages/AgentPage.tsx");

type Json = Record<string, unknown>;

function readJson(file: string): Json {
  return JSON.parse(fs.readFileSync(file, "utf8")) as Json;
}

function flatten(node: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries((node ?? {}) as Json)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value as string;
    }
  }
  return out;
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

/**
 * Enum values backing each dynamic `agent.chat.<family>.${value}` key.
 * Keep in sync with `src/agent/types.ts` and `ChatToolTracker`'s
 * `TRACKER_STEPS`.
 */
const TEMPLATE_FAMILIES: Record<string, readonly string[]> = {
  "agent.chat.approval.status.": ["pending", "approved", "rejected"],
  "agent.chat.artifact.document.status.": [
    "pending",
    "loading",
    "succeeded",
    "failed",
  ],
  "agent.chat.artifact.editor.kind.": ["text", "code", "image", "sheet"],
  "agent.chat.artifact.kind.": ["text", "code", "image", "sheet"],
  "agent.chat.artifact.toolbar.": ["text", "code", "image", "sheet"],
  "agent.chat.artifact.visibility.": ["private", "shared", "public"],
  "agent.chat.history.item.visibility.": ["private", "shared", "public"],
  "agent.chat.knowledgeBase.status.": [
    "queued",
    "uploading",
    "done",
    "error",
  ],
  "agent.chat.role.": ["user", "assistant", "system", "error"],
  "agent.chat.status.": [
    "queued",
    "running",
    "succeeded",
    "failed",
    "cancelled",
    "replayed",
  ],
  "agent.chat.tool.state.": [
    "input-streaming",
    "input-available",
    "output-available",
    "output-error",
    "output-denied",
  ],
  "agent.chat.tool.status.": ["queued", "running", "succeeded", "failed"],
  "agent.chat.tool.tracker.description.": [
    "ordered",
    "shipped",
    "delivered",
    "cancelled",
  ],
  "agent.chat.tool.tracker.status.": [
    "ordered",
    "shipped",
    "delivered",
    "cancelled",
  ],
  "agent.chat.tool.tracker.step.": ["box", "gps", "home"],
  "agent.chat.tool.weather.condition.": ["day", "night"],
  "agent.chat.visibility.": ["private", "shared"],
  "agent.chat.workflow.status.": [
    "running",
    "success",
    "failed",
    "suspended",
    "waiting",
  ],
};

const LITERAL_KEY = /["'](agent\.chat\.[A-Za-z0-9_.]*)["']/g;
const TEMPLATE_KEY = /`(agent\.chat\.[^`]*)`/g;

function referencedAgentChatKeys(): {
  keys: Set<string>;
  unexpanded: string[];
} {
  const files = [...walk(SOURCE_ROOT), DEMO_PAGE];
  const staticKeys = new Set<string>();
  const templates = new Set<string>();

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(TEMPLATE_KEY)) {
      const body = match[1];
      if (body.includes("${")) templates.add(body);
      else staticKeys.add(body);
    }
    for (const match of source.matchAll(LITERAL_KEY)) {
      staticKeys.add(match[1]);
    }
  }

  const keys = new Set<string>();
  for (const key of staticKeys) {
    if (!key.includes("*")) keys.add(key);
  }

  const unexpanded: string[] = [];
  for (const template of templates) {
    const dynamicAt = template.indexOf("${");
    const prefix = template.slice(0, dynamicAt);
    const values = TEMPLATE_FAMILIES[prefix];
    if (!values) {
      unexpanded.push(template);
      continue;
    }
    for (const value of values) keys.add(`${prefix}${value}`);
  }

  return { keys, unexpanded };
}

describe("agent i18n parity", () => {
  const en = flatten(readJson(EN_PATH).agent);
  const pt = flatten(readJson(PT_PATH).agent);
  const enKeys = new Set(Object.keys(en).map((key) => `agent.${key}`));
  const ptKeys = new Set(Object.keys(pt).map((key) => `agent.${key}`));

  it("keeps identical agent key sets in en.json and pt.json", () => {
    const enOnly = [...enKeys].filter((key) => !ptKeys.has(key)).sort();
    const ptOnly = [...ptKeys].filter((key) => !enKeys.has(key)).sort();
    expect({ enOnly, ptOnly }).toEqual({ enOnly: [], ptOnly: [] });
  });

  it("resolves every referenced agent.chat.* key in en.json", () => {
    const { keys, unexpanded } = referencedAgentChatKeys();
    expect(unexpanded).toEqual([]);
    expect(keys.size).toBeGreaterThan(0);
    const missing = [...keys].filter((key) => !enKeys.has(key)).sort();
    expect(missing).toEqual([]);
  });
});
