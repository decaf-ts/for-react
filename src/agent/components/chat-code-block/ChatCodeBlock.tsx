/**
 * @file
 * @summary Syntax-highlighted code block with copy and header affordances.
 * @description Renders the `ChatCodeBlock` agent chat component and its props contract.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Token class produced by {@link tokenizeAgentChatCode}.
 * @memberOf module:for-react.agent
 */
export type AgentChatCodeTokenType =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "literal"
  | "punctuation";

/**
 * @description One highlighted code token.
 * @summary Pairs the raw token text with its {@link AgentChatCodeTokenType}.
 * @memberOf module:for-react.agent
 */
export interface AgentChatCodeToken {
  /** Raw token text. */
  text: string;
  /** Token class. */
  type: AgentChatCodeTokenType;
}

const COMMON_KEYWORDS = [
  "as", "async", "await", "break", "case", "catch", "class", "const",
  "constructor", "continue", "declare", "default", "delete", "do", "else",
  "enum", "export", "extends", "finally", "for", "from", "function", "get",
  "if", "implements", "import", "in", "instanceof", "interface", "let", "new",
  "of", "private", "protected", "public", "readonly", "return", "set",
  "static", "super", "switch", "this", "throw", "try", "type", "typeof",
  "var", "void", "while", "yield",
];

const PYTHON_KEYWORDS = [
  "and", "as", "assert", "async", "await", "break", "class", "continue",
  "def", "del", "elif", "else", "except", "finally", "for", "from", "global",
  "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass",
  "raise", "return", "try", "while", "with", "yield",
];

const SHELL_KEYWORDS = [
  "case", "cd", "do", "done", "echo", "elif", "else", "esac", "export",
  "fi", "for", "function", "if", "in", "local", "return", "then", "until",
  "while",
];

const LITERALS = new Set([
  "true", "false", "null", "undefined", "NaN", "Infinity", "None", "True",
  "False",
]);

function keywordsFor(language: string | null): Set<string> {
  const value = (language ?? "").toLowerCase();
  if (["py", "python"].includes(value)) return new Set(PYTHON_KEYWORDS);
  if (["sh", "bash", "shell", "zsh", "console"].includes(value)) {
    return new Set(SHELL_KEYWORDS);
  }
  return new Set(COMMON_KEYWORDS);
}

function hashCommentsFor(language: string | null): boolean {
  return ["py", "python", "sh", "bash", "shell", "zsh", "yaml", "yml", "ruby"].includes(
    (language ?? "").toLowerCase()
  );
}

const IDENTIFIER = /[A-Za-z_$]/;
const NUMBER = /[0-9]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$]/;
const PUNCTUATION = /[{}()[\].,;:<>+\-*/%=!&|^~?]/;

/**
 * @description Splits source text into highlighted tokens.
 * @summary Returns a single `plain` token when highlighting is disabled, and
 * recognizes line/hash comments, strings, numbers, keywords, literals and
 * punctuation when enabled.
 * @param {string} code - Source text to tokenize.
 * @param {string} language - Language hint used to pick keywords and comment style.
 * @param {boolean} highlight - Whether highlighting is enabled.
 * @returns {Array} Tokens in source order.
 * @memberOf module:for-react.agent
 */
