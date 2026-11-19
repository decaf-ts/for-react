/**
 * SAA-2140 F3 — ChatGreeting `linkHref` URL allowlist regression (for-react).
 *
 * The agent provider module graph pulls ESM-only packages, so this spec uses
 * the same mocks and provider helper as the other agent integration suites.
 * Parent SAA-2139 now resolves the link through `safeHref`; only `http:`,
 * `https:` and relative targets may produce an anchor.
 */
import "./ai-sdk-mock";
import "./xyflow-mock";
import React from "react";
import { screen } from "@testing-library/react";
import { ChatGreeting } from "../../../src/agent/components/chat-greeting/ChatGreeting.js";
import { renderInAgentProvider } from "./test-utils.js";

describe("[SAA-2140 F3] ChatGreeting linkHref allowlist", () => {
  it.each([
    "https://example.test/docs",
    "http://example.test/docs",
    "/docs",
    "docs/getting-started",
  ])("renders the allowed target %s unchanged", (linkHref) => {
    renderInAgentProvider(
      <ChatGreeting linkHref={linkHref} linkLabel="Read docs" />
    );

    expect(screen.getByRole("link", { name: /Read docs/ })).toHaveAttribute(
      "href",
      linkHref
    );
  });

  it.each([
    "javascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html,<script>alert(1)</script>",
  ])("does not render an anchor for the blocked target %s", (linkHref) => {
    renderInAgentProvider(
      <ChatGreeting linkHref={linkHref} linkLabel="Read docs" />
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(document.querySelector("a.dcf-chat-greeting__link")).toBeNull();
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(document.querySelector('a[href^="data:"]')).toBeNull();
  });
});
