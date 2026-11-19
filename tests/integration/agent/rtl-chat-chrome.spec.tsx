import "./ai-sdk-mock";
import "./xyflow-mock";
import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { ChatHeader } from "../../../src/agent/components/chat-header/ChatHeader.js";
import {
  ChatIcon,
  AGENT_CHAT_ICON_NAMES,
} from "../../../src/agent/components/chat-icon/ChatIcon.js";
import { ChatGreeting } from "../../../src/agent/components/chat-greeting/ChatGreeting.js";
import { ChatThinkingMessage } from "../../../src/agent/components/chat-thinking-message/ChatThinkingMessage.js";
import { ChatReasoning } from "../../../src/agent/components/chat-reasoning/ChatReasoning.js";
import { ChatSuggestedActions } from "../../../src/agent/components/chat-suggested-actions/ChatSuggestedActions.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * RTL coverage for the chat chrome family: header, icons, greeting, thinking,
 * reasoning and suggested actions.
 */

describe("ChatHeader", () => {
  it("renders the fallback title and both nav toggles", () => {
    const onHistoryToggle = jest.fn();
    const onKnowledgeBaseOpen = jest.fn();
    renderInAgentProvider(
      <ChatHeader
        selectedKnowledgeCount={2}
        onHistoryToggle={onHistoryToggle}
        onKnowledgeBaseOpen={onKnowledgeBaseOpen}
      />
    );

    expect(screen.getByRole("heading", { name: "Agent chat" })).toBeInTheDocument();

    const history = screen.getByRole("button", { name: "Chat history" });
    expect(history).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(history);
    expect(onHistoryToggle).toHaveBeenCalledTimes(1);

    const knowledge = screen.getByRole("button", { name: /Knowledge base/ });
    expect(within(knowledge).getByText("2")).toBeInTheDocument();
    expect(knowledge).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(knowledge);
    expect(onKnowledgeBaseOpen).toHaveBeenCalledTimes(1);
  });

  it("reflects open/pressed state and toggles telemetry labels", () => {
    const onTelemetryToggle = jest.fn();
    const { rerender } = renderInAgentProvider(
      <ChatHeader
        historyOpen
        knowledgeOpen
        telemetryOpen
        onTelemetryToggle={onTelemetryToggle}
      />
    );

    expect(screen.getByRole("button", { name: "Chat history" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(
      screen.getByRole("button", { name: /Knowledge base/ })
    ).toHaveAttribute("aria-expanded", "true");

    const telemetry = screen.getByRole("button", { name: "Telemetry" });
    expect(telemetry).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(telemetry);
    expect(onTelemetryToggle).toHaveBeenCalledTimes(1);

    rerender(<ChatHeader telemetryOpen={false} />);
    expect(
      screen.getByRole("button", { name: "Telemetry" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("renders namespace chips and hides optional actions", () => {
    renderInAgentProvider(
      <ChatHeader
        namespaces={["agent:run", "agent:write"]}
        showHistory={false}
        showKnowledgeBase={false}
      />
    );

    const note = screen.getByRole("note");
    expect(note).toHaveAccessibleName("Required namespaces");
    expect(within(note).getByText("agent:run")).toBeInTheDocument();
    expect(within(note).getByText("agent:write")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Chat history" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Knowledge base/ })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Telemetry" })).toBeInTheDocument();
  });

  it("uses a host translation resolver", () => {
    const translate = (key: string, fallback: string) =>
      key === "agent.chat.title" ? "Translated title" : fallback;
    renderInAgentProvider(<ChatHeader />, { translate });
    expect(
      screen.getByRole("heading", { name: "Translated title" })
    ).toBeInTheDocument();
  });
});

describe("ChatIcon", () => {
  it("renders a decorative svg by default", () => {
    const { container } = renderInAgentProvider(<ChatIcon name="user" size={32} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveClass("dcf-chat-icon");
  });

  it("exposes an accessible image when titled", () => {
    renderInAgentProvider(<ChatIcon name="bot" title="Bot avatar" />);
    const image = screen.getByRole("img", { name: "Bot avatar" });
    expect(image).toHaveAttribute("aria-label", "Bot avatar");
    expect(image.querySelector("title")).toHaveTextContent("Bot avatar");
  });

  it("spins the loader glyph and falls back for unknown names", () => {
    const { container, rerender } = renderInAgentProvider(
      <ChatIcon name="loader" />
    );
    expect(container.querySelector("svg")).toHaveClass("dcf-chat-icon--spin");

    rerender(<ChatIcon name="not-a-real-icon" />);
    expect(container.querySelector("svg")).not.toHaveClass(
      "dcf-chat-icon--spin"
    );
    expect(container.querySelector("svg")!.childElementCount).toBeGreaterThan(0);
  });

  it("declares every icon name with a glyph", () => {
    for (const name of AGENT_CHAT_ICON_NAMES) {
      const { container, unmount } = renderInAgentProvider(
        <ChatIcon name={name} title={name} />
      );
      expect(container.querySelector("svg")!.childElementCount).toBeGreaterThan(
        0
      );
      unmount();
    }
  });
});

describe("ChatGreeting", () => {
  it("renders the default title and message", () => {
    renderInAgentProvider(<ChatGreeting />);
    expect(
      screen.getByRole("heading", { name: "How can I help?" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ask a question, attach a file, or pick a suggestion/)
    ).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveClass(
      "dcf-chat-greeting--animated"
    );
  });

  it("renders custom copy, info icon, link and children", () => {
    const onLinkClick = jest.fn();
    renderInAgentProvider(
      <ChatGreeting
        variant="info"
        title="Welcome"
        message="Pick a task"
        icon="sparkles"
        linkHref="https://example.test/docs"
        linkLabel="Read docs"
        onLinkClick={onLinkClick}
        animated={false}
      >
        <p>Extra content</p>
      </ChatGreeting>
    );

    expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    expect(screen.getByText("Pick a task")).toBeInTheDocument();
    expect(screen.getByText("Extra content")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveClass("dcf-chat-greeting--info");

    const link = screen.getByRole("link", { name: /Read docs/ });
    expect(link).toHaveAttribute("href", "https://example.test/docs");
    fireEvent.click(link);
    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });

  it("uses the default link label", () => {
    renderInAgentProvider(<ChatGreeting linkHref="/docs" />);
    expect(screen.getByRole("link", { name: /Learn more/ })).toBeInTheDocument();
  });
});

describe("ChatThinkingMessage", () => {
  it("announces thinking with the default two lines", () => {
    const { container } = renderInAgentProvider(<ChatThinkingMessage />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAccessibleName("Agent is thinking");
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    expect(
      container.querySelectorAll(".dcf-chat-thinking-message__line")
    ).toHaveLength(2);
    expect(status).toHaveClass("dcf-chat-thinking-message--animated");
  });

  it("supports custom label, line count and hidden avatar", () => {
    const { container } = renderInAgentProvider(
      <ChatThinkingMessage
        label="Working"
        lines={3}
        animated={false}
        showAvatar={false}
      />
    );
    expect(screen.getByRole("status")).toHaveAccessibleName("Working");
    expect(
      container.querySelectorAll(".dcf-chat-thinking-message__line")
    ).toHaveLength(3);
    expect(
      container.querySelector(".dcf-chat-thinking-message__avatar")
    ).toBeNull();
    expect(screen.getByRole("status")).not.toHaveClass(
      "dcf-chat-thinking-message--animated"
    );
  });

  it("clamps non-positive line counts to one line", () => {
    const { container } = renderInAgentProvider(
      <ChatThinkingMessage lines={0} />
    );
    expect(
      container.querySelectorAll(".dcf-chat-thinking-message__line")
    ).toHaveLength(1);
  });
});

describe("ChatReasoning", () => {
  it("starts collapsed and toggles open with content", () => {
    const onToggle = jest.fn();
    renderInAgentProvider(
      <ChatReasoning content="Because the user asked" onToggle={onToggle} />
    );

    const trigger = screen.getByRole("button", { name: /Reasoning/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", { name: "Reasoning" });
    expect(within(region).getByText("Because the user asked")).toBeInTheDocument();
    expect(onToggle).toHaveBeenCalledWith(true);

    fireEvent.click(trigger);
    expect(onToggle).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("reflects controlled open changes and streaming/meta labels", () => {
    const { rerender, container } = renderInAgentProvider(
      <ChatReasoning
        title="Plan"
        meta="2 steps"
        streaming
        open
        content="Details"
      />
    );

    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("2 steps")).toBeInTheDocument();
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    expect(container.querySelector(".dcf-chat-reasoning")).toHaveClass(
      "dcf-chat-reasoning--standalone"
    );
    expect(screen.getByRole("region", { name: "Plan" })).toBeInTheDocument();

    rerender(<ChatReasoning title="Plan" open={false} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("renders inline children", () => {
    const { container } = renderInAgentProvider(
      <ChatReasoning open inline>
        <span>Child node</span>
      </ChatReasoning>
    );
    expect(container.querySelector(".dcf-chat-reasoning")).toHaveClass(
      "dcf-chat-reasoning--inline"
    );
    expect(screen.getByText("Child node")).toBeInTheDocument();
  });
});

describe("ChatSuggestedActions", () => {
  it("renders suggestions on an empty conversation and reports selection", () => {
    const onSelect = jest.fn();
    renderInAgentProvider(
      <ChatSuggestedActions
        suggestions={["Show orders", "Track shipment"]}
        onSelect={onSelect}
      />
    );

    const section = screen.getByRole("region", { name: "Suggested prompts" });
    expect(within(section).getByText("Try asking")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show orders" }));
    expect(onSelect).toHaveBeenCalledWith("Show orders");
  });

  it("hides when the conversation is not empty, disabled, or empty list", () => {
    const { rerender } = renderInAgentProvider(
      <ChatSuggestedActions suggestions={["A"]} empty={false} />
    );
    expect(
      screen.queryByRole("region", { name: "Suggested prompts" })
    ).not.toBeInTheDocument();

    rerender(<ChatSuggestedActions suggestions={["A"]} disabled />);
    expect(
      screen.queryByRole("region", { name: "Suggested prompts" })
    ).not.toBeInTheDocument();

    rerender(<ChatSuggestedActions suggestions={[]} />);
    expect(
      screen.queryByRole("region", { name: "Suggested prompts" })
    ).not.toBeInTheDocument();
  });

  it("uses a custom title", () => {
    renderInAgentProvider(
      <ChatSuggestedActions suggestions={["A"]} title="Start here" />
    );
    expect(screen.getByText("Start here")).toBeInTheDocument();
  });
});
