import "./xyflow-mock";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { ChatTool } from "../../../src/agent/components/chat-tool/ChatTool.js";
import { ChatToolOrders } from "../../../src/agent/components/chat-tool-orders/ChatToolOrders.js";
import { ChatToolTracker } from "../../../src/agent/components/chat-tool-tracker/ChatToolTracker.js";
import { ChatToolWeather } from "../../../src/agent/components/chat-tool-weather/ChatToolWeather.js";
import { renderInAgentProvider } from "./test-utils.js";

/**
 * SAA-2095 coverage requirement 2–3 — generic tool card, orders result,
 * shipment tracker, and weather card.
 */

describe("ChatTool", () => {
  it("renders the title, tool name and state label", () => {
    renderInAgentProvider(
      <ChatTool name="orders.lookup" title="Looking up orders" state="input-streaming" />
    );

    expect(screen.getByText("Looking up orders")).toBeInTheDocument();
    expect(screen.getByText("orders.lookup")).toBeInTheDocument();
    expect(screen.getByText("Preparing input…")).toBeInTheDocument();
  });

  it("maps every tool state to its tone and fallback label", () => {
    const cases = [
      ["input-streaming", "pending", "Preparing input…"],
      ["input-available", "pending", "Input ready"],
      ["output-available", "success", "Completed"],
      ["output-error", "error", "Failed"],
      ["output-denied", "denied", "Denied"],
    ] as const;

    for (const [state, tone, label] of cases) {
      const { container, unmount } = renderInAgentProvider(
        <ChatTool name="x" state={state} />
      );
      const section = container.querySelector(".dcf-chat-tool") as HTMLElement;
      expect(section.dataset.state).toBe(state);
      expect(section.dataset.tone).toBe(tone);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("expands the input/output JSON panes and emits the toggle", () => {
    const onToggle = jest.fn();
    renderInAgentProvider(
      <ChatTool
        name="orders.lookup"
        state="output-available"
        toolInput={{ query: "ORD-1" }}
        toolOutput={{ count: 1 }}
        onToggle={onToggle}
      />
    );

    const trigger = screen.getByRole("button", { name: /Show details/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Input")).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const inputPane = document.querySelector('pre[data-pane="input"]');
    const outputPane = document.querySelector('pre[data-pane="output"]');
    expect(inputPane).not.toBeNull();
    expect(inputPane?.textContent).toContain('"query": "ORD-1"');
    expect(outputPane?.textContent).toContain('"count": 1');
    expect(onToggle).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: /Hide details/ }));
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });

  it("starts expanded from the controlled open prop", () => {
    renderInAgentProvider(
      <ChatTool name="x" open toolOutput={{ ok: true }} />
    );

    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hide details/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("shows the error row and expands to an empty pane area", () => {
    const { container } = renderInAgentProvider(
      <ChatTool name="x" state="output-error" error="boom" />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    const section = container.querySelector(".dcf-chat-tool") as HTMLElement;
    const trigger = section.querySelector(
      ".dcf-chat-tool__trigger"
    ) as HTMLButtonElement;
    expect(trigger).not.toBeNull();

    fireEvent.click(trigger);
    expect(section.querySelector('pre[data-pane="input"]')).toBeNull();
    expect(section.querySelector('pre[data-pane="output"]')).toBeNull();
  });

  it("omits the details trigger when there is nothing to show", () => {
    const { container } = renderInAgentProvider(<ChatTool name="x" />);
    const section = container.querySelector(".dcf-chat-tool") as HTMLElement;
    expect(section.querySelector(".dcf-chat-tool__trigger")).toBeNull();
  });
});

describe("ChatToolOrders", () => {
  const orders = [
    {
      id: "ORD-1",
      name: "Console seat",
      date: "2026-10-24",
      status: "Shipped",
      imageUrl: "https://cdn.example.test/seat.png",
    },
    {
      id: "ORD-2",
      name: "Travel case",
      status: "Processing",
      imageUrl: "javascript:alert(1)",
    },
  ];

  it("renders rows, count, and selects a row", () => {
    const onOrderSelect = jest.fn();
    renderInAgentProvider(
      <ChatToolOrders orders={orders} onOrderSelect={onOrderSelect} />
    );

    expect(screen.getByText("Console seat")).toBeInTheDocument();
    expect(screen.getByText("Travel case")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Console seat"));
    expect(onOrderSelect).toHaveBeenCalledTimes(1);
    expect(onOrderSelect.mock.calls[0][0]).toMatchObject({ id: "ORD-1" });
  });

  it("only renders allowlisted image URLs and falls back to an icon", () => {
    const { container } = renderInAgentProvider(<ChatToolOrders orders={orders} />);

    const images = container.querySelectorAll(".dcf-chat-tool-orders__image");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute(
      "src",
      "https://cdn.example.test/seat.png"
    );

    const rejectedRow = container.querySelectorAll(
      ".dcf-chat-tool-orders__row"
    )[1] as HTMLElement;
    expect(rejectedRow.querySelector("img")).toBeNull();
    expect(rejectedRow.querySelector("svg")).not.toBeNull();
  });

  it("renders the empty state", () => {
    renderInAgentProvider(<ChatToolOrders orders={[]} />);
    expect(screen.getByText("No orders found.")).toBeInTheDocument();
  });
});

describe("ChatToolTracker", () => {
  function stepStates(container: HTMLElement): Record<string, string> {
    return Array.from(
      container.querySelectorAll<HTMLElement>(".dcf-chat-tool-tracker__step")
    ).reduce<Record<string, string>>((acc, step) => {
      acc[step.dataset.step as string] = step.dataset.state as string;
      return acc;
    }, {});
  }

  it("derives progress and step states from the shipping status", () => {
    const { container } = renderInAgentProvider(
      <ChatToolTracker status="shipped" />
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "71");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(stepStates(container)).toEqual({
      box: "complete",
      gps: "complete",
      home: "active",
    });
  });

  it("reaches the delivered and cancelled states", () => {
    const delivered = renderInAgentProvider(<ChatToolTracker status="delivered" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
    expect(stepStates(delivered.container)).toEqual({
      box: "complete",
      gps: "complete",
      home: "complete",
    });
    delivered.unmount();

    const cancelled = renderInAgentProvider(<ChatToolTracker status="cancelled" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
    expect(stepStates(cancelled.container)).toEqual({
      box: "cancelled",
      gps: "cancelled",
      home: "cancelled",
    });
  });

  it("clamps an explicit progress value to 0–100", () => {
    const high = renderInAgentProvider(
      <ChatToolTracker status="ordered" progress={180} />
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
    high.unmount();

    renderInAgentProvider(<ChatToolTracker status="ordered" progress={-20} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
  });

  it("prefers an explicit label and description", () => {
    renderInAgentProvider(
      <ChatToolTracker
        status="shipped"
        label="Arriving today"
        description="Courier is nearby."
      />
    );

    expect(screen.getByText("Arriving today")).toBeInTheDocument();
    expect(screen.getByText("Courier is nearby.")).toBeInTheDocument();
  });
});

describe("ChatToolWeather", () => {
  it("renders a loading state with aria-busy", () => {
    const { container } = renderInAgentProvider(
      <ChatToolWeather location="Lisbon" state="loading" />
    );

    const section = container.querySelector(
      ".dcf-chat-tool-weather"
    ) as HTMLElement;
    expect(section).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Fetching the forecast…"
    );
    expect(section.querySelector(".dcf-chat-tool-weather__condition")).toBeNull();
  });

  it("renders the forecast temperatures and condition", () => {
    renderInAgentProvider(
      <ChatToolWeather
        location="Lisbon"
        condition="Sunny"
        high={24}
        low={17}
        unit="°C"
        state="success"
      />
    );

    expect(screen.getByText("Lisbon")).toBeInTheDocument();
    expect(screen.getByText("Sunny")).toBeInTheDocument();
    expect(screen.getByText("24°C")).toBeInTheDocument();
    expect(screen.getByText("17°C")).toBeInTheDocument();
  });

  it("renders the error state with the supplied message", () => {
    renderInAgentProvider(
      <ChatToolWeather location="Lisbon" state="error" error="Forecast down" />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Forecast down");
    expect(screen.queryByText("24°C")).not.toBeInTheDocument();
  });
});
