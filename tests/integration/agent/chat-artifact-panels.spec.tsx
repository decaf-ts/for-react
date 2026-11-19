import "./xyflow-mock";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { ChatArtifactConsole } from "../../../src/agent/components/chat-artifact-console/ChatArtifactConsole.js";
import { ChatArtifactEditor } from "../../../src/agent/components/chat-artifact-editor/ChatArtifactEditor.js";
import { ChatArtifactDocument } from "../../../src/agent/components/chat-artifact-document/ChatArtifactDocument.js";
import type { AgentChatArtifactDocument } from "../../../src/agent/types.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * SAA-2095 coverage requirement 9 (part 2) — console resize keyboard, editor
 * CodeMirror mount/static fallback/image, and document lifecycle + retry.
 */

describe("ChatArtifactConsole", () => {
  it("resizes with the keyboard and emits every height change", () => {
    const onHeightChange = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatArtifactConsole onHeightChange={onHeightChange} />
    );

    const section = container.querySelector(
      ".dcf-chat-artifact-console"
    ) as HTMLElement;
    const handle = screen.getByRole("separator");
    expect(section).toHaveStyle({ height: "200px" });
    expect(handle).toHaveAttribute("aria-valuenow", "200");

    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(handle).toHaveAttribute("aria-valuenow", "216");
    expect(onHeightChange).toHaveBeenLastCalledWith(216);

    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(handle).toHaveAttribute("aria-valuenow", "200");

    fireEvent.keyDown(handle, { key: "End" });
    expect(handle).toHaveAttribute("aria-valuenow", "560");

    fireEvent.keyDown(handle, { key: "Home" });
    expect(handle).toHaveAttribute("aria-valuenow", "120");
  });

  it("shows rows with levels and the count, and clears", () => {
    const onCleared = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatArtifactConsole
        onCleared={onCleared}
        rows={[
          { id: "1", level: "warn", text: "careful", timestamp: "2026-11-19T10:00:00.000Z" },
          { id: "2", text: "ordinary" },
        ]}
      />
    );

    const rows = container.querySelectorAll(".dcf-chat-artifact-console__row");
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute("data-level")).toBe("warn");
    expect(rows[1].getAttribute("data-level")).toBe("log");
    expect(screen.getByText("careful")).toBeInTheDocument();
    expect(screen.getByText("2 lines")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear output/ }));
    expect(onCleared).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state and omits the handle when not resizable", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactConsole resizable={false} rows={[]} />
    );

    expect(screen.getByText("No output yet.")).toBeInTheDocument();
    expect(container.querySelector(".dcf-chat-artifact-console__handle")).toBeNull();
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("clamps the initial height into the configured bounds", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactConsole initialHeight={1000} maxHeight={300} />
    );
    const section = container.querySelector(
      ".dcf-chat-artifact-console"
    ) as HTMLElement;
    expect(section).toHaveStyle({ height: "300px" });
  });
});

describe("ChatArtifactEditor", () => {
  it("mounts a real CodeMirror for editable code", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactEditor kind="code" language="ts" content="const a = 1;" />
    );

    expect(container.querySelector(".cm-editor")).not.toBeNull();
    expect(container.querySelector(".cm-content")?.textContent).toContain(
      "const a = 1;"
    );
    expect(container.querySelector(".dcf-chat-artifact-editor__static")).toBeNull();
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByText("Editable")).toBeInTheDocument();
  });

  it("falls back to a static pre block when not editable", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactEditor kind="text" content="frozen text" editable={false} />
    );

    const staticPane = container.querySelector(
      ".dcf-chat-artifact-editor__static"
    );
    expect(staticPane?.textContent).toBe("frozen text");
    expect(container.querySelector(".cm-editor")).toBeNull();
    expect(screen.getByText("Read only")).toBeInTheDocument();
  });

  it("renders images through the media allowlist", () => {
    const allowed = renderInAgentProvider(
      <ChatArtifactEditor kind="image" src="https://cdn.example.test/a.png" />
    );
    expect(
      allowed.container.querySelector(".dcf-chat-artifact-editor__image img")
    ).not.toBeNull();
    allowed.unmount();

    const rejected = renderInAgentProvider(
      <ChatArtifactEditor kind="image" src="javascript:alert(1)" />
    );
    expect(
      rejected.container.querySelector(".dcf-chat-artifact-editor__image img")
    ).toBeNull();
    expect(screen.getByText("No image preview available.")).toBeInTheDocument();
  });
});

describe("ChatArtifactDocument", () => {
  const document: AgentChatArtifactDocument = {
    id: "doc-1",
    title: "Quarterly report",
    kind: "text",
    content: "Revenue is up.",
    version: 2,
  };

  it("renders the pending placeholder", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactDocument status="pending" />
    );
    expect(
      container.querySelector(".dcf-chat-artifact-document")
    ).toHaveAttribute("data-status", "pending");
    expect(screen.getByText("Waiting for the tool result…")).toBeInTheDocument();
  });

  it("renders a loading skeleton", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactDocument status="loading" />
    );
    expect(
      container.querySelector(".dcf-chat-artifact-document")
    ).toHaveAttribute("data-status", "loading");
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("renders a loaded document preview with version", () => {
    const { container } = renderInAgentProvider(
      <ChatArtifactDocument document={document} />
    );
    expect(
      container.querySelector(".dcf-chat-artifact-document")
    ).toHaveAttribute("data-status", "succeeded");
    expect(screen.getByText("Quarterly report")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(
      container.querySelector(".dcf-chat-artifact-document__content")?.textContent
    ).toBe("Revenue is up.");
  });

  it("auto-loads through the loader and reports success", async () => {
    const loader = jest.fn().mockResolvedValue(document);
    const onLoaded = jest.fn();
    renderInAgentProvider(
      <ChatArtifactDocument documentId="doc-1" loader={loader} onLoaded={onLoaded} />
    );

    expect(await screen.findByText("Quarterly report")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledWith("doc-1");
    expect(onLoaded).toHaveBeenCalledWith(document);
  });

  it("surfaces a failed load, reports it, and retries", async () => {
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(document);
    const onFailed = jest.fn();
    const onReloadRequested = jest.fn();
    const { container } = renderInAgentProvider(
      <ChatArtifactDocument
        documentId="doc-1"
        loader={loader}
        onFailed={onFailed}
        onReloadRequested={onReloadRequested}
      />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("network down");
    expect(onFailed).toHaveBeenCalledWith("network down");
    expect(
      container.querySelector(".dcf-chat-artifact-document")
    ).toHaveAttribute("data-status", "failed");

    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    await waitFor(() =>
      expect(
        container.querySelector(".dcf-chat-artifact-document")
      ).toHaveAttribute("data-status", "succeeded")
    );
    expect(onReloadRequested).toHaveBeenCalledWith("doc-1");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("shows a supplied failure without a retry when no loader is available", () => {
    renderInAgentProvider(
      <ChatArtifactDocument status="failed" error="missing document" />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("missing document");
    expect(screen.queryByRole("button", { name: /Retry/ })).not.toBeInTheDocument();
  });
});
