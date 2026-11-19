import "./xyflow-mock";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { ChatArtifact } from "../../../src/agent/components/chat-artifact/ChatArtifact.js";
import { ChatArtifactToolbar } from "../../../src/agent/components/chat-artifact-toolbar/ChatArtifactToolbar.js";
import { ChatArtifactSkeleton } from "../../../src/agent/components/chat-artifact-skeleton/ChatArtifactSkeleton.js";
import { ChatArtifactVersionFooter } from "../../../src/agent/components/chat-artifact-version-footer/ChatArtifactVersionFooter.js";
import {
  ChatArtifactDiff,
  diffAgentChatArtifactText,
  hasAgentChatArtifactChanges,
} from "../../../src/agent/components/chat-artifact-diff/ChatArtifactDiff.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * SAA-2095 coverage requirement 9 (part 1) — artifact toolbar, skeleton,
 * artifact image allowlist, version footer, and diff algorithm.
 */

describe("ChatArtifactToolbar", () => {
  it("renders the four default tools and emits the selected kind", () => {
    const onToolSelected = jest.fn();
    renderInAgentProvider(
      <ChatArtifactToolbar onToolSelected={onToolSelected} />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.dataset.kind)).toEqual([
      "text",
      "code",
      "image",
      "sheet",
    ]);
    expect(buttons.every((button) => button.getAttribute("aria-pressed") === "false")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /code/i }));
    expect(onToolSelected).toHaveBeenCalledWith("code");
    expect(screen.getByRole("button", { name: /code/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("reflects the controlled selected kind", () => {
    renderInAgentProvider(<ChatArtifactToolbar selected="image" />);
    expect(screen.getByRole("button", { name: /image/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("disables every tool while disabled", () => {
    const onToolSelected = jest.fn();
    renderInAgentProvider(
      <ChatArtifactToolbar disabled onToolSelected={onToolSelected} />
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
    fireEvent.click(screen.getByRole("button", { name: /text/i }));
    expect(onToolSelected).not.toHaveBeenCalled();
  });
});

describe("ChatArtifactSkeleton", () => {
  it("renders a full skeleton with the requested number of lines", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactSkeleton lines={6} />
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(
      container.querySelectorAll(".dcf-chat-artifact-skeleton__bar--line")
    ).toHaveLength(6);
    expect(screen.getByText("Loading artifact panel…")).toBeInTheDocument();
  });

  it("renders the inline variant without line bars and honors a label", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactSkeleton variant="inline" label="Fetching…" />
    );

    expect(
      container.querySelector(".dcf-chat-artifact-skeleton--inline")
    ).not.toBeNull();
    expect(
      container.querySelectorAll(".dcf-chat-artifact-skeleton__bar--line")
    ).toHaveLength(0);
    expect(screen.getByText("Fetching…")).toBeInTheDocument();
  });

  it("clamps the line count to at least one", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactSkeleton lines={0} />
    );
    expect(
      container.querySelectorAll(".dcf-chat-artifact-skeleton__bar--line")
    ).toHaveLength(1);
  });
});

describe("ChatArtifact image allowlist", () => {
  it("renders allowlisted image URLs", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifact
        title="Preview"
        kind="image"
        content="https://cdn.example.test/art.png"
        imageAlt="Art preview"
      />
    );

    const image = container.querySelector(".dcf-chat-artifact__image") as HTMLImageElement;
    expect(image).not.toBeNull();
    expect(image.getAttribute("src")).toBe("https://cdn.example.test/art.png");
    expect(image.getAttribute("alt")).toBe("Art preview");
  });

  it("accepts data:image/* payloads", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifact kind="image" content="data:image/png;base64,AAAA" />
    );
    expect(container.querySelector(".dcf-chat-artifact__image")).not.toBeNull();
  });

  it("rejects non-image data and script schemes", () => {
    for (const url of ["javascript:alert(1)", "data:text/html;base64,AAAA"]) {
      const { container, unmount } = renderInAgentProvider(
        <ChatArtifact kind="image" content={url} />
      );
      expect(container.querySelector(".dcf-chat-artifact__image")).toBeNull();
      expect(
        container.querySelector(".dcf-chat-artifact__content")?.textContent
      ).toBe("Image preview unavailable.");
      unmount();
    }
  });

  it("renders text content, streaming footer, and close action", () => {
    const onClose = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatArtifact title="Draft" content="hello world" streaming onClose={onClose} />
    );

    expect(container.querySelector("pre")?.textContent).toBe("hello world");
    expect(screen.getByText("Streaming content…")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Close artifact/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the kind and visibility labels", () => {
    renderInAgentProvider(
      <ChatArtifact title="Sheet" kind="sheet" visibility="public" />
    );
    expect(screen.getByText("sheet")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
  });
});

