/**
 * @file React helpers used to render trusted library-generated HTML.
 * @description React helpers used to render trusted library-generated HTML.
 * @summary Exposes {@link safeHtml} and {@link DecafSafeHtml} for icon and
 * content markup bindings.
 *
 * **WARNING — trusted markup only.** These helpers *bypass* React's default
 * escaping entirely (`dangerouslySetInnerHTML`): whatever enters them renders
 * as-is, including `<script>` and `onerror` payloads. Bind only
 * developer-controlled markup (icon SVG constants from this library, literals
 * in this repo's own templates, or trusted translated markup). Never pipe
 * caller-supplied, user, or remote unescaped data through `safeHtml` — those
 * bindings must render the value as a React text node so automatic escaping
 * runs. Trusted markup is restricted to translated and developer-controlled
 * markup only.
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
