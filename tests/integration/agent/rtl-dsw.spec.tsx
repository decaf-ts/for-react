import "./ai-sdk-mock";
import "./xyflow-mock";
import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import {
  DswSidebar,
  type DswSidebarPluginStatus,
} from "../../../src/agent/components/dsw-sidebar/DswSidebar.js";
import {
  DswSessionHeader,
  type DswSessionStatus,
} from "../../../src/agent/components/dsw-session-header/DswSessionHeader.js";
import { DswComposerShell } from "../../../src/agent/components/dsw-composer-shell/DswComposerShell.js";
import { DswSettingsDrawer } from "../../../src/agent/components/dsw-settings-drawer/DswSettingsDrawer.js";
import { AgentChatComposerModel } from "../../../src/agent/models/AgentChatComposerModel.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * RTL coverage for the DSW shell family: sidebar, session header, composer
 * shell and the settings drawer.
 */

const PLUGINS: DswSidebarPluginStatus[] = [
  { id: "orders", label: "Orders", state: "active" },
  { id: "billing", label: "Billing", state: "error", detail: "Token expired" },
  { id: "search", label: "Search", state: "inactive" },
];

describe("DswSidebar", () => {
  it("renders the brand, new session action and session slot", () => {
    const onNewSession = jest.fn();
    renderInAgentProvider(
      <DswSidebar
        title="Harness"
        brandSlot={<span>Brand</span>}
        sessionsSlot={<p>Session list</p>}
        footerSlot={<p>Footer</p>}
        onNewSession={onNewSession}
      />
    );

    const nav = screen.getByRole("navigation", { name: "Sidebar" });
    expect(within(nav).getByText("Harness")).toBeInTheDocument();
    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByText("Session list")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New session" }));
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });

  it("toggles collapse state and labels the control", () => {
    const onCollapseChange = jest.fn();
    const { rerender, container } = renderInAgentProvider(
      <DswSidebar onCollapseChange={onCollapseChange} />
    );

    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(onCollapseChange).toHaveBeenCalledWith(true);

    rerender(
      <DswSidebar collapsed onCollapseChange={onCollapseChange} />
    );
    expect(container.querySelector(".dcf-dsw-sidebar")).toHaveClass(
      "dcf-dsw-sidebar--collapsed"
    );
    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expand).toHaveAttribute("aria-expanded", "false");

    rerender(<DswSidebar collapsible={false} />);
    expect(
      screen.queryByRole("button", { name: /sidebar/ })
    ).not.toBeInTheDocument();
  });

  it("disables the new session action and hides plugin status", () => {
    const { container } = renderInAgentProvider(
      <DswSidebar newSessionDisabled showPluginStatus={false} plugins={PLUGINS} />
    );
    expect(screen.getByRole("button", { name: "New session" })).toBeDisabled();
    expect(container.querySelector(".dcf-dsw-sidebar__plugins")).toBeNull();
  });

  it("renders each plugin state and opens a plugin", () => {
    const onPluginOpen = jest.fn();
    renderInAgentProvider(
      <DswSidebar plugins={PLUGINS} onPluginOpen={onPluginOpen} />
    );

    expect(
      screen.getByRole("button", { name: "Orders: Active" })
    ).toBeInTheDocument();
    const billing = screen.getByRole("button", { name: "Billing: Error" });
    expect(billing).toHaveAttribute("title", "Token expired");
    expect(
      screen.getByRole("button", { name: "Search: Inactive" })
    ).toBeInTheDocument();

    fireEvent.click(billing);
    expect(onPluginOpen).toHaveBeenCalledWith(PLUGINS[1]);
  });

  it("uses custom label keys with fallbacks", () => {
    renderInAgentProvider(
      <DswSidebar
        ariaLabelFallback="Workspace sidebar"
        newSessionLabelFallback="Start chat"
      />
    );
    expect(
      screen.getByRole("navigation", { name: "Workspace sidebar" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start chat" })
    ).toBeInTheDocument();
  });
});

describe("DswSessionHeader", () => {
  it("renders the title, subtitle and idle status", () => {
    renderInAgentProvider(
      <DswSessionHeader title="Invoice run" subtitle="Three agents" />
    );
    expect(
      screen.getByRole("heading", { name: "Invoice run" })
    ).toBeInTheDocument();
    expect(screen.getByText("Three agents")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Idle");
  });

  it.each<[DswSessionStatus, string]>([
    ["idle", "Idle"],
    ["running", "Running"],
    ["done", "Done"],
    ["error", "Error"],
  ])("labels the %s status", (status, label) => {
    const { rerender } = renderInAgentProvider(
      <DswSessionHeader title="Session" status={status} />
    );
    expect(screen.getByRole("status")).toHaveTextContent(label);
    rerender(<DswSessionHeader title="Session" status="idle" />);
  });

  it("hides the status and renders slots and the menu action", () => {
    const onMenu = jest.fn();
    renderInAgentProvider(
      <DswSessionHeader
        title="Session"
        showStatus={false}
        showMenu
        leadingSlot={<span>Leading</span>}
        actionsSlot={<span>Actions</span>}
        onMenu={onMenu}
      />
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Leading")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Session actions" }));
    expect(onMenu).toHaveBeenCalledTimes(1);
  });
});

