import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  DEMO_LIST_TAG,
  DEMO_NOTE_TAG,
  DEMO_STATS_TAG,
  registerDemoDashboardComponents,
} from "../../demo/pages/dashboard-builder/demo-components";
import { DashboardBuilderPage } from "../../demo/pages/DashboardBuilderPage";
import { RgxComponentRegistry } from "../../src/lib/engine/ComponentRegistry";
import { I18nLoader } from "../../src/lib/i18n/Loader";
import type { DashDocument } from "../../src/lib/components/dashboard/dashboard.types";

const STORAGE_KEY = "dashboard-builder:composition";

const TRANSLATIONS = {
  "dashboard-builder.title": "Dashboard Builder",
  "dashboard-builder.create": "Create",
  "dashboard-builder.read": "Read",
  "dashboard-builder.update": "Update",
  "dashboard-builder.delete": "Delete",
  "dashboard-builder.saved": "Dashboard saved.",
  "dashboard.demo.stats": "Stat",
  "dashboard.demo.list": "List",
  "dashboard.demo.note": "Note",
  "dashboard.save": "Save",
  "dashboard.delete": "Delete",
  "dashboard.remove": "Remove",
  "dashboard.confirm_remove": "Remove this component?",
  "dashboard.confirm": "Confirm",
  "dashboard.cancel": "Cancel",
  "dashboard.empty": "Empty dashboard",
  "dashboard.palette": "Components",
  "dashboard.emptyPalette": "No dashboard components registered.",
  "component.dashboard.tile_position":
    "Column {col}, row {row}, {cols} by {rows} cells",
  "component.dashboard.tile_keyboard_hint":
    "Use the arrow keys to move; hold Shift with the arrow keys to resize",
};

function seedTranslations(): void {
  I18nLoader.cache["en"] = {
    ...(I18nLoader.cache["en"] || {}),
    ...TRANSLATIONS,
  };
}

function composition(placements: DashDocument["placements"]): DashDocument {
  return { name: "Dashboard", cols: 4, rows: 4, placements };
}

function validPlacement() {
  return {
    id: "seeded",
    tag: "demo-stats",
    labelKey: "dashboard.demo.stats",
    col: 1,
    row: 1,
    cols: 2,
    rows: 1,
    config: { title: "Revenue", value: "$1" },
  };
}

