import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { RgxDashboard } from "../../src/lib/components/dashboard/RgxDashboard";
import {
  canPlace,
  clamp,
  restorePlacements,
  snapDrag,
  snapResize,
  stripUnsafeKeys,
} from "../../src/lib/components/dashboard/dashboard.utils";
import type {
  DashDocument,
  DashPaletteEntry,
  DashPlacement,
} from "../../src/lib/components/dashboard/dashboard.types";
import { I18nLoader } from "../../src/lib/i18n/Loader";

const palette: DashPaletteEntry[] = [
  { tag: "widget-a", label: "Widget A" },
  { tag: "widget-b", label: "Widget B" },
];

function placement(
  overrides: Partial<DashPlacement> & Pick<DashPlacement, "id" | "tag">
): DashPlacement {
  return {
    col: 1,
    row: 1,
    cols: 1,
    rows: 1,
    config: {},
    ...overrides,
  } as DashPlacement;
}

function documentWith(placements: DashPlacement[]): DashDocument {
  return { name: "Dashboard", cols: 4, rows: 4, placements };
}

describe("dashboard whitelist-on-restore (AC-12)", () => {
  it("drops placements whose tag is not in the palette", () => {
    const restored = restorePlacements(
      [
        placement({ id: "known", tag: "widget-a" }),
        placement({ id: "unknown", tag: "evil-widget" }),
      ],
      palette.map((entry) => entry.tag)
    );
    expect(restored.map((item) => item.id)).toEqual(["known"]);
  });

  it("drops prototype-pollution-shaped keys from config and placement", () => {
    const poisoned = JSON.parse(
      '{"id":"poisoned","tag":"widget-a","col":1,"row":1,"cols":1,"rows":1,' +
        '"__proto__":{"polluted":true},"constructor":{"bad":true},' +
        '"prototype":{"bad":true},' +
        '"config":{"__proto__":{"polluted":true},"constructor":{"bad":true},' +
        '"prototype":{"bad":true},"title":"ok"}}'
    ) as DashPlacement;

    const [restored] = restorePlacements([poisoned], ["widget-a"]);

    expect(Object.keys(restored.config)).toEqual(["title"]);
    expect(Object.keys(restored)).not.toContain("__proto__");
    expect(Object.keys(restored)).not.toContain("constructor");
    expect(Object.keys(restored)).not.toContain("prototype");
    expect(Object.keys(restored.config)).not.toContain("prototype");
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("returns non-object values unchanged in stripUnsafeKeys", () => {
    expect(stripUnsafeKeys("value" as unknown as object)).toBe("value");
    expect(stripUnsafeKeys(null as unknown as object)).toBeNull();
  });

  it("does not render a poisoned persisted tag through the component renderer", () => {
    const poisoned: DashDocument = documentWith([
      placement({ id: "known", tag: "widget-a" }),
      placement({ id: "evil", tag: "evil-widget" }),
    ]);
    const { container } = render(
      <RgxDashboard
        operation={OperationKeys.READ}
        document={poisoned}
        palette={palette}
      />
    );
    const tiles = container.querySelectorAll(".dcf-dashboard-placement");
    expect(tiles).toHaveLength(1);
    expect(container.textContent).not.toContain("evil-widget");
  });
});

describe("dashboard keyboard move/resize and tile ARIA", () => {
  beforeEach(() => {
    I18nLoader.cache["en"] = {
      ...(I18nLoader.cache["en"] || {}),
      "component.dashboard.tile_position":
        "Column {col}, row {row}, {cols} by {rows} cells",
      "component.dashboard.tile_keyboard_hint":
        "Use the arrow keys to move; hold Shift to resize",
    };
  });

  function renderEditor(placements: DashPlacement[]) {
    const onChange = jest.fn();
    const utils = render(
      <RgxDashboard
        operation={OperationKeys.CREATE}
        document={documentWith(placements)}
        palette={palette}
        onChange={onChange}
      />
    );
    const tiles = utils.container.querySelectorAll<HTMLElement>(
      ".dcf-dashboard-placement"
    );
    return { ...utils, onChange, tiles };
  }

  it("moves the focused tile one cell with the arrow keys", () => {
    const { onChange, tiles } = renderEditor([
      placement({ id: "a", tag: "widget-a" }),
      placement({ id: "b", tag: "widget-b", col: 3 }),
    ]);

    fireEvent.keyDown(tiles[0], { key: "ArrowRight" });

    const last = onChange.mock.calls.at(-1)?.[0] as DashDocument;
    const moved = last.placements.find((item) => item.id === "a");
    expect(moved).toMatchObject({ col: 2, row: 1 });
  });

  it("rejects out-of-grid and colliding moves", () => {
    const { onChange, tiles } = renderEditor([
      placement({ id: "a", tag: "widget-a" }),
      placement({ id: "b", tag: "widget-b", col: 3 }),
    ]);

    fireEvent.keyDown(tiles[0], { key: "ArrowRight" });
    onChange.mockClear();
    fireEvent.keyDown(tiles[0], { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();

    onChange.mockClear();
    const first = renderEditor([placement({ id: "solo", tag: "widget-a" })]);
    fireEvent.keyDown(first.tiles[0], { key: "ArrowLeft" });
    expect(first.onChange).not.toHaveBeenCalled();
  });

  it("resizes the focused tile with Shift+Arrow, rejecting collisions", () => {
    const { onChange, tiles } = renderEditor([
      placement({ id: "a", tag: "widget-a" }),
      placement({ id: "b", tag: "widget-b", col: 3 }),
    ]);

    fireEvent.keyDown(tiles[0], { key: "ArrowRight" });
    onChange.mockClear();

    fireEvent.keyDown(tiles[0], { key: "ArrowRight", shiftKey: true });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(tiles[0], { key: "ArrowDown", shiftKey: true });
    const last = onChange.mock.calls.at(-1)?.[0] as DashDocument;
    const resized = last.placements.find((item) => item.id === "a");
    expect(resized).toMatchObject({ cols: 1, rows: 2 });
  });

  it("exposes tile ARIA parity: role, tabindex and accessible name", () => {
    const { tiles } = renderEditor([placement({ id: "a", tag: "widget-a" })]);
    expect(tiles[0]).toHaveAttribute("role", "group");
    expect(tiles[0]).toHaveAttribute("tabindex", "0");
    expect(tiles[0].getAttribute("aria-label")).toBe(
      "Column 1, row 1, 1 by 1 cells"
    );
  });

  it("does not make tiles focusable in read mode", () => {
    const { container } = render(
      <RgxDashboard
        operation={OperationKeys.READ}
        document={documentWith([placement({ id: "a", tag: "widget-a" })])}
        palette={palette}
      />
    );
    const tile = container.querySelector(".dcf-dashboard-placement");
    expect(tile).not.toHaveAttribute("tabindex");
  });
});

const TILE_HINT =
  "Use the arrow keys to move; hold Shift with the arrow keys to resize";

function seedTileTranslations(): void {
  I18nLoader.cache["en"] = {
    ...(I18nLoader.cache["en"] || {}),
    "component.dashboard.tile_position":
      "Column {col}, row {row}, {cols} by {rows} cells",
    "component.dashboard.tile_keyboard_hint": TILE_HINT,
  };
}

describe("dashboard keyboard guards", () => {
  beforeEach(seedTileTranslations);

  it("ignores a keydown that originates from a child control", () => {
    const onChange = jest.fn();
    const { container } = render(
      <RgxDashboard
        operation={OperationKeys.CREATE}
        document={documentWith([placement({ id: "a", tag: "widget-a" })])}
        palette={palette}
        onChange={onChange}
      />
    );
    const tile = container.querySelector<HTMLElement>(
      ".dcf-dashboard-placement"
    )!;
    const remove = tile.querySelector("button")!;

    fireEvent.keyDown(remove, { key: "ArrowRight" });

    expect(onChange).not.toHaveBeenCalled();
    expect(tile.getAttribute("aria-label")).toBe(
      "Column 1, row 1, 1 by 1 cells"
    );
  });

  it("does not mutate the composition from a read-mode keydown", () => {
    const onChange = jest.fn();
    const { container } = render(
      <RgxDashboard
        operation={OperationKeys.READ}
        document={documentWith([placement({ id: "a", tag: "widget-a" })])}
        palette={palette}
        onChange={onChange}
      />
    );
    const tile = container.querySelector<HTMLElement>(
      ".dcf-dashboard-placement"
    )!;

    fireEvent.keyDown(tile, { key: "ArrowRight" });
    fireEvent.keyDown(tile, { key: "ArrowDown", shiftKey: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(tile.getAttribute("aria-label")).toBe(
      "Column 1, row 1, 1 by 1 cells"
    );
  });
});

describe("dashboard tile keyboard hint", () => {
  beforeEach(seedTileTranslations);

  it("renders the keyboard hint for editable tiles", () => {
    const { container } = render(
      <RgxDashboard
        operation={OperationKeys.CREATE}
        document={documentWith([placement({ id: "a", tag: "widget-a" })])}
        palette={palette}
      />
    );
    const hint = container.querySelector(".dcf-dashboard-placement .dcf-sr-only");
    expect(hint?.textContent).toBe(TILE_HINT);
  });

  it("omits the keyboard hint in read mode", () => {
    const { container } = render(
      <RgxDashboard
        operation={OperationKeys.READ}
        document={documentWith([placement({ id: "a", tag: "widget-a" })])}
        palette={palette}
      />
    );
    expect(container.querySelector(".dcf-dashboard-placement")).not.toBeNull();
    expect(container.querySelector(".dcf-sr-only")).toBeNull();
  });
});

describe("dashboard post-mount restore", () => {
  beforeEach(seedTileTranslations);

  it("re-sanitizes a poisoned document received after mount", () => {
    const seen: DashPlacement[] = [];
    const renderPlacement = (item: DashPlacement) => {
      seen.push(item);
      return <span>{item.id}</span>;
    };
    const initial = documentWith([
      placement({ id: "a", tag: "widget-a" }),
    ]);
    const poisoned = JSON.parse(
      '{"name":"Dashboard","cols":4,"rows":4,"placements":[' +
        '{"id":"a","tag":"widget-a","col":1,"row":1,"cols":1,"rows":1,' +
        '"prototype":{"bad":true},"config":{"prototype":{"bad":true},"title":"ok"}},' +
        '{"id":"b","tag":"widget-b","col":2,"row":1,"cols":1,"rows":1,"config":{}},' +
        '{"id":"evil","tag":"evil-widget","col":3,"row":1,"cols":1,"rows":1,"config":{}}]}'
    ) as DashDocument;

    const { container, rerender } = render(
      <RgxDashboard
        operation={OperationKeys.READ}
        document={initial}
        palette={palette}
        renderPlacement={renderPlacement}
      />
    );
    seen.length = 0;

    rerender(
      <RgxDashboard
        operation={OperationKeys.READ}
        document={poisoned}
        palette={palette}
        renderPlacement={renderPlacement}
      />
    );

    const tiles = container.querySelectorAll(".dcf-dashboard-placement");
    expect(tiles).toHaveLength(2);
    expect(container.textContent).not.toContain("evil-widget");

    const restored = seen.slice(-2);
    expect(restored.map((item) => item.id)).toEqual(["a", "b"]);
    expect(Object.keys(restored[0])).not.toContain("prototype");
    expect(Object.keys(restored[0].config)).toEqual(["title"]);
    expect(Object.keys(restored[1])).not.toContain("prototype");
  });
});

describe("dashboard numeric bounds", () => {
  beforeEach(seedTileTranslations);

  it("falls back to the grid props for falsy restored dimensions", () => {
    const { container, rerender } = render(
      <RgxDashboard
        operation={OperationKeys.READ}
        document={{ name: "Dashboard", cols: 0, rows: 0, placements: [] }}
        palette={palette}
      />
    );
    const canvas = container.querySelector(".dcf-dashboard-canvas");
    expect(canvas).toHaveAttribute("data-cols", "4");
    expect(canvas).toHaveAttribute("data-rows", "4");

    rerender(
      <RgxDashboard
        operation={OperationKeys.READ}
        document={{
          name: "Dashboard",
          cols: Number.NaN,
          rows: Number.NaN,
          placements: [],
        }}
        palette={palette}
      />
    );
    expect(container.querySelector(".dcf-dashboard-canvas")).toHaveAttribute(
      "data-cols",
      "4"
    );
    expect(container.querySelector(".dcf-dashboard-canvas")).toHaveAttribute(
      "data-rows",
      "4"
    );
  });

  it("restores in-bounds dimensions and boundary coordinates", () => {
    const { container } = render(
      <RgxDashboard
        operation={OperationKeys.READ}
        document={{
          name: "Dashboard",
          cols: 5,
          rows: 3,
          placements: [
            placement({
              id: "edge",
              tag: "widget-a",
              col: 5,
              row: 3,
              cols: 1,
              rows: 1,
            }),
          ],
        }}
        palette={palette}
      />
    );
    expect(container.querySelector(".dcf-dashboard-canvas")).toHaveAttribute(
      "data-cols",
      "5"
    );
    expect(container.querySelector(".dcf-dashboard-canvas")).toHaveAttribute(
      "data-rows",
      "3"
    );
    expect(
      container
        .querySelector(".dcf-dashboard-placement")
        ?.getAttribute("aria-label")
    ).toBe("Column 5, row 3, 1 by 1 cells");
  });

  it("rejects out-of-grid origins and footprints", () => {
    const wide = { id: "wide", cols: 2, rows: 1 };
    const tall = { id: "tall", cols: 1, rows: 2 };

    expect(canPlace(wide, 0, 1, [], 4, 4)).toBe(false);
    expect(canPlace(wide, 1, 0, [], 4, 4)).toBe(false);
    expect(canPlace(wide, 4, 1, [], 4, 4)).toBe(false);
    expect(canPlace(tall, 1, 4, [], 4, 4)).toBe(false);
    expect(canPlace(wide, 3, 1, [], 4, 4)).toBe(true);
    expect(canPlace(tall, 1, 3, [], 4, 4)).toBe(true);
  });

  it("clamps snapped drag and resize targets to the grid", () => {
    expect(clamp(9, 1, 4)).toBe(4);
    expect(clamp(-9, 1, 4)).toBe(1);
    expect(clamp(2, 1, 4)).toBe(2);

    const moving = { id: "moving", cols: 2, rows: 2 };
    expect(snapDrag(moving, 999, 999, [], 4, 4)).toEqual({
      col: 3,
      row: 3,
      cols: 2,
      rows: 2,
    });
    expect(snapDrag(moving, 0, 0, [], 4, 4)).toEqual({
      col: 1,
      row: 1,
      cols: 2,
      rows: 2,
    });

    const resizing = { id: "resizing", col: 3, row: 3, cols: 1, rows: 1 };
    expect(snapResize(resizing, 999, 999, [], 4, 4)).toEqual({
      col: 3,
      row: 3,
      cols: 2,
      rows: 2,
    });
  });
});
