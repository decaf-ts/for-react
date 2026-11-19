import "./xyflow-mock";
import { agentChatTranscriptMarkdown } from "../../../src/agent/services/agentTranscriptMarkdown.js";
import {
  safeMediaUrl,
} from "../../../src/agent/utils/agentMediaUrl.js";
import {
  agentChatTranslate,
  defaultAgentChatTranslate,
} from "../../../src/agent/i18n/agentTranslate.js";
import { tokenizeAgentChatCode } from "../../../src/agent/components/chat-code-block/ChatCodeBlock.js";
import { I18nLoader } from "../../../src/lib/i18n/Loader.js";
import { message } from "./pure-helpers.js";

/**
 * Pure text utilities: transcript Markdown, the media-URL allowlist, the i18n
 * fallback resolver and the code tokenizer.
 */

describe("agentChatTranscriptMarkdown", () => {
  it("renders role headings, timestamps, content and a trailing newline", () => {
    const markdown = agentChatTranscriptMarkdown([
      message({
        id: "u1",
        role: "user",
        content: "Hello",
        createdAt: "2026-11-19T10:00:00.000Z",
      }),
      message({
        id: "a1",
        role: "assistant",
        content: "Hi there",
        createdAt: "2026-11-19T10:00:01.000Z",
      }),
    ]);

    expect(markdown).toBe(
      [
        "## User",
        "_2026-11-19T10:00:00.000Z_",
        "",
        "Hello",
        "",
        "## Assistant",
        "_2026-11-19T10:00:01.000Z_",
        "",
        "Hi there",
        "",
      ].join("\n")
    );
    expect(markdown.endsWith("\n")).toBe(true);
  });

  it("adds an optional document title", () => {
    const markdown = agentChatTranscriptMarkdown(
      [message({ content: "Body" })],
      { title: "Conversation" }
    );
    expect(markdown.startsWith("# Conversation\n\n## Assistant")).toBe(true);
  });

  it("renders attachments and every structured part kind", () => {
    const markdown = agentChatTranscriptMarkdown([
      message({
        id: "rich",
        content: "Summary",
        attachments: [
          { id: "a", name: "photo.png", mime: "image/png", size: 10 },
        ],
        parts: [
          { id: "t", kind: "text", text: "Inline text" },
          {
            id: "att",
            kind: "attachment",
            attachment: { id: "att", name: "notes.txt", mime: "text/plain", size: 4 },
          },
          {
            id: "tool",
            kind: "tool",
            name: "orders",
            status: "succeeded",
            input: { query: "lisbon" },
            output: { count: 3 },
          },
          {
            id: "tool-err",
            kind: "tool",
            name: "weather",
            status: "failed",
            error: "Service unavailable",
          },
          { id: "r", kind: "reasoning", content: "Because" },
          { id: "c", kind: "code", code: "const a = 1;", language: "ts" },
        ],
      }),
    ]);

    expect(markdown).toContain("- photo.png (image/png, 10 B)");
    expect(markdown).toContain("- notes.txt (text/plain, 4 B)");
    expect(markdown).toContain("**tool orders (succeeded)**");
    expect(markdown).toContain("```json\n{\n  \"query\": \"lisbon\"\n}\n```");
    expect(markdown).toContain("**tool weather (failed)**");
    expect(markdown).toContain("> Service unavailable");
    expect(markdown).toContain("**reasoning**\n\nBecause");
    expect(markdown).toContain("```ts\nconst a = 1;\n```");
  });

  it("renders an empty transcript as a single newline", () => {
    expect(agentChatTranscriptMarkdown([])).toBe("\n");
  });
});

