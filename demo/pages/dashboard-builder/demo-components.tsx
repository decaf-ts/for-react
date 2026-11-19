import React from "react";
import { DashPaletteEntry, RgxComponentRegistry } from "../../../src/lib";

/**
 * @description Palette tag for the demo stat card component.
 * @summary Identifies the {@link DemoStats} renderer in the dashboard component
 * registry used by the builder demo.
 * @memberOf module:for-react.demo
 */
export const DEMO_STATS_TAG = "demo-stats";

/**
 * @description Palette tag for the demo list component.
 * @summary Identifies the {@link DemoList} renderer in the dashboard component
 * registry used by the builder demo.
 * @memberOf module:for-react.demo
 */
export const DEMO_LIST_TAG = "demo-list";

/**
 * @description Palette tag for the demo note component.
 * @summary Identifies the {@link DemoNote} renderer in the dashboard component
 * registry used by the builder demo.
 * @memberOf module:for-react.demo
 */
export const DEMO_NOTE_TAG = "demo-note";

/**
 * @description Props accepted by the demo stat card.
 * @summary Supplies the card heading and the value it displays.
 * @memberOf module:for-react.demo
 */
export interface DemoStatsProps {
  title?: string;
  value?: string;
}

/**
 * @description Minimal stat card used by the dashboard-builder demo palette.
 * @summary Renders a title/value pair so the builder can demonstrate a
 * registered custom component.
 * @param {DemoStatsProps} props - The card heading and value.
 * @returns {React.ReactElement} The rendered stat card.
 * @memberOf module:for-react.demo
 */
export function DemoStats({ title = "", value = "0" }: DemoStatsProps) {
  return (
    <div className="demo-stat">
      <span className="demo-stat__title">{title || "—"}</span>
      <span className="demo-stat__value">{value}</span>
    </div>
  );
}

/**
 * @description Props accepted by the demo list card.
 * @summary Supplies the list heading and the items to render.
 * @memberOf module:for-react.demo
 */
export interface DemoListProps {
  title?: string;
  items?: string[];
}

/**
 * @description Minimal list card used by the dashboard-builder demo palette.
 * @summary Renders a titled bullet list so the builder can demonstrate a
 * registered custom component.
 * @param {DemoListProps} props - The list heading and items.
 * @returns {React.ReactElement} The rendered list card.
 * @memberOf module:for-react.demo
 */
export function DemoList({ title = "", items = [] }: DemoListProps) {
  return (
    <div className="demo-list">
      <h4 className="demo-list__title">{title || "—"}</h4>
      <ul className="demo-list__items">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @description Props accepted by the demo note card.
 * @summary Supplies the note text the card renders.
 * @memberOf module:for-react.demo
 */
export interface DemoNoteProps {
  note?: string;
}

/**
 * @description Minimal note card used by the dashboard-builder demo palette.
 * @summary Renders a free-text note so the builder can demonstrate a registered
 * custom component.
 * @param {DemoNoteProps} props - The note text.
 * @returns {React.ReactElement} The rendered note card.
 * @memberOf module:for-react.demo
 */
export function DemoNote({ note = "" }: DemoNoteProps) {
  return (
    <div className="demo-note">
      <p className="demo-note__text">{note || "—"}</p>
    </div>
  );
}

/**
 * @description Palette exposed by the dashboard-builder demo.
 * @summary Maps the three demo components to their palette entries, labels and
 * default grid sizes so they can be dropped onto the builder canvas.
 * @memberOf module:for-react.demo
 */
export const demoDashboardPalette: DashPaletteEntry[] = [
  {
    tag: DEMO_STATS_TAG,
    labelKey: "dashboard.demo.stats",
    defaultSize: { cols: 2, rows: 1 },
    config: { title: "Revenue", value: "$12,480" },
  },
  {
    tag: DEMO_LIST_TAG,
    labelKey: "dashboard.demo.list",
    defaultSize: { cols: 2, rows: 2 },
    config: { title: "Top items", items: ["Alpha", "Bravo", "Charlie"] },
  },
  {
    tag: DEMO_NOTE_TAG,
    labelKey: "dashboard.demo.note",
    defaultSize: { cols: 1, rows: 1 },
    config: { note: "Remember to review the composition." },
  },
];

let registered = false;

/**
 * @description Registers the demo dashboard components with the React
 * component registry.
 * @summary Idempotently registers {@link DemoStats}, {@link DemoList} and
 * {@link DemoNote} under their palette tags so the builder can resolve them.
 * @returns {void}
 * @memberOf module:for-react.demo
 */
export function registerDemoDashboardComponents(): void {
  if (registered) return;
  RgxComponentRegistry.register(DEMO_STATS_TAG, DemoStats);
  RgxComponentRegistry.register(DEMO_LIST_TAG, DemoList);
  RgxComponentRegistry.register(DEMO_NOTE_TAG, DemoNote);
  registered = true;
}
