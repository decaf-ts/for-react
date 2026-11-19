import {
  addGanttDays,
  ganttDependencyType,
  startOfGanttDay,
  normalizeGanttDate,
  type GanttConfig,
  type GanttDependencyType,
  type GanttModelIssue,
  type GanttViewScale,
} from "./gantt.types.js";

/**
 * @description Origin record attached to every projected renderer task.
 * @summary Lets event handlers and imperative calls resolve the host task
 * without re-projecting the model, while still knowing the configured id and
 * whether the task renders as a milestone marker.
 * @interface GanttTaskOrigin
 * @template T Host task type rendered on the timeline.
 * @property {T} task - The original host task the renderer row was projected from.
 * @property {string} taskId - Configured {@link GanttConfig.id} of the task.
 * @property {boolean} milestone - Whether the task renders as a milestone marker.
 * @memberOf module:for-react.gantt
 */
export interface GanttTaskOrigin<T> {
  readonly task: T;
  readonly taskId: string;
  readonly milestone: boolean;
}

/**
 * @description Flat task record consumed by the dhtmlx-gantt Community renderer.
 * @summary The renderer only understands plain objects with vendor field names;
 * {@link buildGanttMapping} projects the host model into this shape. Missing
 * dates set `hide_bar` so invalid tasks stay in the grid instead of being drawn
 * on the wrong days.
 * @interface GanttDataTask
 * @property {string} id - Stable task id; equals the configured id.
 * @property {string} text - Title shown in the side grid and bar label.
 * @property {Date} [start_date] - Start instant, when the task has readable dates.
 * @property {Date} [end_date] - End instant, when the task has readable dates.
 * @property {number} [duration] - Duration in days; `0` for milestones.
 * @property {number} [progress] - Completion ratio between 0 and 1, when valid.
 * @property {string} [parent] - Parent task id for hierarchical grouping.
 * @property {string} type - Renderer row kind: `"task"`, `"project"` or `"milestone"`.
 * @property {boolean} open - Whether the tree row starts expanded.
 * @property {string} [color] - Optional bar color overriding the theme.
 * @property {boolean} editable - Whether the task may be dragged or resized.
 * @property {boolean} readonly - Renderer mirror of `!editable`.
 * @property {boolean} [hide_bar] - Hides the bar when the task has no usable dates.
 * @memberOf module:for-react.gantt
 */
export interface GanttDataTask {
  readonly id: string;
  readonly text: string;
  readonly start_date?: Date;
  readonly end_date?: Date;
  readonly duration?: number;
  readonly progress?: number;
  readonly parent?: string;
  readonly type: "task" | "project" | "milestone";
  readonly open: boolean;
  readonly color?: string;
  readonly editable: boolean;
  readonly readonly: boolean;
  readonly hide_bar?: boolean;
}

/**
 * @description Dependency link consumed by the dhtmlx-gantt Community renderer.
 * @summary One row per accepted predecessor relation. Links are generated with
 * deterministic ids so renderer refreshes can tell whether the graph changed.
 * @interface GanttDataLink
 * @property {string} id - Deterministic link id in the form `<source>-><target>#<index>`.
 * @property {string} source - Id of the predecessor task.
 * @property {string} target - Id of the successor task.
 * @property {GanttDependencyType} type - Dependency semantics between both tasks.
 * @memberOf module:for-react.gantt
 */
export interface GanttDataLink {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type: GanttDependencyType;
}

/**
 * @description A host task projected onto the timeline.
 * @summary Pairs the flat renderer record with the original host task plus the
 * normalized values derived during projection, so event handlers, templates
 * and the component never have to re-read the host model.
 * @interface GanttMappedTask
 * @template T Host task type rendered on the timeline.
 * @property {GanttDataTask} data - Flat record handed to the renderer.
 * @property {T} task - The original host task.
 * @property {string} taskId - Configured task id.
 * @property {string} title - Resolved display title; falls back to the id.
 * @property {boolean} milestone - Whether the task renders as a milestone marker.
 * @property {Date} [start] - Normalized start instant, or `null` when unreadable.
 * @property {Date} [end] - Normalized end instant, or `null` when unreadable.
 * @property {number} [progress] - Completion ratio between 0 and 1, or `null`.
 * @property {boolean} editable - Effective editability after the global flags.
 * @property {string} [tooltip] - Resolved tooltip text, or `null`.
 * @property {string} [parentId] - Effective parent id after cycle/unknown-parent filtering.
 * @property {boolean} hasChildren - Whether at least one task uses this task as parent.
 * @memberOf module:for-react.gantt
 */
