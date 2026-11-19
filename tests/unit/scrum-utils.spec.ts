/**
 * @module for-react/scrum-utils.spec
 * @summary SAA-2042 — unit contract for the framework-free `/scrum` helpers
 * (SAA-2033 / DECAF-895), mirroring the Angular `scrum.types` contract.
 * @description Covers the pure surface of the scrum composition:
 *
 * - `SCRUM_BACKLOG_COLUMN_ID` stays the stable `backlog` column id;
 * - `scrumSprintIdOf` normalizes only `null`, `undefined` and `''` to the
 *   backlog, and never trims or rewrites a real sprint id.
 */
import {
  SCRUM_BACKLOG_COLUMN_ID,
  scrumSprintIdOf,
  type ScrumConfig,
} from "../../src/scrum";

interface Task {
  id: string;
  title: string;
  sprintId: string | null | undefined;
}

function config(sprintId: string | null | undefined): ScrumConfig<Task> {
  return {
    id: (task) => task.id,
    title: (task) => task.title,
    status: () => "todo",
    columns: [{ id: "todo", title: "To do" }],
    sprint: () => sprintId,
  };
}

function item(sprintId: string | null | undefined): Task {
  return { id: "task-1", title: "Task", sprintId };
}

describe("scrum types", () => {
  it("keeps the backlog column id stable", () => {
    expect(SCRUM_BACKLOG_COLUMN_ID).toBe("backlog");
  });

  describe("scrumSprintIdOf", () => {
    it("normalizes null, undefined and the empty string to the backlog", () => {
      expect(scrumSprintIdOf(config(null), item(null))).toBeNull();
      expect(scrumSprintIdOf(config(undefined), item(undefined))).toBeNull();
      expect(scrumSprintIdOf(config(""), item(""))).toBeNull();
    });

    it("returns a real sprint id unchanged", () => {
      expect(scrumSprintIdOf(config("sprint-1"), item("sprint-1"))).toBe(
        "sprint-1"
      );
    });

    it("never trims or rewrites the sprint id", () => {
      expect(scrumSprintIdOf(config("  sprint-1  "), item("  sprint-1  "))).toBe(
        "  sprint-1  "
      );
      expect(scrumSprintIdOf(config("0"), item("0"))).toBe("0");
      expect(scrumSprintIdOf(config("backlog"), item("backlog"))).toBe(
        "backlog"
      );
    });

    it("stringifies a numeric-ish accessor result", () => {
      const numeric = {
        ...config(null),
        sprint: () => 7 as unknown as string,
      } as ScrumConfig<Task>;

      expect(scrumSprintIdOf(numeric, item(null))).toBe("7");
    });

    it("reads the sprint through the supplied config only", () => {
      const sprint = jest.fn(() => "sprint-2");
      const scrum: ScrumConfig<Task> = {
        ...config(null),
        sprint,
      };
      const task = item(null);

      expect(scrumSprintIdOf(scrum, task)).toBe("sprint-2");
      expect(sprint).toHaveBeenCalledWith(task);
    });
  });
});
