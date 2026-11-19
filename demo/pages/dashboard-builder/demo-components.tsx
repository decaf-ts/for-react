import React from "react";
import { DashPaletteEntry, RgxComponentRegistry } from "../../../src/lib";

export const DEMO_STATS_TAG = "demo-stats";
export const DEMO_LIST_TAG = "demo-list";
export const DEMO_NOTE_TAG = "demo-note";

export interface DemoStatsProps {
  title?: string;
  value?: string;
}

export function DemoStats({ title = "", value = "0" }: DemoStatsProps) {
  return (
    <div className="demo-stat">
      <span className="demo-stat__title">{title || "—"}</span>
      <span className="demo-stat__value">{value}</span>
    </div>
  );
}

export interface DemoListProps {
  title?: string;
  items?: string[];
}

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

export interface DemoNoteProps {
  note?: string;
}

export function DemoNote({ note = "" }: DemoNoteProps) {
  return (
    <div className="demo-note">
      <p className="demo-note__text">{note || "—"}</p>
    </div>
  );
}

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

export function registerDemoDashboardComponents(): void {
  if (registered) return;
  RgxComponentRegistry.register(DEMO_STATS_TAG, DemoStats);
  RgxComponentRegistry.register(DEMO_LIST_TAG, DemoList);
  RgxComponentRegistry.register(DEMO_NOTE_TAG, DemoNote);
  registered = true;
}