export interface GanttMappedTask<T> {
  readonly data: GanttDataTask;
  readonly task: T;
  readonly taskId: string;
  readonly title: string;
  readonly milestone: boolean;
  readonly start: Date | null;
  readonly end: Date | null;
  readonly progress: number | null;
  readonly editable: boolean;
  readonly tooltip: string | null;
  readonly parentId: string | null;
  readonly hasChildren: boolean;
}

/**
 * @description Outcome of projecting the host model onto the timeline.
 * @summary Carries the flat renderer payload, an id-indexed lookup for event
 * resolution, the dependency graph actually drawn (cycles removed), and the
 * derived timeline bounds used when the host does not request explicit dates.
 * @interface GanttMappingResult
 * @template T Host task type rendered on the timeline.
 * @property {GanttDataTask[]} tasks - Renderer tasks in source order.
 * @property {GanttDataLink[]} links - Accepted dependency links.
 * @property {Map<string, GanttMappedTask<T>>} byId - Lookup from task id to its projected form.
 * @property {Map<string, Object[]>} dependencies - Per-task accepted dependencies used to draw links.
 * @property {number} taskCount - Number of tasks with a usable unique id.
 * @property {boolean} hasValidTasks - Whether at least one task has readable dates.
 * @property {Date} [timelineStart] - Derived timeline start (one day before the earliest task), or `null`.
 * @property {Date} [timelineEnd] - Derived timeline end (one day after the latest task), or `null`.
 * @memberOf module:for-react.gantt
 */
export interface GanttMappingResult<T> {
  readonly tasks: readonly GanttDataTask[];
  readonly links: readonly GanttDataLink[];
  readonly byId: ReadonlyMap<string, GanttMappedTask<T>>;
  readonly dependencies: ReadonlyMap<
    string,
    readonly { id: string; type: GanttDependencyType }[]
  >;
  readonly taskCount: number;
  readonly hasValidTasks: boolean;
  readonly timelineStart: Date | null;
  readonly timelineEnd: Date | null;
}

/**
 * @description Options controlling how the host model is projected onto the timeline.
 * @summary `draggable` folds the component-level edit flags into per-task
 * editability; `revision` lets callers force a re-projection when their task
 * objects mutate in place.
 * @interface GanttMappingOptions
 * @property {boolean} draggable - Whether task bars may be moved/resized.
 * @property {number} [revision] - Opaque change counter that invalidates cached projections.
 * @memberOf module:for-react.gantt
 */
export interface GanttMappingOptions {
  readonly draggable: boolean;
  readonly revision?: number;
}

/**
 * @description dhtmlx-gantt link type codes.
 * @summary The Community renderer stores these strings in `config.links`;
 * keeping our own mapping makes the facade independent of the vendor defaults.
 * Bare dependencies default to `fs`, the `"0"` code.
 * @constant
 * @type {Object}
 * @property {string} fs - Finish-to-start code (`"0"`).
 * @property {string} ss - Start-to-start code (`"1"`).
 * @property {string} ff - Finish-to-finish code (`"2"`).
 * @property {string} sf - Start-to-finish code (`"3"`).
 * @memberOf module:for-react.gantt
 */
export const GANTT_LINK_TYPES: Record<GanttDependencyType, string> = {
  fs: "0",
  ss: "1",
  ff: "2",
  sf: "3",
};

/**
 * @description Minimal structural scale descriptor accepted by the renderer.
 * @summary One row of a timeline header. `unit` is a dhtmlx-gantt scale unit
 * and `format` is either a `date_to_str` template or a formatter callback.
 * @interface GanttScaleDefinition
 * @property {string} unit - Renderer scale unit, such as `"day"`, `"week"` or `"month"`.
 * @property {number} [step] - Number of units per cell; defaults to the renderer value.
 * @property {(string|function(Date): string)} [format] - Cell label template or formatter.
 * @property {(string|function(Date): string)} [date] - Optional cell date formatter.
 * @memberOf module:for-react.gantt
 */
export interface GanttScaleDefinition {
  readonly unit: string;
  readonly step?: number;
  readonly format?: string | ((date: Date) => string);
  readonly date?: string | ((date: Date) => string);
}

