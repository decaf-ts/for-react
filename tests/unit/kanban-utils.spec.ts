/**
 * @module for-react/kanban-utils.spec
 * @summary SAA-2010 — unit contract for the React `/kanban` helpers
 * (SAA-2009 / DECAF-895), mirroring the Angular `kanban-board.utils` contract.
 * @description Covers the framework-free surface of the board:
 *
 * - `clamp` bounds handling;
 * - `groupByStatus` column order, empty buckets and unknown-status rejection;
 * - `applyFilter` column preservation and copy semantics;
 * - `applyPreview` same-column, cross-column and missing-task behaviour;
 * - `resolveMoveIndices` same-column/cross-column resolution against filtered
 *   source and target lists, including the `null` invalid-visible-index paths;
 * - `kanbanConfigFromFields` incl. swimlane and null/undefined stringification;
 * - droppable/card dnd-id construction and round-tripping.
 */
import type { KanbanConfig, KanbanFieldMap } from "../../src/kanban/kanban.types";
import {
  applyFilter,
  applyPreview,
  clamp,
  groupByStatus,
  kanbanCardDndId,
  kanbanColumnDroppableId,
  kanbanColumnIdFromDroppableId,
  resolveMoveIndices,
  type KanbanPreview,
} from "../../src/kanban/kanban.utils";
import { kanbanConfigFromFields } from "../../src/kanban/kanban.types";

interface Task {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  lane?: string | null;
}

const COLUMNS = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "In progress" },
  { id: "done", title: "Done" },
];

const CONFIG: KanbanConfig<Task> = {
  id: (task) => task.id,
  title: (task) => task.title,
  status: (task) => task.status,
  columns: COLUMNS,
};

const idOf = (task: Task): string => task.id;

function task(id: string, status = "todo", extra: Partial<Task> = {}): Task {
  return { id, title: `Task ${id}`, status, ...extra };
}

function preview(
  overrides: Partial<KanbanPreview<Task>> & Pick<KanbanPreview<Task>, "task">
): KanbanPreview<Task> {
  return {
    taskId: overrides.task.id,
    fromColumn: "todo",
    toColumn: "todo",
    fromVisibleIndex: 0,
    toVisibleIndex: 0,
    ...overrides,
  };
}

