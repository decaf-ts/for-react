/**
 * @file React helpers for trusted markup and untrusted HTML sanitization.
 * @description React helpers for rendering trusted library-generated HTML and
 * for sanitizing untrusted strings and URLs before they reach a
 * `dangerouslySetInnerHTML` sink or a navigation target.
 * @summary Exposes two helper families:
 *
 * - **Trusted markup** — {@link safeHtml} and {@link DecafSafeHtml} wrap
 *   developer-controlled markup so it can be bound through
 *   `dangerouslySetInnerHTML`.
 * - **Sanitizing** — {@link sanitizeHtmlContent}, {@link safeHref} and
 *   {@link safeImageSrc} validate untrusted content on an allowlist basis:
 *   `sanitizeHtmlContent` strips active markup from a string, while `safeHref`
 *   and `safeImageSrc` reject unsafe URL schemes.
 *
 * **WARNING — trusted markup only.** {@link safeHtml} and {@link DecafSafeHtml}
 * *bypass* React's default escaping entirely (`dangerouslySetInnerHTML`):
 * whatever enters them renders as-is, including `<script>` and `onerror`
 * payloads. Bind only developer-controlled markup (icon SVG constants from this
 * library, literals in this repo's own templates, or trusted translated
 * markup). Never pipe caller-supplied, user, or remote unescaped data through
 * `safeHtml` — those bindings must instead pass through
 * {@link sanitizeHtmlContent} or render the value as a React text node so
 * automatic escaping runs.
 */
import React from "react";

/**
 * @description Shape expected by React's `dangerouslySetInnerHTML` prop.
 * @summary Wraps pre-rendered markup so it can be passed directly to the
 * `__html` member of `dangerouslySetInnerHTML`.
 * @memberOf module:for-react
 */
export interface SafeHtmlValue {
  __html: string;
}

/**
 * @description Wraps an HTML string for use with `dangerouslySetInnerHTML`.
 * @summary Returns the `{ __html }` object React requires, without escaping the
 * input.
 * **WARNING — trusted markup only.** The value bypasses React's escaping: bind
 * only developer-controlled icon/SVG constants or trusted translated markup,
 * never unescaped caller/user/remote data.
 * @param {string} value - Raw HTML markup to inject.
 * @returns {SafeHtmlValue} An object suitable for `dangerouslySetInnerHTML`.
 * @memberOf module:for-react
 */
export function safeHtml(value: string): SafeHtmlValue {
  return { __html: value };
}

/**
 * @description Props accepted by the {@link DecafSafeHtml} component.
 * @summary Lets callers choose the rendered wrapper element, the HTML payload
 * and an optional class name.
 * @memberOf module:for-react
 */
export interface DecafSafeHtmlProps {
  value?: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}

/**
 * @description Renders trusted HTML inside a configurable wrapper element.
 * @summary Injects `value` through `dangerouslySetInnerHTML` on the tag named
 * by `as` (defaulting to a `span`) and forwards `className`.
 * **WARNING — trusted markup only.** The value bypasses React's escaping: bind
 * only developer-controlled icon/SVG constants or trusted translated markup,
 * never unescaped caller/user/remote data.
 * @param {DecafSafeHtmlProps} props - The wrapper tag, HTML payload and class name.
 * @returns {React.ReactElement} The wrapper element containing the HTML.
 * @memberOf module:for-react
 */
export const DecafSafeHtml: React.FC<DecafSafeHtmlProps> = ({
  value = "",
  as = "span",
  className,
}) => {
  const Tag = as as React.ElementType;
  return <Tag className={className} dangerouslySetInnerHTML={safeHtml(value)} />;
};

const URL_SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const ALLOWED_URL_SCHEMES = new Set(["http:", "https:"]);
const DATA_IMAGE_PREFIX = /^data:image\//i;
const BLOCKED_ELEMENTS = new Set([
  "animate",
  "animatemotion",
  "animatetransform",
  "applet",
  "base",
  "button",
  "discard",
  "embed",
  "form",
  "frame",
  "frameset",
  "iframe",
  "input",
  "link",
  "meta",
  "noscript",
  "object",
  "option",
  "script",
  "select",
  "set",
  "style",
  "template",
  "textarea",
]);
const IMAGE_URL_ATTRIBUTES = new Set(["background", "poster", "src"]);
const URL_ATTRIBUTES = new Set([
  "action",
  "background",
  "cite",
  "formaction",
  "href",
  "poster",
  "src",
  "xlink:href",
]);
const DANGEROUS_STYLE = /(?:expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding|@import)/i;
const DANGEROUS_SRCSET = /(?:javascript\s*:|vbscript\s*:|data:)/i;

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function normalizeSafeUrl(
  value: string | null | undefined,
  allowImageData: boolean
): string | null {
  const url = value?.trim();
  if (!url || hasControlCharacters(url)) return null;
  const scheme = URL_SCHEME.exec(url)?.[1]?.toLowerCase();
  if (!scheme) return url;
  const normalized = `${scheme}:`;
  if (ALLOWED_URL_SCHEMES.has(normalized)) return url;
  if (allowImageData && normalized === "data:" && DATA_IMAGE_PREFIX.test(url)) {
    return url;
  }
  return null;
}

/**
 * @description Validates a URL intended for navigation (`href`, `action`, `cite`
 * and similar) against a scheme allowlist.
 * @summary Trims `value` and accepts it only when it uses an `http`/`https`
 * scheme or carries no scheme at all (same-origin absolute-path, relative and
 * fragment references). Values containing control characters, or any other
 * scheme such as `javascript:`, `vbscript:` or `data:` (including
 * `data:image/*`), are rejected with `null`. An accepted value is returned
 * trimmed and otherwise unchanged.
 * @param {string | null | undefined} value - Candidate URL to validate.
 * @returns {string | null} The trimmed, safe URL, or `null` when rejected.
 * @memberOf module:for-react
 */