export function tokenizeAgentChatCode(
  code: string,
  language: string | null,
  highlight: boolean
): AgentChatCodeToken[] {
  if (!code) return [];
  if (!highlight) return [{ text: code, type: "plain" }];
  const keywords = keywordsFor(language);
  const hashComments = hashCommentsFor(language);
  const tokens: AgentChatCodeToken[] = [];
  const push = (text: string, type: AgentChatCodeTokenType): void => {
    if (text) tokens.push({ text, type });
  };
  let index = 0;
  while (index < code.length) {
    const char = code[index];
    if (
      (char === "/" && code[index + 1] === "/") ||
      (hashComments && char === "#")
    ) {
      const end = code.indexOf("\n", index);
      const stop = end === -1 ? code.length : end;
      push(code.slice(index, stop), "comment");
      index = stop;
      continue;
    }
    if (char === "/" && code[index + 1] === "*") {
      const end = code.indexOf("*/", index + 2);
      const stop = end === -1 ? code.length : end + 2;
      push(code.slice(index, stop), "comment");
      index = stop;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      let cursor = index + 1;
      let escaped = false;
      while (cursor < code.length) {
        const current = code[cursor];
        if (escaped) {
          escaped = false;
          cursor += 1;
          continue;
        }
        if (current === "\\") {
          escaped = true;
          cursor += 1;
          continue;
        }
        if (current === char) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      push(code.slice(index, cursor), "string");
      index = cursor;
      continue;
    }
    if (NUMBER.test(char) || (char === "." && NUMBER.test(code[index + 1] ?? ""))) {
      let cursor = index + 1;
      while (cursor < code.length && /[0-9a-fA-FxX._]/.test(code[cursor])) {
        cursor += 1;
      }
      push(code.slice(index, cursor), "number");
      index = cursor;
      continue;
    }
    if (IDENTIFIER.test(char)) {
      let cursor = index + 1;
      while (cursor < code.length && IDENTIFIER_PART.test(code[cursor])) {
        cursor += 1;
      }
      const word = code.slice(index, cursor);
      push(
        word,
        keywords.has(word) ? "keyword" : LITERALS.has(word) ? "literal" : "plain"
      );
      index = cursor;
      continue;
    }
    if (PUNCTUATION.test(char)) {
      push(char, "punctuation");
      index += 1;
      continue;
    }
    let cursor = index + 1;
    while (cursor < code.length) {
      const current = code[cursor];
      if (
        IDENTIFIER.test(current) ||
        NUMBER.test(current) ||
        current === "'" ||
        current === '"' ||
        current === "`" ||
        current === "#" ||
        (current === "/" && (code[cursor + 1] === "/" || code[cursor + 1] === "*")) ||
        PUNCTUATION.test(current)
      ) {
        break;
      }
      cursor += 1;
    }
    push(code.slice(index, cursor), "plain");
    index = cursor;
  }
  return tokens;
}

/**
 * @description Props accepted by {@link ChatCodeBlock}.
 * @summary Declares every input the ChatCodeBlock component understands.
 * @memberOf module:for-react.agent
 * @property {string} [code] - Code text to render.
 * @property {string} [language] - Language identifier for highlighting.
 * @property {string} [filename] - Filename shown in the code header.
 * @property {string} [title] - Title text.
 * @property {boolean} [copyable] - Whether the code block shows a copy button.
 * @property {boolean} [highlight] - Whether syntax highlighting is applied.
 * @property {boolean} [showHeader] - Whether the code header is shown.
 * @property {function} [onCopy] - Called with the text to copy.
 */
export interface ChatCodeBlockProps {
  code?: string;
  language?: string | null;
  filename?: string | null;
  title?: string | null;
  copyable?: boolean;
  highlight?: boolean;
  showHeader?: boolean;
  onCopy?: (code: string) => void;
}

/**
 * @description Syntax-highlighted code block with copy and header affordances.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatCodeBlock({
  code = "",
  language = null,
  filename = null,
  title = null,
  copyable = true,
  highlight = true,
  showHeader = true,
  onCopy,
}: ChatCodeBlockProps) {
  const t = useAgentTranslate();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const tokens = useMemo(
    () => tokenizeAgentChatCode(code, language, highlight),
    [code, language, highlight]
  );

  const copyCode = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        setCopied(false);
      }
    }
    setCopied(true);
    onCopy?.(code);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <figure className="dcf-chat-code-block" data-language={language ?? undefined}>
      {showHeader ? (
        <figcaption className="dcf-chat-code-block__header">
          <span className="dcf-chat-code-block__title">
            {title ?? filename ?? language ?? t("agent.chat.codeBlock.label", "Code")}
          </span>
          {copyable ? (
            <button
              type="button"
              className="dcf-chat-code-block__copy"
              onClick={copyCode}
              aria-label={
                copied
                  ? t("agent.chat.codeBlock.copied", "Copied")
                  : t("agent.chat.codeBlock.copy", "Copy code")
              }
            >
              <ChatIcon name={copied ? "check" : "copy"} size={14} />
              <span>
                {copied
                  ? t("agent.chat.codeBlock.copied", "Copied")
                  : t("agent.chat.codeBlock.copy", "Copy")}
              </span>
            </button>
          ) : null}
        </figcaption>
      ) : null}
      <pre className="dcf-chat-code-block__pre" tabIndex={0}>
        <code className="dcf-chat-code-block__code">
          {tokens.map((token, index) => (
            <span
              className={`dcf-chat-code-block__token dcf-chat-code-block__token--${token.type}`}
              key={index}
            >
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

/**
 * @description Named alias of {@link ChatCodeBlock} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatCodeBlockComponent = ChatCodeBlock;