describe("DswComposerShell", () => {
  it("renders the composer and forwards send/stop", () => {
    const onSend = jest.fn();
    const onStop = jest.fn();
    const { rerender } = renderInAgentProvider(
      <DswComposerShell onSend={onSend} onStop={onStop} />
    );

    const textarea = screen.getByLabelText("Type a message…");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("Hello");

    rerender(<DswComposerShell running onSend={onSend} onStop={onStop} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop response" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("renders notice, dock, accessory, tools and footer slots", () => {
    renderInAgentProvider(
      <DswComposerShell
        notice="Heads up"
        dock={<p>Dock</p>}
        accessory={<p>Accessory</p>}
        tools={<p>Tools</p>}
        footer={<p>Footer</p>}
        showPermissions
        permissionsActive
        onPermissionsOpen={jest.fn()}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Heads up");
    expect(screen.getByText("Dock")).toBeInTheDocument();
    expect(screen.getByText("Accessory")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Permissions" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("calls the permissions handler and omits optional rows", () => {
    const onPermissionsOpen = jest.fn();
    const { container } = renderInAgentProvider(
      <DswComposerShell showPermissions onPermissionsOpen={onPermissionsOpen} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Permissions" }));
    expect(onPermissionsOpen).toHaveBeenCalledTimes(1);

    expect(container.querySelector(".dcf-dsw-composer-shell__dock")).toBeNull();
    expect(
      container.querySelector(".dcf-dsw-composer-shell__footer")
    ).toBeNull();
  });
});

describe("DswSettingsDrawer", () => {
  it("renders nothing while closed", () => {
    const { container } = renderInAgentProvider(<DswSettingsDrawer />);
    expect(container.querySelector(".dcf-dsw-settings-drawer")).toBeNull();
  });

  it("renders an empty settings state and closes on demand", () => {
    const onOpenChange = jest.fn();
    const onDismiss = jest.fn();
    renderInAgentProvider(
      <DswSettingsDrawer
        open
        onOpenChange={onOpenChange}
        onDismiss={onDismiss}
      />
    );

    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "No settings available"
    );

    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and scrim click, not on panel click", () => {
    const onOpenChange = jest.fn();
    const onDismiss = jest.fn();
    const { container } = renderInAgentProvider(
      <DswSettingsDrawer
        open
        onOpenChange={onOpenChange}
        onDismiss={onDismiss}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("dialog"));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector(".dcf-dsw-settings-drawer__scrim")!);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("renders one card per settings model and custom children", () => {
    const { container } = renderInAgentProvider(
      <DswSettingsDrawer
        open
        variant="panel"
        models={[
          new AgentChatComposerModel({ message: "Hi" }),
          new AgentChatComposerModel({ message: "There" }),
        ]}
      >
        <p>Extra settings</p>
      </DswSettingsDrawer>
    );

    expect(
      container.querySelectorAll(".dcf-dsw-settings-drawer__card")
    ).toHaveLength(2);
    expect(screen.getByText("Extra settings")).toBeInTheDocument();
    expect(
      container.querySelector(".dcf-dsw-settings-drawer__scrim")
    ).toBeNull();
    expect(
      container.querySelector(".dcf-dsw-settings-drawer--panel")
    ).not.toBeNull();
  });
});