export function safeHref(value: string | null | undefined): string | null {
  return normalizeSafeUrl(value, false);
}

/**
 * @description Validates a URL intended for an image source (`src`, `poster`,
 * `background`).
 * @summary Behaves like {@link safeHref} — trimming and allowing `http`/`https`
 * and scheme-less same-origin/relative references while rejecting control
 * characters and dangerous schemes — but additionally accepts `data:image/*`
 * URLs so inline images keep working. Any other `data:` URL is rejected with
 * `null`. An accepted value is returned trimmed and otherwise unchanged.
 * @param {string | null | undefined} value - Candidate image URL to validate.
 * @returns {string | null} The trimmed, safe image URL, or `null` when rejected.
 * @memberOf module:for-react
 */
export function safeImageSrc(value: string | null | undefined): string | null {
  return normalizeSafeUrl(value, true);
}

function sanitizeStyleValue(value: string): string | null {
  return hasControlCharacters(value) || DANGEROUS_STYLE.test(value)
    ? null
    : value;
}

function sanitizeUrlAttribute(
  name: string,
  value: string
): string | null {
  return IMAGE_URL_ATTRIBUTES.has(name) ? safeImageSrc(value) : safeHref(value);
}

function sanitizeElement(element: Element): void {
  const tag = element.tagName.toLowerCase();
  if (tag.includes(":") || BLOCKED_ELEMENTS.has(tag)) {
    element.remove();
    return;
  }

  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    if (name.startsWith("on")) {
      element.removeAttribute(attribute.name);
      continue;
    }
    if (name === "srcdoc" || name === "formaction") {
      element.removeAttribute(attribute.name);
      continue;
    }
    if (name === "style") {
      const sanitized = sanitizeStyleValue(attribute.value);
      if (sanitized === null) {
        element.removeAttribute(attribute.name);
      } else if (sanitized !== attribute.value) {
        element.setAttribute(attribute.name, sanitized);
      }
      continue;
    }
    if (name === "srcset" || name === "imagesrcset") {
      if (
        hasControlCharacters(attribute.value) ||
        DANGEROUS_SRCSET.test(attribute.value)
      ) {
        element.removeAttribute(attribute.name);
      }
      continue;
    }
    if (URL_ATTRIBUTES.has(name)) {
      const sanitized = sanitizeUrlAttribute(name, attribute.value);
      if (sanitized === null) {
        element.removeAttribute(attribute.name);
      } else if (sanitized !== attribute.value) {
        element.setAttribute(attribute.name, sanitized);
      }
    }
  }

  for (const child of Array.from(element.children)) {
    sanitizeElement(child);
  }
}

function sanitizeHtmlFallback(value: string): string {
  return value
    .replace(
      /<\s*(script|style|iframe|frame|frameset|object|embed|applet|template|noscript|base|link|meta|form|input|button|textarea|select|option|animate|animatemotion|animatetransform|set|discard)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      ""
    )
    .replace(
      /<\s*(script|style|iframe|frame|frameset|object|embed|applet|template|noscript|base|link|meta|form|input|button|textarea|select|option|animate|animatemotion|animatetransform|set|discard)\b[^>]*\/?\s*>/gi,
      ""
    )
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+)/gi, "")
    .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+)/gi, "")
    .replace(
      /\s+(?:href|src|action|formaction|poster|background|cite|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+)/gi,
      ""
    );
}

/**
 * @description Allowlist sanitizer for untrusted HTML bound to a
 * `dangerouslySetInnerHTML` sink.
 * @summary Parses `value` with the DOM when a `document` exists and walks the
 * resulting fragment, removing everything that can execute or escape the
 * allowlist:
 *
 * - drops `script`, `style`, `iframe`, `object`, `embed`, `form`, `input`,
 *   `button`, `textarea`, `select`, `base`, `link`, `meta`, `template`,
 *   `noscript`, the SMIL animation elements `animate`, `set`, `animateMotion`,
 *   `animateTransform` and `discard`, and related active elements, plus
 *   namespaced tags;
 * - removes every `on*` event-handler attribute and the `srcdoc`/`formaction`
 *   attributes;
 * - validates URL-bearing attributes (`href`, `src`, `action`, `poster`,
 *   `background`, `cite`, `xlink:href`) with {@link safeHref}, or
 *   {@link safeImageSrc} for image attributes, removing any that are rejected;
 * - removes `style` values containing control characters or
 *   `expression`/`@import`/`javascript:`/`vbscript:`/`behavior`/`-moz-binding`
 *   patterns, and `srcset` entries with control characters or
 *   `javascript:`/`vbscript:`/`data:` payloads.
 *
 * Benign markup (formatting tags, text, safe links and images) is preserved.
 * When no DOM is available it falls back to a conservative regular-expression
 * pass that strips the same element and attribute families. Returns `""` for
 * empty, `null` or `undefined` input.
 * @param {string | null | undefined} value - Untrusted HTML to sanitize.
 * @returns {string} The sanitized HTML, safe to pass to `dangerouslySetInnerHTML`.
 * @memberOf module:for-react
 */
export function sanitizeHtmlContent(value: string | null | undefined): string {
  if (!value) return "";
  if (typeof document === "undefined") return sanitizeHtmlFallback(value);
  const template = document.createElement("template");
  template.innerHTML = value;
  for (const child of Array.from(template.content.children)) {
    sanitizeElement(child);
  }
  return template.innerHTML;
}