/**
 * @description Maps a facade view scale onto the dhtmlx-gantt scale configuration.
 * @summary Each facade scale expands into one or two renderer header rows; for
 * example `week` renders a month row above a week row, while `quarter` derives
 * its label from the month index.
 * @param {GanttViewScale} scale - Facade scale selected by the toolbar.
 * @returns {GanttScaleDefinition[]} Renderer scale rows, coarsest first.
 * @memberOf module:for-react.gantt
 */
export function ganttScales(
  scale: GanttViewScale,
): readonly GanttScaleDefinition[] {
  switch (scale) {
    case "day":
      return [
        { unit: "month", format: "%F %Y" },
        { unit: "day", step: 1, format: "%d" },
      ];
    case "week":
      return [
        { unit: "month", format: "%F %Y" },
        { unit: "week", format: "%d %M" },
      ];
    case "quarter":
      return [
        { unit: "year", format: "%Y" },
        {
          unit: "quarter",
          format: (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1}`,
        },
      ];
    case "year":
      return [{ unit: "year", format: "%Y" }];
    case "month":
    default:
      return [
        { unit: "year", format: "%Y" },
        { unit: "month", format: "%F" },
      ];
  }
}

/**
 * @description Maps a facade dependency type onto the renderer link code.
 * @summary Looks the type up in {@link GANTT_LINK_TYPES}; every
 * {@link GanttDependencyType} has a code, so the lookup never falls back.
 * @param {GanttDependencyType} type - Facade dependency semantics.
 * @returns {string} The dhtmlx-gantt link code for the type.
 * @memberOf module:for-react.gantt
 */
export function ganttLinkType(type: GanttDependencyType): string {
  return GANTT_LINK_TYPES[type];
}

function isProgress(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

/**
 * @description Validates the host model and projects it into flat renderer tasks plus links.
 * @summary Drops tasks without a usable unique id, resolves effective parents
 * (ignoring self/unknown parents and parent cycles), removes self/unknown/cyclic
 * dependencies, normalizes dates and progress, computes milestone/project row
 * types, and derives padded timeline bounds. Invalid values are reported through
 * the result instead of throwing so the renderer never lies about broken data.
 * @param {T[]} tasks - Host task list to project.
 * @param {GanttConfig} config - Configuration projecting the tasks.
 * @param {GanttMappingOptions} options - Projection options, including editability.
 * @returns {GanttMappingResult} Projected tasks, links, lookups and timeline bounds.
 * @template T Host task type rendered on the timeline.
 * @memberOf module:for-react.gantt
 */
export function buildGanttMapping<T>(
  tasks: readonly T[],
  config: GanttConfig<T>,
  options: GanttMappingOptions,
): GanttMappingResult<T> {
  const taskById = new Map<string, T>();
  const order: string[] = [];

  for (const task of tasks) {
    const id = String(config.id(task) ?? "").trim();
    if (!id || taskById.has(id)) continue;
    taskById.set(id, task);
    order.push(id);
  }

  const parentOf = new Map<string, string>();
  const effectiveParent = (id: string): string | undefined => {
    const task = taskById.get(id) as T;
    const raw = config.parent?.(task);
    if (raw === null || raw === undefined) return undefined;
    const parentId = String(raw).trim();
    if (!parentId || parentId === id || !taskById.has(parentId)) {
      return undefined;
    }

    const seen = new Set<string>([id]);
    let cursor: string | undefined = parentId;
    while (cursor) {
      if (seen.has(cursor)) return undefined;
      seen.add(cursor);
      const parentTask = taskById.get(cursor);
      if (!parentTask) return undefined;
      const next = config.parent?.(parentTask);
      cursor =
        next === null || next === undefined
          ? undefined
          : String(next).trim() || undefined;
    }
    return parentId;
  };

  for (const id of order) {
    const parentId = effectiveParent(id);
    if (parentId) parentOf.set(id, parentId);
  }

  const dependencies = new Map<
    string,
    { id: string; type: GanttDependencyType }[]
  >();
  for (const id of order) {
    const task = taskById.get(id) as T;
    const normalized: { id: string; type: GanttDependencyType }[] = [];
    for (const entry of config.dependencies?.(task) ?? []) {
      const dependency = ganttDependencyType(entry);
      if (!dependency) continue;
      if (dependency.id === id || !taskById.has(dependency.id)) continue;
      if (typeof entry === "object" && entry !== null && entry.type) {
        if (!(entry.type in GANTT_LINK_TYPES)) continue;
      }
      normalized.push(dependency);
    }
    dependencies.set(id, normalized);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const allowedDependencies = new Map<
    string,
    { id: string; type: GanttDependencyType }[]
  >();

  const collectDependencies = (id: string): void => {
    if (visited.has(id)) return;
    visiting.add(id);
    const allowed: { id: string; type: GanttDependencyType }[] = [];
    for (const dependency of dependencies.get(id) ?? []) {
      if (visiting.has(dependency.id)) continue;
      if (!visited.has(dependency.id)) collectDependencies(dependency.id);
      allowed.push(dependency);
    }
    visiting.delete(id);
    visited.add(id);
    allowedDependencies.set(id, allowed);
  };

  for (const id of order) {
    if (!visited.has(id)) collectDependencies(id);
  }

  const childCount = new Map<string, number>();
  for (const parentId of parentOf.values()) {
    childCount.set(parentId, (childCount.get(parentId) ?? 0) + 1);
  }

  const mappedById = new Map<string, GanttMappedTask<T>>();
  const dataById = new Map<string, GanttDataTask>();
  const issues: GanttModelIssue[] = [];
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;

  for (const id of order) {
    const task = taskById.get(id) as T;
    const title = String(config.title(task) ?? id);
    const milestone = Boolean(config.milestone?.(task));
    let start = normalizeGanttDate(config.start(task));
    let end = normalizeGanttDate(config.end(task));

    if (!start || !end) {
      issues.push({
        code: "invalid-date",
        taskId: id,
        detail: `Task "${id}" has an unreadable start or end date.`,
      });
      start = null;
      end = null;
    } else if (end.getTime() < start.getTime()) {
      issues.push({
        code: "invalid-date",
        taskId: id,
        detail: `Task "${id}" ends before it starts.`,
      });
      start = null;
      end = null;
    } else if (milestone) {
      end = start;
    }

    if (start && end) {
      if (!minStart || start.getTime() < minStart.getTime()) minStart = start;
      if (!maxEnd || end.getTime() > maxEnd.getTime()) maxEnd = end;
    }

    const rawProgress = config.progress?.(task);
    const progress = isProgress(rawProgress) ? rawProgress : null;
    if (
      rawProgress !== null &&
      rawProgress !== undefined &&
      progress === null
    ) {
      issues.push({
        code: "invalid-progress",
        taskId: id,
        detail: `Task "${id}" progress must be between 0 and 1.`,
      });
    }

    const color = config.color?.(task);
    const tooltip = config.tooltip?.(task);
    const editable = options.draggable && (config.editable?.(task) ?? true);
    const parentId = parentOf.get(id) ?? null;
    const hasChildren = (childCount.get(id) ?? 0) > 0;
    const type = milestone
      ? "milestone"
      : hasChildren
        ? "project"
        : "task";

    const data: GanttDataTask = {
      id,
      text: title,
      type,
      open: true,
      editable,
      readonly: !editable,
      ...(parentId ? { parent: parentId } : {}),
      ...(progress !== null ? { progress } : {}),
      ...(color ? { color } : {}),
      ...(start && end
        ? milestone
          ? { start_date: start, end_date: start, duration: 0 }
          : { start_date: start, end_date: end }
        : { hide_bar: true }),
    };

    dataById.set(id, data);
    mappedById.set(id, {
      data,
      task,
      taskId: id,
      title,
      milestone,
      start,
      end,
      progress,
      editable,
      tooltip: tooltip === null || tooltip === undefined ? null : String(tooltip),
      parentId,
      hasChildren,
    });
  }

  const links: GanttDataLink[] = [];
  for (const id of order) {
    const successor = mappedById.get(id);
    if (!successor || !successor.start || !successor.end) continue;
    let index = 0;
    for (const dependency of allowedDependencies.get(id) ?? []) {
      const predecessor = mappedById.get(dependency.id);
      if (!predecessor || !predecessor.start || !predecessor.end) continue;
      links.push({
        id: `${dependency.id}->${id}#${index}`,
        source: dependency.id,
        target: id,
        type: dependency.type,
      });
      index += 1;
    }
  }

  const timelineStart = minStart
    ? addGanttDays(startOfGanttDay(minStart), -1)
    : null;
  const timelineEnd = maxEnd
    ? addGanttDays(startOfGanttDay(maxEnd), 1)
    : null;

  return {
    tasks: order.map((id) => dataById.get(id) as GanttDataTask),
    links,
    byId: mappedById,
    dependencies: allowedDependencies,
    taskCount: order.length,
    hasValidTasks: Boolean(minStart && maxEnd),
    timelineStart,
    timelineEnd,
  };
}