describe("ChatArtifactVersionFooter", () => {
  const versions = [
    { id: "v1", label: "Initial draft" },
    { id: "v2", label: "Second draft" },
    { id: "v3", label: "Final" },
  ];

  it("navigates older/newer within the version range", () => {
    const onVersionChange = jest.fn();
    const { rerender, container } = renderInAgentProvider(
      <ChatArtifactVersionFooter
        currentVersion={2}
        versions={versions}
        onVersionChange={onVersionChange}
      />
    );

    const count = container.querySelector(
      ".dcf-chat-artifact-version-footer__count"
    );
    expect(count?.textContent).toBe("Version 2 of 3");
    expect(screen.getByText("Second draft")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Older version/ }));
    expect(onVersionChange).toHaveBeenLastCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: /Newer version/ }));
    expect(onVersionChange).toHaveBeenLastCalledWith(3);

    rerender(
      <ChatArtifactVersionFooter
        currentVersion={1}
        versions={versions}
        onVersionChange={onVersionChange}
      />
    );
    expect(screen.getByRole("button", { name: /Older version/ })).toBeDisabled();

    rerender(
      <ChatArtifactVersionFooter
        currentVersion={3}
        versions={versions}
        onVersionChange={onVersionChange}
      />
    );
    expect(screen.getByRole("button", { name: /Newer version/ })).toBeDisabled();
  });

  it("clamps out-of-range current versions", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactVersionFooter currentVersion={9} totalVersions={3} />
    );
    expect(
      container.querySelector(".dcf-chat-artifact-version-footer__count")
        ?.textContent
    ).toBe("Version 3 of 3");
  });
});

describe("ChatArtifactDiff", () => {
  it("aligns changed lines as one changed row", () => {
    const rows = diffAgentChatArtifactText("a\nb\nc", "a\nx\nc");
    expect(rows.map((row) => row.kind)).toEqual(["equal", "changed", "equal"]);
    expect(rows[1].previous).toEqual({ number: 2, text: "b" });
    expect(rows[1].current).toEqual({ number: 2, text: "x" });
    expect(hasAgentChatArtifactChanges(rows)).toBe(true);
    expect(hasAgentChatArtifactChanges(diffAgentChatArtifactText("same", "same"))).toBe(
      false
    );
  });

  it("renders changed-line stats and toggles between side-by-side and inline", () => {
    const onModeChange = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatArtifactDiff
        previous={"a\nb\nc"}
        current={"a\nx\nc"}
        onModeChange={onModeChange}
      />
    );

    const section = container.querySelector(
      ".dcf-chat-artifact-diff"
    ) as HTMLElement;
    expect(section.dataset.mode).toBe("side-by-side");
    expect(
      screen.getByLabelText("Added lines: 1")
    ).toHaveTextContent("1");
    expect(
      screen.getByLabelText("Removed lines: 1")
    ).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "Inline" }));
    expect(onModeChange).toHaveBeenCalledWith("inline");
    expect(section.dataset.mode).toBe("inline");
    expect(screen.getByRole("button", { name: "Inline" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(container.querySelectorAll(".dcf-chat-artifact-diff__line--changed")).toHaveLength(0);
    expect(
      container.querySelectorAll(".dcf-chat-artifact-diff__line")
    ).toHaveLength(4);
  });

  it("renders the no-changes state and can hide the toggle", () => {
    const { container, unmount } = renderInAgentProvider(
      <ChatArtifactDiff previous="same" current="same" showToggle={false} />
    );

    expect(screen.getByText("No changes")).toBeInTheDocument();
    expect(container.querySelector(".dcf-chat-artifact-diff__modes")).toBeNull();
    unmount();
  });
});