describe("DashboardBuilder demo page", () => {
  beforeEach(() => {
    seedTranslations();
    window.localStorage.clear();
  });

  it("composes from the palette, persists on save and switches to read mode", () => {
    const { container } = render(<DashboardBuilderPage />);

    const paletteButtons = container.querySelectorAll(
      ".dcf-dashboard-palette button"
    );
    expect(paletteButtons).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Stat" }));
    expect(container.querySelectorAll(".dcf-dashboard-placement")).toHaveLength(
      1
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "{}"
    ) as DashDocument;
    expect(stored.placements).toHaveLength(1);
    expect(stored.placements[0].tag).toBe("demo-stats");

    expect(
      container.querySelectorAll(".dcf-dashboard-palette")
    ).toHaveLength(0);
    expect(container.querySelectorAll(".dcf-dashboard-placement")).toHaveLength(
      1
    );
    expect(
      container.querySelectorAll(".dcf-dashboard-placement-header button")
    ).toHaveLength(0);
    expect(screen.getByText("Dashboard saved.")).toBeInTheDocument();
  });

  it("starts a new composition from the create mode button", () => {
    const { container } = render(<DashboardBuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Stat" }));
    expect(container.querySelectorAll(".dcf-dashboard-placement")).toHaveLength(
      1
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      container.querySelectorAll(".dcf-dashboard-palette")
    ).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(
      container.querySelectorAll(".dcf-dashboard-palette")
    ).toHaveLength(1);
    expect(container.querySelectorAll(".dcf-dashboard-placement")).toHaveLength(
      0
    );
  });

  it("renders a seeded composition in read mode and filters poisoned tags", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        composition([
          validPlacement(),
          {
            id: "evil",
            tag: "evil-widget",
            col: 3,
            row: 1,
            cols: 1,
            rows: 1,
            config: {},
          },
        ])
      )
    );

    const { container } = render(<DashboardBuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Read" }));

    expect(container.querySelectorAll(".dcf-dashboard-placement")).toHaveLength(
      1
    );
    expect(container.textContent).not.toContain("evil-widget");
  });

  it("registers every palette entry and renders each widget at its default footprint", () => {
    registerDemoDashboardComponents();
    expect(typeof RgxComponentRegistry.get(DEMO_STATS_TAG)).toBe("function");
    expect(typeof RgxComponentRegistry.get(DEMO_LIST_TAG)).toBe("function");
    expect(typeof RgxComponentRegistry.get(DEMO_NOTE_TAG)).toBe("function");

    const { container } = render(<DashboardBuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Stat" }));
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    fireEvent.click(screen.getByRole("button", { name: "Note" }));

    expect(container.querySelector(".demo-stat")?.textContent).toContain(
      "Revenue"
    );
    expect(container.querySelector(".demo-list")?.textContent).toContain(
      "Top items"
    );
    expect(container.querySelector(".demo-note")?.textContent).toContain(
      "Remember to review the composition."
    );

    const tiles = container.querySelectorAll(".dcf-dashboard-placement");
    expect(tiles).toHaveLength(3);
    expect(tiles[0]).toHaveAttribute(
      "aria-label",
      "Column 1, row 1, 2 by 1 cells"
    );
    expect(tiles[1]).toHaveAttribute(
      "aria-label",
      "Column 3, row 1, 2 by 2 cells"
    );
    expect(tiles[2]).toHaveAttribute(
      "aria-label",
      "Column 1, row 2, 1 by 1 cells"
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "{}"
    ) as DashDocument;
    const footprints = Object.fromEntries(
      stored.placements.map((entry) => [entry.tag, `${entry.cols}x${entry.rows}`])
    );
    expect(footprints).toEqual({
      [DEMO_STATS_TAG]: "2x1",
      [DEMO_LIST_TAG]: "2x2",
      [DEMO_NOTE_TAG]: "1x1",
    });
  });

  it("loads the persisted composition into update mode with editing affordances", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(composition([validPlacement()]))
    );

    const { container } = render(<DashboardBuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect(container.querySelectorAll(".dcf-dashboard-placement")).toHaveLength(
      1
    );
    expect(container.querySelector(".demo-stat")?.textContent).toContain(
      "Revenue"
    );
    expect(
      container.querySelectorAll(".dcf-dashboard-palette")
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".dcf-dashboard-placement-header button")
    ).toHaveLength(1);
    expect(
      container.querySelector(".dcf-dashboard-placement")
    ).toHaveAttribute("tabindex", "0");
    expect(container.querySelector(".dcf-sr-only")?.textContent).toBe(
      TRANSLATIONS["component.dashboard.tile_keyboard_hint"]
    );
  });

  it("renders the tile keyboard hint only in edit mode", () => {
    const edit = render(<DashboardBuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Stat" }));
    expect(edit.container.querySelector(".dcf-sr-only")?.textContent).toBe(
      TRANSLATIONS["component.dashboard.tile_keyboard_hint"]
    );
    edit.unmount();

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(composition([validPlacement()]))
    );
    const read = render(<DashboardBuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    expect(
      read.container.querySelectorAll(".dcf-dashboard-placement")
    ).toHaveLength(1);
    expect(read.container.querySelector(".dcf-sr-only")).toBeNull();
  });

  it("deletes the persisted composition", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(composition([validPlacement()]))
    );

    const { container } = render(<DashboardBuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const footer = container.querySelector(
      ".dcf-dashboard-footer"
    ) as HTMLElement;
    fireEvent.click(within(footer).getByRole("button", { name: "Delete" }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(
      container.querySelectorAll(".dcf-dashboard-palette")
    ).toHaveLength(1);
  });
});