describe("safeMediaUrl", () => {
  it.each([
    ["https://example.test/a.png", "https://example.test/a.png"],
    ["http://example.test/a.png", "http://example.test/a.png"],
    ["blob:https://example.test/uuid", "blob:https://example.test/uuid"],
    ["  https://example.test/a.png  ", "https://example.test/a.png"],
    ["HTTPS://EXAMPLE.TEST/A.PNG", "HTTPS://EXAMPLE.TEST/A.PNG"],
    ["data:image/png;base64,AAAA", "data:image/png;base64,AAAA"],
    ["data:image/svg+xml;utf8,<svg/>", "data:image/svg+xml;utf8,<svg/>"],
  ])("accepts %s", (input, expected) => {
    expect(safeMediaUrl(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["   "],
    ["javascript:alert(1)"],
    ["JaVaScRiPt:alert(1)"],
    ["data:text/html;base64,AAAA"],
    ["file:///etc/passwd"],
    ["/relative/path.png"],
    ["photo.png"],
    ["java\tscript:alert(1)"],
    ["https://example.test/a\u0000.png"],
  ])("rejects %p", (input) => {
    expect(safeMediaUrl(input as string | null | undefined)).toBeNull();
  });
});

describe("agentChatTranslate", () => {
  const key = "agent.chat.translate.spec.key";

  afterEach(() => {
    delete (I18nLoader.cache["en"] as Record<string, unknown>)[key];
  });

  it("resolves a key through the shared cache", () => {
    (I18nLoader.cache["en"] as Record<string, unknown>)[key] = "Translated";
    expect(defaultAgentChatTranslate(key, "Fallback")).toBe("Translated");
  });

  it("falls back when the key is missing, empty or resolves to the key", () => {
    expect(defaultAgentChatTranslate(key, "Fallback")).toBe("Fallback");
    expect(defaultAgentChatTranslate("", "Fallback")).toBe("Fallback");
  });

  it("prefers a host-supplied resolver", () => {
    const translate = jest.fn(() => "Host translation");
    expect(agentChatTranslate(translate, "any.key", "Fallback")).toBe(
      "Host translation"
    );
    expect(translate).toHaveBeenCalledWith("any.key", "Fallback");
  });

  it("uses the default resolver when no host resolver is supplied", () => {
    (I18nLoader.cache["en"] as Record<string, unknown>)[key] = "Default";
    expect(agentChatTranslate(undefined, key, "Fallback")).toBe("Default");
  });
});

describe("tokenizeAgentChatCode", () => {
  it("returns no tokens for empty code and one plain token when highlighting is off", () => {
    expect(tokenizeAgentChatCode("", "ts", true)).toEqual([]);
    expect(tokenizeAgentChatCode("const a = 1;", "ts", false)).toEqual([
      { text: "const a = 1;", type: "plain" },
    ]);
  });

  it("classifies keywords, literals, numbers, punctuation and line comments", () => {
    const tokens = tokenizeAgentChatCode(
      "const twice = 42; // answer\nexport const flag = true;",
      "typescript",
      true
    );
    const values = tokens.map((token) => token.text);

    expect(tokens).toContainEqual({ text: "const", type: "keyword" });
    expect(tokens).toContainEqual({ text: "export", type: "keyword" });
    expect(tokens).toContainEqual({ text: "42", type: "number" });
    expect(tokens).toContainEqual({ text: "true", type: "literal" });
    expect(tokens).toContainEqual({ text: "=", type: "punctuation" });
    expect(tokens).toContainEqual({ text: "// answer", type: "comment" });
    expect(values.join("")).toBe(
      "const twice = 42; // answer\nexport const flag = true;"
    );
  });

  it("uses hash comments for Python and shell languages", () => {
    for (const language of ["python", "py", "bash", "zsh"]) {
      const tokens = tokenizeAgentChatCode("echo hi # note", language, true);
      expect(tokens).toContainEqual({ text: "# note", type: "comment" });
    }
    const typescript = tokenizeAgentChatCode("const a = 1; # not a comment", "ts", true);
    expect(typescript.some((token) => token.type === "comment")).toBe(false);
  });

  it("treats quoted and template text as a single string token, honoring escapes", () => {
    const tokens = tokenizeAgentChatCode(
      "const a = \"x\\\"y\"; const b = `hello ${name}`;",
      "ts",
      true
    );
    const strings = tokens.filter((token) => token.type === "string");
    expect(strings.map((token) => token.text)).toEqual([
      "\"x\\\"y\"",
      "`hello ${name}`",
    ]);
  });

  it("classifies block comments and Python keywords", () => {
    const block = tokenizeAgentChatCode("/* a\nb */ return 1", "ts", true);
    expect(block).toContainEqual({ text: "/* a\nb */", type: "comment" });

    const python = tokenizeAgentChatCode("def f(): return None", "python", true);
    expect(python).toContainEqual({ text: "def", type: "keyword" });
    expect(python).toContainEqual({ text: "None", type: "literal" });
  });

  it("preserves the full source text across every token", () => {
    const source = [
      "export function describeForecast(location: string, high: number) {",
      "  return `${location}: ${high}°C, clear skies`;",
      "}",
    ].join("\n");
    const tokens = tokenizeAgentChatCode(source, "typescript", true);
    expect(tokens.map((token) => token.text).join("")).toBe(source);
  });
});