describe("kanban.utils", () => {
  describe("clamp", () => {
    it("returns the value when it is inside the bounds", () => {
      expect(clamp(0, 0, 3)).toBe(0);
      expect(clamp(2, 0, 3)).toBe(2);
      expect(clamp(3, 0, 3)).toBe(3);
      expect(clamp(-4, -5, -1)).toBe(-4);
    });

    it("clamps below the minimum and above the maximum", () => {
      expect(clamp(-1, 0, 3)).toBe(0);
      expect(clamp(9, 0, 3)).toBe(3);
      expect(clamp(Number.NEGATIVE_INFINITY, 0, 3)).toBe(0);
      expect(clamp(Number.POSITIVE_INFINITY, 0, 3)).toBe(3);
    });

    it("collapses an inverted range to the maximum", () => {
      expect(clamp(5, 4, 2)).toBe(2);
    });
  });

  describe("groupByStatus", () => {
    it("creates an empty bucket for every configured column in order", () => {
      const grouped = groupByStatus([], CONFIG);

      expect([...grouped.keys()]).toEqual(["todo", "doing", "done"]);
      for (const column of COLUMNS) {
        expect(grouped.get(column.id)).toEqual([]);
      }
    });

    it("groups items while preserving host order inside each bucket", () => {
      const items = [
        task("a", "todo"),
        task("b", "doing"),
        task("c", "todo"),
        task("d", "done"),
        task("e", "doing"),
      ];

      const grouped = groupByStatus(items, CONFIG);

      expect(grouped.get("todo")?.map(idOf)).toEqual(["a", "c"]);
      expect(grouped.get("doing")?.map(idOf)).toEqual(["b", "e"]);
      expect(grouped.get("done")?.map(idOf)).toEqual(["d"]);
    });

    it("ignores items whose status is not a configured column", () => {
      const grouped = groupByStatus(
        [
          task("ok", "todo"),
          task("unknown", "archived"),
          task("empty-status", ""),
        ],
        CONFIG
      );

      expect(grouped.get("todo")?.map(idOf)).toEqual(["ok"]);
      expect(grouped.has("archived")).toBe(false);
      expect([...grouped.values()].flat().map(idOf)).toEqual(["ok"]);
    });

    it("keeps a single bucket for duplicate status ids", () => {
      const duplicateColumns = [
        { id: "todo", title: "First" },
        { id: "todo", title: "Second" },
        { id: "done", title: "Done" },
      ];
      const grouped = groupByStatus([task("a", "todo")], {
        ...CONFIG,
        columns: duplicateColumns,
      });

      expect([...grouped.keys()]).toEqual(["todo", "done"]);
      expect(grouped.get("todo")?.map(idOf)).toEqual(["a"]);
    });
  });

  describe("applyFilter", () => {
    const items = [
      task("a", "todo", { assignee: "Ada" }),
      task("b", "todo", { assignee: "Grace" }),
      task("c", "doing", { assignee: "Ada" }),
      task("d", "done", { assignee: "Linus" }),
    ];

    it("filters each bucket and keeps every column present", () => {
      const filtered = applyFilter(
        groupByStatus(items, CONFIG),
        (item) => item.assignee === "Ada"
      );

      expect([...filtered.keys()]).toEqual(["todo", "doing", "done"]);
      expect(filtered.get("todo")?.map(idOf)).toEqual(["a"]);
      expect(filtered.get("doing")?.map(idOf)).toEqual(["c"]);
      expect(filtered.get("done")).toEqual([]);
    });

    it("returns independent copies when no filter is supplied", () => {
      const grouped = groupByStatus(items, CONFIG);
      const filtered = applyFilter(grouped, null);

      expect([...filtered.keys()]).toEqual([...grouped.keys()]);
      for (const columnId of grouped.keys()) {
        expect(filtered.get(columnId)).toEqual(grouped.get(columnId));
        expect(filtered.get(columnId)).not.toBe(grouped.get(columnId));
      }
    });

    it("keeps an empty source bucket empty", () => {
      const filtered = applyFilter(groupByStatus([], CONFIG), () => true);

      expect([...filtered.keys()]).toEqual(["todo", "doing", "done"]);
      expect([...filtered.values()].every((bucket) => bucket.length === 0)).toBe(
        true
      );
    });
  });

  describe("applyPreview", () => {
    it("returns an equivalent copy when there is no preview", () => {
      const grouped = groupByStatus(
        [task("a", "todo"), task("b", "doing")],
        CONFIG
      );
      const result = applyPreview(grouped, null, idOf);

      expect([...result.keys()]).toEqual([...grouped.keys()]);
      expect(result).not.toBe(grouped);
      for (const columnId of grouped.keys()) {
        expect(result.get(columnId)).toEqual(grouped.get(columnId));
      }
    });

    it("moves a card within the same column to the previewed index", () => {
      const grouped = groupByStatus(
        [task("a", "todo"), task("b", "todo"), task("c", "todo")],
        CONFIG
      );
      const moved = applyPreview(
        grouped,
        preview({ task: grouped.get("todo")![0], toVisibleIndex: 2 }),
        idOf
      );

      expect(moved.get("todo")?.map(idOf)).toEqual(["b", "c", "a"]);
      // The source map is not mutated.
      expect(grouped.get("todo")?.map(idOf)).toEqual(["a", "b", "c"]);
    });

    it("moves a card across columns at the previewed index", () => {
      const grouped = groupByStatus(
        [
          task("a", "todo"),
          task("b", "todo"),
          task("x", "doing"),
          task("y", "doing"),
        ],
        CONFIG
      );
      const moved = applyPreview(
        grouped,
        preview({
          task: grouped.get("todo")![0],
          fromColumn: "todo",
          toColumn: "doing",
          toVisibleIndex: 1,
        }),
        idOf
      );

      expect(moved.get("todo")?.map(idOf)).toEqual(["b"]);
      expect(moved.get("doing")?.map(idOf)).toEqual(["x", "a", "y"]);
    });

    it("clamps an out-of-range preview index to the target length", () => {
      const grouped = groupByStatus(
        [task("a", "todo"), task("b", "todo"), task("x", "doing")],
        CONFIG
      );
      const moved = applyPreview(
        grouped,
        preview({
          task: grouped.get("todo")![0],
          fromColumn: "todo",
          toColumn: "doing",
          toVisibleIndex: 99,
        }),
        idOf
      );

      expect(moved.get("doing")?.map(idOf)).toEqual(["x", "a"]);
    });

    it("leaves the map unchanged when the previewed task is not in the source", () => {
      const grouped = groupByStatus([task("a", "todo")], CONFIG);
      const moved = applyPreview(
        grouped,
        preview({ task: task("missing"), taskId: "missing" }),
        idOf
      );

      expect(moved.get("todo")?.map(idOf)).toEqual(["a"]);
      expect(moved.get("doing")).toEqual([]);
    });

    it("ignores the fromVisibleIndex and locates the task by id", () => {
      const grouped = groupByStatus(
        [task("a", "todo"), task("b", "todo")],
        CONFIG
      );
      const moved = applyPreview(
        grouped,
        preview({
          task: grouped.get("todo")![1],
          fromVisibleIndex: 0,
          toVisibleIndex: 0,
        }),
        idOf
      );

      expect(moved.get("todo")?.map(idOf)).toEqual(["b", "a"]);
    });
  });

  describe("resolveMoveIndices", () => {
    it("resolves a downward same-column reorder", () => {
      const full = [task("a"), task("b"), task("c")];

      const resolved = resolveMoveIndices(
        full[0],
        "todo",
        "todo",
        0,
        2,
        full,
        full,
        full,
        full,
        idOf
      );

      expect(resolved).toEqual({ previousIndex: 0, currentIndex: 2 });
    });

    it("resolves an upward same-column reorder", () => {
      const full = [task("a"), task("b"), task("c")];

      const resolved = resolveMoveIndices(
        full[2],
        "todo",
        "todo",
        2,
        0,
        full,
        full,
        full,
        full,
        idOf
      );

      expect(resolved).toEqual({ previousIndex: 2, currentIndex: 0 });
    });

    it("returns the original position for an unchanged or negative move", () => {
      const full = [task("a"), task("b"), task("c")];

      expect(
        resolveMoveIndices(full[1], "todo", "todo", 1, 1, full, full, full, full, idOf)
      ).toEqual({ previousIndex: 1, currentIndex: 1 });
      expect(
        resolveMoveIndices(full[1], "todo", "todo", 1, -1, full, full, full, full, idOf)
      ).toEqual({ previousIndex: 1, currentIndex: 1 });
    });

    it("honours filtered visible neighbours when reordering the source", () => {
      const full = [task("a"), task("b"), task("c")];
      const visible = [full[0], full[2]];

      const resolved = resolveMoveIndices(
        full[2],
        "todo",
        "todo",
        1,
        0,
        full,
        full,
        visible,
        visible,
        idOf
      );

      expect(resolved).toEqual({ previousIndex: 2, currentIndex: 0 });
    });

    it("resolves a cross-column move before a visible target card", () => {
      const fullSource = [task("a", "todo"), task("b", "todo")];
      const fullTarget = [task("x", "doing"), task("y", "doing")];

      const resolved = resolveMoveIndices(
        fullSource[0],
        "todo",
        "doing",
        0,
        1,
        fullSource,
        fullTarget,
        fullSource,
        fullTarget,
        idOf
      );

      expect(resolved).toEqual({ previousIndex: 0, currentIndex: 1 });
    });

    it("appends a cross-column move when the visible index is at the end", () => {
      const fullSource = [task("a", "todo")];
      const fullTarget = [task("x", "doing"), task("y", "doing")];

      const resolved = resolveMoveIndices(
        fullSource[0],
        "todo",
        "doing",
        0,
        2,
        fullSource,
        fullTarget,
        fullSource,
        fullTarget,
        idOf
      );

      expect(resolved).toEqual({ previousIndex: 0, currentIndex: 2 });
    });

    it("maps a filtered target position back to the full target index", () => {
      const fullSource = [task("a", "todo")];
      const fullTarget = [
        task("x", "doing"),
        task("hidden", "doing"),
        task("y", "doing"),
      ];
      const visibleTarget = [fullTarget[0], fullTarget[2]];

      const resolved = resolveMoveIndices(
        fullSource[0],
        "todo",
        "doing",
        0,
        1,
        fullSource,
        fullTarget,
        fullSource,
        visibleTarget,
        idOf
      );

      // Hidden task sits between x and y in the full list.
      expect(resolved).toEqual({ previousIndex: 0, currentIndex: 2 });
    });

    it("inserts after the visible predecessor when appending past a filtered target", () => {
      const fullSource = [task("a", "todo")];
      const fullTarget = [
        task("x", "doing"),
        task("hidden", "doing"),
        task("y", "doing"),
      ];
      const visibleTarget = [fullTarget[0], fullTarget[2]];

      const resolved = resolveMoveIndices(
        fullSource[0],
        "todo",
        "doing",
        0,
        2,
        fullSource,
        fullTarget,
        fullSource,
        visibleTarget,
        idOf
      );

      expect(resolved).toEqual({ previousIndex: 0, currentIndex: 3 });
    });

    it("returns null when the task is not in the full source", () => {
      const fullSource = [task("a", "todo")];
      const fullTarget = [task("x", "doing")];

      expect(
        resolveMoveIndices(
          task("missing", "todo"),
          "todo",
          "doing",
          0,
          0,
          fullSource,
          fullTarget,
          fullSource,
          fullTarget,
          idOf
        )
      ).toBeNull();
    });

    it("returns null for an invalid visible source index", () => {
      const full = [task("a"), task("b")];

      expect(
        resolveMoveIndices(full[0], "todo", "todo", -1, 0, full, full, full, full, idOf)
      ).toBeNull();
      expect(
        resolveMoveIndices(full[0], "todo", "todo", 2, 0, full, full, full, full, idOf)
      ).toBeNull();
    });

    it("returns null when the visible source index points at another card", () => {
      const full = [task("a"), task("b"), task("c")];
      const visible = [full[0], full[2]];

      expect(
        resolveMoveIndices(full[0], "todo", "todo", 1, 0, full, full, visible, visible, idOf)
      ).toBeNull();
    });

    it("returns null on invalid input for a cross-column move as well", () => {
      const fullSource = [task("a", "todo")];
      const fullTarget = [task("x", "doing")];

      expect(
        resolveMoveIndices(
          fullSource[0],
          "todo",
          "doing",
          1,
          0,
          fullSource,
          fullTarget,
          fullSource,
          fullTarget,
          idOf
        )
      ).toBeNull();
    });
  });

  describe("droppable and card dnd ids", () => {
    it("builds the column droppable id from the instance and column", () => {
      expect(kanbanColumnDroppableId("kb-1", "todo")).toBe("kb-1-todo-drop");
      expect(kanbanColumnDroppableId("", "done")).toBe("-done-drop");
    });

    it("round-trips the column id from a droppable id", () => {
      expect(
        kanbanColumnIdFromDroppableId("kb-1", "kb-1-todo-drop")
      ).toBe("todo");
      expect(
        kanbanColumnIdFromDroppableId("kb-1", "kb-1-in-progress-drop")
      ).toBe("in-progress");
    });

    it("returns null for a foreign instance or malformed droppable id", () => {
      expect(kanbanColumnIdFromDroppableId("kb-1", "kb-2-todo-drop")).toBeNull();
      expect(kanbanColumnIdFromDroppableId("kb-1", "kb-1-todo")).toBeNull();
      expect(kanbanColumnIdFromDroppableId("kb-1", "todo-drop")).toBeNull();
      expect(kanbanColumnIdFromDroppableId("kb-1", "")).toBeNull();
    });

    it("builds the card dnd id from the instance and task", () => {
      expect(kanbanCardDndId("kb-1", "task-1")).toBe("kb-1-task-1-card");
      expect(kanbanCardDndId("", "a")).toBe("-a-card");
    });

    it("keeps card and column ids in separate namespaces", () => {
      const cardId = kanbanCardDndId("kb-1", "todo");
      const columnId = kanbanColumnDroppableId("kb-1", "todo");

      expect(cardId).not.toBe(columnId);
      expect(kanbanColumnIdFromDroppableId("kb-1", cardId)).toBeNull();
    });
  });

  describe("kanbanConfigFromFields", () => {
    interface RecordTask {
      key: string;
      name: string;
      state: string;
      lane?: string | null;
      count?: number | null;
    }

    const fields: KanbanFieldMap<RecordTask> = {
      id: "key",
      title: "name",
      status: "state",
    };

    it("maps id, title and status through the configured fields", () => {
      const config = kanbanConfigFromFields(fields, COLUMNS);
      const item: RecordTask = { key: "a", name: "Alpha", state: "doing" };

      expect(config.id(item)).toBe("a");
      expect(config.title(item)).toBe("Alpha");
      expect(config.status(item)).toBe("doing");
      expect(config.columns).toBe(COLUMNS);
      expect(config.swimlane).toBeUndefined();
    });

    it("stringifies numeric and boolean field values", () => {
      const config = kanbanConfigFromFields(
        {
          id: "count" as keyof RecordTask,
          title: "key",
          status: "state",
        },
        COLUMNS
      );
      const item = {
        key: "a",
        name: "Alpha",
        state: "todo",
        count: 7,
      } as unknown as RecordTask;

      expect(config.id(item)).toBe("7");
    });

    it("stringifies null and undefined field values as an empty string", () => {
      const config = kanbanConfigFromFields(fields, COLUMNS);
      const item = {
        key: null,
        name: undefined,
        state: null,
      } as unknown as RecordTask;

      expect(config.id(item)).toBe("");
      expect(config.title(item)).toBe("");
      expect(config.status(item)).toBe("");
    });

    it("maps the optional swimlane field when configured", () => {
      const config = kanbanConfigFromFields(
        { ...fields, swimlane: "lane" },
        COLUMNS
      );

      expect(config.swimlane?.({ key: "a", name: "A", state: "todo", lane: "ops" })).toBe(
        "ops"
      );
      expect(
        config.swimlane?.({ key: "a", name: "A", state: "todo", lane: null })
      ).toBeUndefined();
      expect(
        config.swimlane?.({ key: "a", name: "A", state: "todo" })
      ).toBeUndefined();
    });

    it("stringifies a numeric swimlane value", () => {
      const config = kanbanConfigFromFields(
        { ...fields, swimlane: "count" },
        COLUMNS
      );

      expect(
        config.swimlane?.({
          key: "a",
          name: "A",
          state: "todo",
          count: 3,
        })
      ).toBe("3");
    });

    it("omits swimlane when the field map does not declare one", () => {
      const config = kanbanConfigFromFields(fields, COLUMNS);

      expect("swimlane" in config).toBe(false);
    });
  });
});
