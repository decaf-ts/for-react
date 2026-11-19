import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import * as DhtmlxModule from "dhtmlx-gantt";
import type {
  GanttEnterprise,
  GanttLocale,
  GanttStatic,
  Link as VendorLink,
  Task as VendorTask,
} from "dhtmlx-gantt";
import {
  GANTT_VIEW_SCALES,
  addGanttDays,
  ganttDateOnly,
  normalizeGanttDate,
  sameGanttInstant,
  startOfGanttDay,
  toGanttDateRange,
  validateGanttModel,
  type GanttBarTemplateContext,
  type GanttConfig,
  type GanttDateChangeMode,
  type GanttDateChangeReason,
  type GanttDateChangeRejectionReason,
  type GanttDateInput,
  type GanttDependencyType,
  type GanttGridColumn,
  type GanttLocaleInput,
  type GanttModelIssue,
  type GanttProgressChangeReason,
  type GanttProgressChangeRejectionReason,
  type GanttTaskDateChangeEvent,
  type GanttTaskDateChangeRejectedEvent,
  type GanttTaskDateRange,
  type GanttTaskDetailTemplateContext,
  type GanttTaskProgressChangeEvent,
  type GanttTaskProgressChangeRejectedEvent,
  type GanttTaskSelectionEvent,
  type GanttViewScale,
} from "./gantt.types.js";
import {
  buildGanttMapping,
  ganttLinkType,
  ganttScales,
  type GanttMappedTask,
} from "./gantt-mapping.js";

const VIEW_LABELS: Record<GanttViewScale, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

const DEFAULT_KEYBOARD_HELP =
  "Focus a task bar, then press Enter or Space to select, E to edit, Alt+Arrow to move, Alt+Shift+Arrow to resize, or [ and ] to change progress.";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => HTML_ESCAPES[character]
  );
}

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function ganttDayOrdinal(value: Date): number {
  return Math.floor(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000
  );
}

function sameCalendarDay(left: Date, right: Date): boolean {
  return ganttDayOrdinal(left) === ganttDayOrdinal(right);
}

let instanceCounter = 0;

function getGanttFactory(): GanttEnterprise {
  const moduleValue = DhtmlxModule as {
    Gantt?: GanttEnterprise;
    default?: { Gantt?: GanttEnterprise };
  };
  const globalValue = globalThis as {
    Gantt?: GanttEnterprise;
    window?: { Gantt?: GanttEnterprise };
  };
  const factory =
    moduleValue.Gantt ??
    moduleValue.default?.Gantt ??
    globalValue.Gantt ??
    globalValue.window?.Gantt;
  if (!factory || typeof factory.getGanttInstance !== "function") {
    throw new Error(
      "dhtmlx-gantt Community renderer is unavailable in this environment."
    );
  }
  return factory;
}

/**
 * @description Props accepted by {@link Gantt}.
 * @summary Configures the task source, the accessor mapping, the visible
 * timeline window, editing and selection flags, localization, the side grid,
 * custom templates, and the event callbacks. The component is largely
 * controlled: `items` and `config` are the source of truth, accepted changes are
 * reported through callbacks instead of being written back, and `viewType`
 * becomes controlled as soon as it is supplied.
 * @interface GanttProps
 * @template T Host task type rendered on the timeline.
 * @property {T[]} [items=[]] - Host tasks projected onto the timeline.
 * @property {GanttConfig} config - Accessor mapping that projects each task.
 * @property {string} [selectedId=null] - Id of the task to mark as selected.
 * @property {boolean} [readOnly=false] - Renders the timeline read-only; the legacy `readonly` prop is honored as an alias.
 * @property {boolean} [disabled=false] - Disables all interactions and the toolbar.
 * @property {boolean} [loading=false] - Shows the loading state instead of the timeline.
 * @property {string} [error=null] - Error message shown with a retry action; suppresses the timeline.
 * @property {GanttViewScale} [viewType] - Controlled timeline scale; when omitted the component keeps the selected scale internally.
 * @property {GanttDateInput} [start] - Explicit start of the visible window; defaults to one day before the earliest task.
 * @property {GanttDateInput} [end] - Explicit end of the visible window; defaults to one day after the latest task.
 * @property {boolean} [showToolbar=true] - Shows the toolbar with the scale picker.
 * @property {boolean} [draggable=true] - Allows moving and resizing editable tasks.
 * @property {boolean} [selectable=true] - Allows selecting tasks in the renderer.
 * @property {boolean} [showTodayLine=true] - Highlights the current day column.
 * @property {number} [sideWidth=280] - Width of the side grid in pixels.
 * @property {GanttLocaleInput} [locale="en"] - Bundled locale key or custom locale merged over English.
 * @property {string} [label="Gantt"] - Accessible name of the timeline region.
 * @property {string} [emptyLabel="No tasks to display"] - Text shown when there are no tasks.
 * @property {string} [loadingLabel="Loading timeline"] - Text shown while loading.
 * @property {string} [retryLabel="Retry"] - Label of the retry button in the error state.
 * @property {string} [taskColumnLabel] - Overrides the side-grid task column header.
 * @property {string} [progressColumnLabel] - Overrides the side-grid progress column header.
 * @property {string} [toolbarLabel="Timeline scale"] - Accessible name of the scale toolbar.
 * @property {string} [keyboardHelp] - Help text announced for keyboard users.
 * @property {string} [instanceId=null] - Stable DOM instance id; generated when omitted.
 * @property {Object} [viewTypeLabels] - Partial overrides for the scale button labels.
 * @property {GanttGridColumn[]} [columns] - Custom side-grid columns; defaults to task and progress columns. A column `template` is trusted raw dhtmlx markup inserted as-is (never build one from untrusted data), while columns without a `template` fall back to the escaped task-title renderer.
 * @property {string} [className] - Extra CSS classes appended to the host.
 * @property {Object} [style] - Inline styles applied to the host.
 * @property {function(GanttBarTemplateContext): string} [renderBar] - Custom bar label renderer; the returned string is escaped before insertion.
 * @property {function(GanttTaskDetailTemplateContext): React.ReactNode} [renderTaskDetail] - Renders the side detail panel opened by a keyboard/edit request.
 * @property {function(): React.ReactNode} [renderEmpty] - Replaces the default empty state.
 * @property {function(GanttTaskSelectionEvent): void} [onTaskSelected] - Called when a task is selected.
 * @property {function(GanttTaskSelectionEvent): void} [onTaskEditRequested] - Called when a task edit is requested by double click or `E`.
 * @property {function(GanttTaskDateChangeEvent): void} [onTaskDateChanged] - Called after an accepted date change.
 * @property {function(GanttTaskDateChangeRejectedEvent): void} [onTaskDateChangeRejected] - Called when a date change is refused.
 * @property {function(GanttTaskProgressChangeEvent): void} [onTaskProgressChanged] - Called after an accepted progress change.
 * @property {function(GanttTaskProgressChangeRejectedEvent): void} [onTaskProgressChangeRejected] - Called when a progress change is refused.
 * @property {function(GanttModelIssue[]): void} [onModelIssuesChange] - Called with the validation issues found in the task model.
 * @property {function(): void} [onRetryRequested] - Called when the error-state retry button is activated.
 * @property {function(GanttViewScale): void} [onViewTypeChange] - Called when the user picks another scale.
 * @memberOf module:for-react.gantt
 */
export interface GanttProps<T = unknown> {
  items?: readonly T[];
  config: GanttConfig<T>;
  selectedId?: string | null;
  readOnly?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  viewType?: GanttViewScale;
  start?: GanttDateInput | null;
  end?: GanttDateInput | null;
  showToolbar?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  showTodayLine?: boolean;
  sideWidth?: number;
  locale?: GanttLocaleInput;
  label?: string;
  emptyLabel?: string;
  loadingLabel?: string;
  retryLabel?: string;
  taskColumnLabel?: string;
  progressColumnLabel?: string;
  toolbarLabel?: string;
  keyboardHelp?: string;
  instanceId?: string | null;
  viewTypeLabels?: Partial<Record<GanttViewScale, string>>;
  columns?: readonly GanttGridColumn<T>[];
  className?: string;
  style?: React.CSSProperties;
  renderBar?: (context: GanttBarTemplateContext<T>) => string;
  renderTaskDetail?: (context: GanttTaskDetailTemplateContext<T>) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  onTaskSelected?: (event: GanttTaskSelectionEvent<T>) => void;
  onTaskEditRequested?: (event: GanttTaskSelectionEvent<T>) => void;
  onTaskDateChanged?: (event: GanttTaskDateChangeEvent<T>) => void;
  onTaskDateChangeRejected?: (
    event: GanttTaskDateChangeRejectedEvent<T>
  ) => void;
  onTaskProgressChanged?: (event: GanttTaskProgressChangeEvent<T>) => void;
  onTaskProgressChangeRejected?: (
    event: GanttTaskProgressChangeRejectedEvent<T>
  ) => void;
  onModelIssuesChange?: (issues: readonly GanttModelIssue[]) => void;
  onRetryRequested?: () => void;
  onViewTypeChange?: (viewType: GanttViewScale) => void;
}

/**
 * @description Imperative handle exposed through a React `ref` on {@link Gantt}.
 * @summary Lets hosts and tests drive the timeline without mutating host data:
 * date and progress changes go through the same validation the UI uses and emit
 * the matching accepted/rejected callbacks. A missing task is reported through
 * the rejection callback instead of throwing.
 * @interface GanttHandle
 * @property {function(string, GanttDateInput, GanttDateInput, GanttDateChangeMode): boolean} applyDateChange - Requests a date change; returns `true` when the change was accepted.
 * @property {function(string, number): boolean} setProgress - Requests a progress change between 0 and 1; returns `true` when accepted.
 * @property {function(string): void} requestTaskEdit - Emits the edit-request callback and opens the detail panel when one is configured.
 * @property {function(string): void} focusTask - Moves DOM focus to the task bar when it is rendered.
 * @property {function(): GanttStatic} getGantt - Returns the underlying renderer instance, or `null` before mount.
 * @memberOf module:for-react.gantt
 */
export interface GanttHandle {
  applyDateChange(
    taskId: string,
    start: GanttDateInput | null | undefined,
    end: GanttDateInput | null | undefined,
    mode?: GanttDateChangeMode
  ): boolean;
  setProgress(taskId: string, progress: number): boolean;
  requestTaskEdit(taskId: string): void;
  focusTask(taskId: string): void;
  getGantt(): GanttStatic | null;
}

/**
 * @description Generic callable type of the {@link Gantt} component.
 * @summary Describes the component as a function that accepts
 * {@link GanttProps} plus a React `ref` and returns a React element, so hosts can
 * type treating the forwarded component as a generic function.
 * @typedef {function} GanttComponentType
 * @template T Host task type rendered on the timeline.
 * @param {Object} props - Gantt props and the forwarded `ref` to {@link GanttHandle}.
 * @returns {React.ReactElement} The rendered timeline, or `null` before mount.
 * @memberOf module:for-react.gantt
 */
export type GanttComponentType = <T = unknown>(
  props: GanttProps<T> & React.RefAttributes<GanttHandle>
) => React.ReactElement | null;

interface DateEvaluation<T> {
  accepted: boolean;
  event?: GanttTaskDateChangeEvent<T>;
  rejection?: GanttTaskDateChangeRejectedEvent<T>;
}

interface ProgressEvaluation<T> {
  accepted: boolean;
  event?: GanttTaskProgressChangeEvent<T>;
  rejection?: GanttTaskProgressChangeRejectedEvent<T>;
}

type PendingChange<T> =
  | {
      kind: "date";
      taskId: string;
      event: GanttTaskDateChangeEvent<T>;
    }
  | {
      kind: "progress";
      taskId: string;
      event: GanttTaskProgressChangeEvent<T>;
    };

function GanttImpl<T>(
  props: GanttProps<T>,
  ref: React.Ref<GanttHandle>
): React.ReactElement | null {
  const {
    config,
    items = [],
    selectedId = null,
    readOnly: readOnlyProp,
    disabled = false,
    loading = false,
    error = null,
    showToolbar = true,
    draggable = true,
    selectable = true,
    showTodayLine = true,
    sideWidth = 280,
    locale = "en",
    label = "Gantt",
    emptyLabel = "No tasks to display",
    loadingLabel = "Loading timeline",
    retryLabel = "Retry",
    taskColumnLabel,
    progressColumnLabel,
    toolbarLabel = "Timeline scale",
    keyboardHelp = DEFAULT_KEYBOARD_HELP,
    instanceId = null,
    viewTypeLabels = {},
    className,
    style,
  } = props;

  const readOnly =
    readOnlyProp ?? Boolean((props as { readonly?: boolean }).readonly);
  const isBrowser = isBrowserEnvironment();
  const fallbackIdRef = useRef<string>("");
  if (!fallbackIdRef.current) {
    fallbackIdRef.current = `dcf-gantt-${++instanceCounter}`;
  }
  const resolvedInstanceId =
    (instanceId && instanceId.trim()) || fallbackIdRef.current;
  const helpId = `${resolvedInstanceId}-help`;

  const [internalViewType, setInternalViewType] =
    useState<GanttViewScale>("week");
  const currentViewType = props.viewType ?? internalViewType;
  const [announcement, setAnnouncement] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const ganttRef = useRef<GanttStatic | null>(null);
  const mountedRef = useRef(false);
  const pendingRef = useRef<PendingChange<T> | null>(null);
  const previousRangeRef = useRef<{
    taskId: string;
    previous: GanttTaskDateRange;
  } | null>(null);
  const signatureRef = useRef<string | null>(null);

  const isEditable = !readOnly && !disabled && !loading;
  const isBusy = loading || disabled;

  const mapping = useMemo(
    () =>
      buildGanttMapping(items, config, {
        draggable: draggable && isEditable,
      }),
    [items, config, draggable, isEditable]
  );
  const issues = useMemo(
    () => validateGanttModel(items, config),
    [items, config]
  );
  const hasTasks = mapping.taskCount > 0;
  const taskColumnWidth = Math.max(120, sideWidth - 96);

  const timelineStart = useMemo<Date>(() => {
    const requested = normalizeGanttDate(props.start);
    if (requested) return requested;
    if (mapping.timelineStart) return mapping.timelineStart;
    return addGanttDays(startOfGanttDay(new Date()), -7);
  }, [props.start, mapping.timelineStart]);

  const timelineEnd = useMemo<Date>(() => {
    const requested = normalizeGanttDate(props.end);
    if (requested) return requested;
    if (mapping.timelineEnd) return mapping.timelineEnd;
    return addGanttDays(startOfGanttDay(new Date()), 14);
  }, [props.end, mapping.timelineEnd]);

  const dataSignature = useMemo(
    () =>
      `${mapping.tasks.map((task) => task.id).join("|")}::${mapping.links
        .map((link) => link.id)
        .join("|")}`,
    [mapping]
  );

  const latest = useRef({
    props,
    mapping,
    isEditable,
    readOnly,
    selectedId,
    viewType: currentViewType,
    locale,
    timelineStart,
    timelineEnd,
    taskColumnWidth,
    sideWidth,
    showTodayLine,
    selectable,
    draggable,
    taskColumnLabel,
    progressColumnLabel,
    instanceId: resolvedInstanceId,
  });

  latest.current = {
    props,
    mapping,
    isEditable,
    readOnly,
    selectedId,
    viewType: currentViewType,
    locale,
    timelineStart,
    timelineEnd,
    taskColumnWidth,
    sideWidth,
    showTodayLine,
    selectable,
    draggable,
    taskColumnLabel,
    progressColumnLabel,
    instanceId: resolvedInstanceId,
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const announce = useCallback((message: string) => {
    if (!isBrowserEnvironment()) return;
    setAnnouncement("");
    queueMicrotask(() => {
      if (mountedRef.current) setAnnouncement(message);
    });
  }, []);

  const barAriaLabel = useCallback((mapped: GanttMappedTask<T>): string => {
    const start = ganttDateOnly(mapped.start) ?? "no start date";
    const end = ganttDateOnly(mapped.end) ?? "no end date";
    const progress =
      mapped.progress === null
        ? "no progress recorded"
        : `${Math.round(mapped.progress * 100)} percent complete`;
    const milestone = mapped.milestone ? ", milestone" : "";
    const tooltip = mapped.tooltip ? `, ${mapped.tooltip}` : "";
    return `${mapped.title}, ${start} to ${end}, ${progress}${milestone}${tooltip}`;
  }, []);

  const barContext = useCallback(
    (taskId: string): GanttBarTemplateContext<T> => {
      const mapped = latest.current.mapping.byId.get(taskId);
      const task = (mapped?.task ?? {}) as T;
      const progress = mapped?.progress ?? 0;
      return {
        $implicit: task,
        task,
        taskId: mapped?.taskId ?? taskId,
        title: mapped?.title ?? taskId,
        start: mapped?.start ?? null,
        end: mapped?.end ?? null,
        progress,
        progressPercent: Math.round(progress * 100),
        milestone: mapped?.milestone ?? false,
        selected: latest.current.selectedId === taskId,
        readOnly: !latest.current.isEditable,
        tooltip: mapped?.tooltip ?? null,
      };
    },
    []
  );

  const detailContext = useCallback(
    (mapped: GanttMappedTask<T>): GanttTaskDetailTemplateContext<T> => ({
      $implicit: mapped.task,
      task: mapped.task,
      taskId: mapped.taskId,
      title: mapped.title,
    }),
    []
  );

  const decorateBars = useCallback(() => {
    const root = canvasRef.current;
    if (!root || !isBrowserEnvironment()) return;
    const state = latest.current;
    const bars = root.querySelectorAll<HTMLElement>(
      ".gantt_task_line[data-task-id]"
    );
    bars.forEach((line) => {
      const taskId = line.getAttribute("data-task-id");
      if (!taskId) return;
      const mapped = state.mapping.byId.get(taskId);
      if (!mapped) return;
      const target =
        line.querySelector<HTMLElement>(".gantt_task_content") ?? line;
      target.setAttribute("data-gantt-task-id", taskId);
      target.setAttribute("tabindex", "0");
      target.setAttribute("role", "button");
      target.setAttribute("aria-label", barAriaLabel(mapped));
      target.setAttribute("aria-pressed", String(state.selectedId === taskId));
      target.setAttribute(
        "aria-disabled",
        String(!state.isEditable || !mapped.editable)
      );
      target.setAttribute(
        "aria-keyshortcuts",
        "Enter Space E Alt+ArrowLeft Alt+ArrowRight Alt+Shift+ArrowLeft Alt+Shift+ArrowRight [ ]"
      );
      line.classList.toggle(
        "dcf-gantt__bar--selected",
        state.selectedId === taskId
      );
      line.classList.toggle("dcf-gantt__bar--milestone", mapped.milestone);
      line.classList.toggle("dcf-gantt__bar--readonly", !mapped.editable);
    });
  }, [barAriaLabel]);

  const findDependencyViolation = useCallback(
    (taskId: string, start: Date, end: Date): string | null => {
      const current = latest.current.mapping;
      if (!current.byId.has(taskId)) return null;

      for (const dependency of current.dependencies.get(taskId) ?? []) {
        const predecessor = current.byId.get(dependency.id);
        if (!predecessor?.start || !predecessor.end) continue;
        if (
          violates(
            dependency.type,
            predecessor.start,
            predecessor.end,
            start,
            end
          )
        ) {
          return dependency.id;
        }
      }

      for (const [successorId, successor] of current.byId) {
        if (successorId === taskId) continue;
        if (!successor.start || !successor.end) continue;
        for (const dependency of current.dependencies.get(successorId) ?? []) {
          if (dependency.id !== taskId) continue;
          if (
            violates(
              dependency.type,
              start,
              end,
              successor.start,
              successor.end
            )
          ) {
            return successorId;
          }
        }
      }

      return null;
    },
    []
  );

  const evaluateDateChange = useCallback(
    (
      mapped: GanttMappedTask<T>,
      nextStart: Date | null,
      nextEnd: Date | null,
      reason: GanttDateChangeReason,
      mode: GanttDateChangeMode,
      previousOverride?: GanttTaskDateRange
    ): DateEvaluation<T> => {
      const state = latest.current;
      const previous =
        previousOverride ?? toGanttDateRange(mapped.start, mapped.end);
      const requested = toGanttDateRange(nextStart, nextEnd);

      if (!state.isEditable) {
        return rejectDate(
          mapped,
          previous,
          requested,
          state.readOnly ? "readonly" : "disabled",
          mode
        );
      }
      if (!mapped.editable) {
        return rejectDate(mapped, previous, requested, "disabled", mode);
      }
      if (mapped.milestone && mode === "resize") {
        return rejectDate(mapped, previous, requested, "milestone", mode);
      }
      if (!nextStart || !nextEnd || nextEnd.getTime() < nextStart.getTime()) {
        return rejectDate(mapped, previous, requested, "invalid-date", mode);
      }

      const requestedEnd = mapped.milestone ? nextStart : nextEnd;
      const current = toGanttDateRange(nextStart, requestedEnd);

      if (
        sameGanttInstant(previous.start, current.start) &&
        sameGanttInstant(previous.end, current.end)
      ) {
        return rejectDate(mapped, previous, current, "unchanged", mode);
      }

      const violation = findDependencyViolation(
        mapped.taskId,
        nextStart,
        requestedEnd
      );
      if (violation) {
        return rejectDate(
          mapped,
          previous,
          current,
          "dependency-violation",
          mode,
          violation
        );
      }

      return {
        accepted: true,
        event: {
          task: mapped.task,
          taskId: mapped.taskId,
          previous,
          current,
          reason,
          mode,
        },
      };
    },
    [findDependencyViolation]
  );

  const evaluateProgressChange = useCallback(
    (
      mapped: GanttMappedTask<T>,
      requested: number,
      reason: GanttProgressChangeReason
    ): ProgressEvaluation<T> => {
      const state = latest.current;
      if (!state.isEditable) {
        return rejectProgress(
          mapped,
          requested,
          state.readOnly ? "readonly" : "disabled"
        );
      }
      if (!mapped.editable) {
        return rejectProgress(mapped, requested, "disabled");
      }
      if (!Number.isFinite(requested) || requested < 0 || requested > 1) {
        return rejectProgress(mapped, requested, "invalid-progress");
      }

      const previous = mapped.progress ?? 0;
      if (Math.abs(previous - requested) < 0.0001) {
        return rejectProgress(mapped, requested, "unchanged");
      }

      return {
        accepted: true,
        event: {
          task: mapped.task,
          taskId: mapped.taskId,
          previous,
          current: requested,
          reason,
        },
      };
    },
    []
  );

  const emitDateEvaluation = useCallback(
    (mapped: GanttMappedTask<T>, evaluation: DateEvaluation<T>) => {
      const state = latest.current;
      if (evaluation.event) {
        state.props.onTaskDateChanged?.(evaluation.event);
        const current = evaluation.event.current;
        announce(
          `${mapped.title} ${
            evaluation.event.mode === "move" ? "moved" : "resized"
          } to ${ganttDateOnly(current.start) ?? "an invalid date"} through ${
            ganttDateOnly(current.end) ?? "an invalid date"
          }`
        );
      }
      if (evaluation.rejection) {
        state.props.onTaskDateChangeRejected?.(evaluation.rejection);
        announce(
          `${mapped.title} date change rejected: ${evaluation.rejection.reason.replace(
            "-",
            " "
          )}`
        );
      }
    },
    [announce]
  );

  const emitProgressEvaluation = useCallback(
    (mapped: GanttMappedTask<T>, evaluation: ProgressEvaluation<T>) => {
      const state = latest.current;
      if (evaluation.event) {
        state.props.onTaskProgressChanged?.(evaluation.event);
        announce(
          `${mapped.title} progress ${Math.round(
            evaluation.event.current * 100
          )} percent`
        );
      }
      if (evaluation.rejection) {
        state.props.onTaskProgressChangeRejected?.(evaluation.rejection);
        announce(
          `${mapped.title} progress change rejected: ${evaluation.rejection.reason.replace(
            "-",
            " "
          )}`
        );
      }
    },
    [announce]
  );

  const applyDateChangeInternal = useCallback(
    (
      mapped: GanttMappedTask<T>,
      nextStart: Date | null,
      nextEnd: Date | null,
      reason: GanttDateChangeReason,
      mode: GanttDateChangeMode,
      previousOverride?: GanttTaskDateRange
    ): boolean => {
      const evaluation = evaluateDateChange(
        mapped,
        nextStart,
        nextEnd,
        reason,
        mode,
        previousOverride
      );
      emitDateEvaluation(mapped, evaluation);
      return evaluation.accepted;
    },
    [evaluateDateChange, emitDateEvaluation]
  );

  const applyProgressInternal = useCallback(
    (
      mapped: GanttMappedTask<T>,
      requested: number,
      reason: GanttProgressChangeReason
    ): boolean => {
      const evaluation = evaluateProgressChange(mapped, requested, reason);
      emitProgressEvaluation(mapped, evaluation);
      return evaluation.accepted;
    },
    [evaluateProgressChange, emitProgressEvaluation]
  );

  const emitSelection = useCallback(
    (mapped: GanttMappedTask<T>) => {
      latest.current.props.onTaskSelected?.({
        task: mapped.task,
        taskId: mapped.taskId,
      });
      announce(`${mapped.title} selected`);
    },
    [announce]
  );

  const requestEdit = useCallback(
    (mapped: GanttMappedTask<T>) => {
      latest.current.props.onTaskEditRequested?.({
        task: mapped.task,
        taskId: mapped.taskId,
      });
      if (!latest.current.props.renderTaskDetail) {
        announce(`Edit requested for ${mapped.title}`);
        return;
      }
      setEditingTaskId(mapped.taskId);
      announce(`Editing ${mapped.title}`);
    },
    [announce]
  );

  const stepDate = useCallback(
    (mapped: GanttMappedTask<T>, days: number, resize: boolean) => {
      if (!mapped.start || !mapped.end) {
        applyDateChangeInternal(
          mapped,
          null,
          null,
          "keyboard",
          resize ? "resize" : "move"
        );
        return;
      }
      if (mapped.milestone) {
        if (resize) {
          applyDateChangeInternal(
            mapped,
            mapped.start,
            mapped.end,
            "keyboard",
            "resize"
          );
          return;
        }
        const nextStart = addGanttDays(mapped.start, days);
        applyDateChangeInternal(
          mapped,
          nextStart,
          nextStart,
          "keyboard",
          "move"
        );
        return;
      }

      const nextStart = resize ? mapped.start : addGanttDays(mapped.start, days);
      const nextEnd = addGanttDays(mapped.end, days);
      applyDateChangeInternal(
        mapped,
        nextStart,
        nextEnd,
        "keyboard",
        resize ? "resize" : "move"
      );
    },
    [applyDateChangeInternal]
  );

  const stepProgress = useCallback(
    (mapped: GanttMappedTask<T>, delta: number) => {
      const previous = mapped.progress ?? 0;
      const next = Math.min(
        1,
        Math.max(0, Math.round((previous + delta) * 10) / 10)
      );
      applyProgressInternal(mapped, next, "keyboard");
    },
    [applyProgressInternal]
  );

  const focusBar = useCallback((taskId: string) => {
    const root = canvasRef.current;
    if (!root) return;
    const escaped = taskId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const target = root.querySelector<HTMLElement>(
      `.gantt_task_content[data-gantt-task-id="${escaped}"], .gantt_task_line[data-task-id="${escaped}"]`
    );
    target?.focus();
  }, []);

  const closeDetail = useCallback(() => {
    const editingTask = editingTaskId;
    setEditingTaskId(null);
    if (editingTask) {
      const callback = () => focusBar(editingTask);
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(callback);
      } else {
        callback();
      }
    }
  }, [editingTaskId, focusBar]);

  const applyConfiguration = useCallback((gantt: GanttStatic) => {
    const state = latest.current;
    applyLocale(gantt, state.locale, state.instanceId);
    gantt.config.csp = true;
    gantt.config.wai_aria_attributes = true;
    gantt.config.deepcopy_on_parse = true;
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.date_grid = "%Y-%m-%d";
    gantt.config.duration_unit = "day";
    gantt.config.work_time = false;
    gantt.config.round_dnd_dates = true;
    gantt.config.auto_scheduling = false;
    gantt.config.auto_types = false;
    gantt.config.editable_property = "editable";
    gantt.config.readonly_property = "readonly";
    gantt.config.links = {
      finish_to_start: "0",
      start_to_start: "1",
      finish_to_finish: "2",
      start_to_finish: "3",
    };
    gantt.config.types = {
      task: "task",
      project: "project",
      milestone: "milestone",
    };

    gantt.config.readonly = !state.isEditable;
    gantt.config.select_task = state.selectable !== false;
    gantt.config.multiselect = false;
    gantt.config.drag_move = Boolean(state.draggable && state.isEditable);
    gantt.config.drag_resize = Boolean(state.draggable && state.isEditable);
    gantt.config.drag_progress = false;
    gantt.config.drag_project = false;
    gantt.config.drag_multiple = false;
    gantt.config.drag_links = false;
    gantt.config.details_on_dblclick = false;
    gantt.config.details_on_create = false;
    gantt.config.open_tree_initially = true;
    gantt.config.show_grid = true;
    gantt.config.show_chart = true;
    gantt.config.show_links = true;
    gantt.config.grid_width = state.sideWidth;
    gantt.config.row_height = 44;
    gantt.config.bar_height = 24;
    gantt.config.scale_height = 44;
    gantt.config.min_column_width = 45;
    gantt.config.start_date = state.timelineStart;
    gantt.config.end_date = state.timelineEnd;
    gantt.config.scales = ganttScales(
      state.viewType
    ) as unknown as typeof gantt.config.scales;
    const customColumns = state.props.columns;
    if (customColumns && customColumns.length > 0) {
      gantt.config.columns = customColumns.map((column) => ({
        name: column.name,
        label: column.label,
        width: column.width,
        tree: column.tree,
        align: column.align,
        template: column.template
          ? (task: VendorTask) => {
              const mapped = state.mapping.byId.get(String(task.id));
              return mapped
                ? column.template!(mapped.task)
                : String(task.text ?? "");
            }
          : (task: VendorTask) => escapeHtml(taskTitle(task)),
      }));
    } else {
      gantt.config.columns = [
        {
          name: "text",
          label:
            state.taskColumnLabel ??
            gantt.locale?.labels?.column_text ??
            "Task",
          tree: true,
          width: state.taskColumnWidth,
          template: (task: VendorTask) => escapeHtml(taskTitle(task)),
        },
        {
          name: "progress",
          label: state.progressColumnLabel ?? "Progress",
          width: 96,
          align: "center",
          template: (task: VendorTask) =>
            `<span class="dcf-gantt__table-progress">${escapeHtml(
              progressLabel(task)
            )}</span>`,
        },
      ];
    }
  }, []);

  const applySelection = useCallback((gantt: GanttStatic) => {
    const state = latest.current;
    if (state.selectedId && state.mapping.byId.has(state.selectedId)) {
      gantt.selectTask(state.selectedId);
    } else {
      gantt.unselectTask();
    }
  }, []);

  useEffect(() => {
    if (!isBrowser || !hasTasks || loading || error) return;
    const container = canvasRef.current;
    if (!container) return;

    const gantt = getGanttFactory().getGanttInstance();
    ganttRef.current = gantt;
    signatureRef.current = null;
    gantt.plugins({ keyboard_navigation: true, tooltip: true });

    gantt.templates.task_text = (
      _start: Date,
      _end: Date,
      task: VendorTask
    ): string => {
      const mapped = latest.current.mapping.byId.get(String(task.id));
      if (!mapped || mapped.milestone) return "";
      const context = barContext(mapped.taskId);
      const text = latest.current.props.renderBar
        ? latest.current.props.renderBar(context)
        : context.title;
      return `<span class="dcf-gantt__bar-label" data-gantt-task-id="${escapeHtml(
        context.taskId
      )}">${escapeHtml(text)}</span>`;
    };

    gantt.templates.tooltip_text = (
      start: Date,
      end: Date,
      task: VendorTask
    ): string => {
      const mapped = latest.current.mapping.byId.get(String(task.id));
      if (!mapped) return "";
      if (mapped.tooltip) return escapeHtml(mapped.tooltip);
      const dateFormat = gantt.date.date_to_str("%Y-%m-%d");
      return `${escapeHtml(mapped.title)}<div>Start date: ${escapeHtml(
        dateFormat(start)
      )}</div><div>End date: ${escapeHtml(dateFormat(end))}</div>`;
    };

    gantt.templates.task_class = (
      _start: Date,
      _end: Date,
      task: VendorTask
    ): string => {
      const mapped = latest.current.mapping.byId.get(String(task.id));
      return mapped && !mapped.editable ? "dcf-gantt__bar--readonly" : "";
    };

    gantt.templates.timeline_cell_class = (
      _task: VendorTask,
      date: Date
    ): string => {
      if (!latest.current.showTodayLine) return "";
      return sameCalendarDay(date, new Date()) ? "dcf-gantt__today-cell" : "";
    };

    const selectedEvent = gantt.attachEvent(
      "onTaskSelected",
      (id: string | number) => {
        const mapped = latest.current.mapping.byId.get(String(id));
        if (mapped && mapped.taskId !== latest.current.selectedId) {
          emitSelection(mapped);
        }
      }
    );

    const doubleClickEvent = gantt.attachEvent(
      "onTaskDblClick",
      (id: string) => {
        const mapped = latest.current.mapping.byId.get(String(id));
        if (mapped) requestEdit(mapped);
        return false;
      }
    );

    const lightboxEvent = gantt.attachEvent("onBeforeLightbox", () => false);

    const dragStartEvent = gantt.attachEvent(
      "onBeforeTaskDrag",
      (id: string | number) => {
        const mapped = latest.current.mapping.byId.get(String(id));
        if (!mapped) return true;
        previousRangeRef.current = {
          taskId: mapped.taskId,
          previous: toGanttDateRange(mapped.start, mapped.end),
        };
        announce(`Moving ${mapped.title}`);
        return true;
      }
    );

    const beforeChangeEvent = gantt.attachEvent(
      "onBeforeTaskChanged",
      (id: string | number, mode: string, task: VendorTask) => {
        const mapped = latest.current.mapping.byId.get(String(id));
        pendingRef.current = null;
        if (!mapped) return false;

        const previousState = previousRangeRef.current;
        const previous =
          previousState && previousState.taskId === mapped.taskId
            ? previousState.previous
            : toGanttDateRange(mapped.start, mapped.end);

        if (mode === "progress") {
          const requested = Number(task.progress);
          const evaluation = evaluateProgressChange(mapped, requested, "keyboard");
          if (!evaluation.accepted) {
            emitProgressEvaluation(mapped, evaluation);
            return false;
          }
          pendingRef.current = evaluation.event
            ? {
                kind: "progress",
                taskId: mapped.taskId,
                event: {
                  ...evaluation.event,
                  reason: "keyboard",
                },
              }
            : null;
          return true;
        }

        const nextStart = normalizeGanttDate(task.start_date as Date);
        const nextEnd = normalizeGanttDate(task.end_date as Date);
        const changeMode: GanttDateChangeMode =
          mode === "resize" ? "resize" : "move";
        const evaluation = evaluateDateChange(
          mapped,
          nextStart,
          nextEnd,
          "drag",
          changeMode,
          previous
        );
        if (!evaluation.accepted) {
          emitDateEvaluation(mapped, evaluation);
          return false;
        }
        pendingRef.current = evaluation.event
          ? {
              kind: "date",
              taskId: mapped.taskId,
              event: evaluation.event,
            }
          : null;
        return true;
      }
    );

    const dragEndEvent = gantt.attachEvent("onAfterTaskDrag", () => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      previousRangeRef.current = null;
      if (!pending) return;
      const mapped = latest.current.mapping.byId.get(pending.taskId);
      if (!mapped) return;
      if (pending.kind === "date") {
        emitDateEvaluation(mapped, { accepted: true, event: pending.event });
      } else {
        emitProgressEvaluation(mapped, {
          accepted: true,
          event: pending.event,
        });
      }
      queueMicrotask(() => {
        const ganttInstance = ganttRef.current;
        if (!ganttInstance || !mountedRef.current) return;
        ganttInstance.clearAll();
        signatureRef.current = null;
        resyncFromLatest(ganttInstance);
      });
    });

    const renderEvent = gantt.attachEvent("onGanttRender", () => {
      decorateBars();
    });

    gantt.init(container);

    return () => {
      if (selectedEvent) gantt.detachEvent(selectedEvent);
      if (doubleClickEvent) gantt.detachEvent(doubleClickEvent);
      if (lightboxEvent) gantt.detachEvent(lightboxEvent);
      if (dragStartEvent) gantt.detachEvent(dragStartEvent);
      if (beforeChangeEvent) gantt.detachEvent(beforeChangeEvent);
      if (dragEndEvent) gantt.detachEvent(dragEndEvent);
      if (renderEvent) gantt.detachEvent(renderEvent);
      try {
        gantt.destructor();
      } catch {
        // The renderer can already be detached during fast unmounts.
      }
      ganttRef.current = null;
      signatureRef.current = null;
    };
  }, [
    isBrowser,
    hasTasks,
    loading,
    error,
    announce,
    barContext,
    decorateBars,
    emitDateEvaluation,
    emitProgressEvaluation,
    emitSelection,
    evaluateDateChange,
    evaluateProgressChange,
    requestEdit,
  ]);

  const resyncFromLatest = useCallback(
    (gantt: GanttStatic) => {
      const state = latest.current;
      const signature = `${state.mapping.tasks
        .map((task) => task.id)
        .join("|")}::${state.mapping.links.map((link) => link.id).join("|")}`;
      applyConfiguration(gantt);
      const scroll =
        signatureRef.current !== signature ? gantt.getScrollState() : null;
      if (signatureRef.current !== signature) {
        gantt.clearAll();
        signatureRef.current = signature;
      }
      gantt.parse({
        data: state.mapping.tasks as unknown as VendorTask[],
        links: state.mapping.links.map((link) => ({
          id: link.id,
          source: link.source,
          target: link.target,
          type: ganttLinkType(link.type),
        })) as unknown as VendorLink[],
      });
      applySelection(gantt);
      gantt.render();
      if (scroll) gantt.scrollTo(scroll.x, scroll.y);
      decorateBars();
    },
    [applyConfiguration, applySelection, decorateBars]
  );

  useEffect(() => {
    const gantt = ganttRef.current;
    if (!gantt) return;
    resyncFromLatest(gantt);
  }, [mapping, dataSignature, draggable, isEditable, loading, error, resyncFromLatest]);

  useEffect(() => {
    const gantt = ganttRef.current;
    if (!gantt) return;
    applyConfiguration(gantt);
    gantt.render();
    decorateBars();
  }, [
    currentViewType,
    locale,
    sideWidth,
    showTodayLine,
    selectable,
    taskColumnLabel,
    progressColumnLabel,
    props.columns,
    applyConfiguration,
    decorateBars,
  ]);

  useEffect(() => {
    const gantt = ganttRef.current;
    if (!gantt) return;
    applySelection(gantt);
    decorateBars();
  }, [selectedId, mapping, applySelection, decorateBars]);

  useEffect(() => {
    latest.current.props.onModelIssuesChange?.(issues);
  }, [issues]);

  useEffect(() => {
    if (editingTaskId && !mapping.byId.has(editingTaskId)) {
      setEditingTaskId(null);
    }
  }, [editingTaskId, mapping]);

  useEffect(() => {
    if (!editingTaskId) return;
    const root = canvasRef.current;
    if (!root) return;
    const panel = root
      .closest<HTMLElement>("[data-gantt-instance]")
      ?.querySelector<HTMLElement>("[data-gantt-detail]");
    panel
      ?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
      )
      ?.focus();
  }, [editingTaskId]);

  const taskTitle = useCallback((task: VendorTask): string => {
    const mapped = latest.current.mapping.byId.get(String(task.id));
    return mapped ? mapped.title : String(task.text ?? "");
  }, []);

  const progressLabel = useCallback((task: VendorTask): string => {
    const mapped = latest.current.mapping.byId.get(String(task.id));
    const value = mapped?.progress;
    return typeof value === "number" && Number.isFinite(value)
      ? `${Math.round(value * 100)}%`
      : "—";
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      applyDateChange(taskId, start, end, mode = "move") {
        const mapped = latest.current.mapping.byId.get(taskId);
        if (!mapped) {
          latest.current.props.onTaskDateChangeRejected?.({
            task: null,
            taskId,
            previous: null,
            requested: toGanttDateRange(start, end),
            reason: "unknown-task",
            mode,
          });
          return false;
        }
        return applyDateChangeInternal(
          mapped,
          normalizeGanttDate(start),
          normalizeGanttDate(end),
          "control",
          mode
        );
      },
      setProgress(taskId, progress) {
        const mapped = latest.current.mapping.byId.get(taskId);
        if (!mapped) {
          latest.current.props.onTaskProgressChangeRejected?.({
            task: null,
            taskId,
            previous: null,
            requested: progress,
            reason: "unknown-task",
          });
          return false;
        }
        return applyProgressInternal(mapped, progress, "control");
      },
      requestTaskEdit(taskId) {
        const mapped = latest.current.mapping.byId.get(taskId);
        if (mapped) requestEdit(mapped);
      },
      focusTask(taskId) {
        focusBar(taskId);
      },
      getGantt() {
        return ganttRef.current;
      },
    }),
    [
      applyDateChangeInternal,
      applyProgressInternal,
      focusBar,
      requestEdit,
    ]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const bar =
        target?.closest<HTMLElement>("[data-gantt-task-id]") ??
        target?.closest<HTMLElement>(".gantt_task_line[data-task-id]");
      const taskId =
        bar?.getAttribute("data-gantt-task-id") ??
        bar?.getAttribute("data-task-id") ??
        null;
      if (!taskId) return;

      const mapped = latest.current.mapping.byId.get(taskId);
      if (!mapped) {
        event.preventDefault();
        event.stopPropagation();
        latest.current.props.onTaskDateChangeRejected?.({
          task: null,
          taskId,
          previous: null,
          requested: null,
          reason: "unknown-task",
          mode: "move",
        });
        return;
      }

      const stop = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      switch (event.key) {
        case "Enter":
        case " ":
        case "Spacebar": {
          stop();
          const gantt = ganttRef.current;
          if (gantt) {
            gantt.selectTask(mapped.taskId);
          } else {
            emitSelection(mapped);
          }
          break;
        }
        case "e":
        case "E":
          stop();
          requestEdit(mapped);
          break;
        case "Escape":
          if (editingTaskId) {
            stop();
            closeDetail();
          }
          break;
        case "[":
        case "]":
          stop();
          stepProgress(mapped, event.key === "]" ? 0.1 : -0.1);
          break;
        case "ArrowLeft":
        case "ArrowRight":
          if (event.altKey) {
            stop();
            stepDate(
              mapped,
              event.key === "ArrowRight" ? 1 : -1,
              event.shiftKey
            );
          }
          break;
        default:
          break;
      }
    },
    [
      closeDetail,
      editingTaskId,
      emitSelection,
      requestEdit,
      stepDate,
      stepProgress,
    ]
  );

  const setViewType = useCallback(
    (scale: GanttViewScale) => {
      if (isBusy || currentViewType === scale) return;
      if (props.viewType === undefined) setInternalViewType(scale);
      props.onViewTypeChange?.(scale);
      announce(`${viewTypeLabels[scale] ?? VIEW_LABELS[scale]} scale`);
    },
    [
      announce,
      currentViewType,
      isBusy,
      props,
      viewTypeLabels,
    ]
  );

  const retry = useCallback(() => {
    props.onRetryRequested?.();
    announce(loadingLabel);
  }, [announce, loadingLabel, props]);

  const editingTask = editingTaskId
    ? mapping.byId.get(editingTaskId) ?? null
    : null;

  const hostClasses = [
    "dcf-gantt",
    readOnly ? "dcf-gantt--readonly" : "",
    disabled ? "dcf-gantt--disabled" : "",
    loading ? "dcf-gantt--busy" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={hostClasses}
      style={style}
      role="region"
      aria-label={label}
      aria-busy={loading}
      aria-describedby={helpId}
      data-gantt-instance={resolvedInstanceId}
      onKeyDownCapture={onKeyDown}
    >
      {showToolbar && !loading && !error ? (
        <div
          className="dcf-gantt__toolbar"
          role="toolbar"
          aria-label={toolbarLabel}
        >
          <span className="dcf-gantt__title">{label}</span>
          <div className="dcf-gantt__views">
            {GANTT_VIEW_SCALES.map((scale) => (
              <button
                key={scale}
                type="button"
                className={
                  currentViewType === scale
                    ? "dcf-gantt__view dcf-gantt__view--active"
                    : "dcf-gantt__view"
                }
                data-gantt-view={scale}
                aria-pressed={currentViewType === scale}
                disabled={isBusy}
                onClick={() => setViewType(scale)}
              >
                {viewTypeLabels[scale] ?? VIEW_LABELS[scale]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="dcf-gantt__state dcf-gantt__state--loading" role="status">
          <span className="dcf-gantt__spinner" aria-hidden="true" />
          <p>{loadingLabel}</p>
        </div>
      ) : error ? (
        <div className="dcf-gantt__state dcf-gantt__state--error" role="alert">
          <p>{error}</p>
          <button type="button" className="dcf-gantt__retry" onClick={retry}>
            {retryLabel}
          </button>
        </div>
      ) : !hasTasks ? (
        <div className="dcf-gantt__state dcf-gantt__state--empty">
          {props.renderEmpty ? props.renderEmpty() : <p>{emptyLabel}</p>}
        </div>
      ) : (
        <div className="dcf-gantt__canvas">
          {isBrowser ? (
            <div ref={canvasRef} style={{ height: "100%" }} />
          ) : (
            <div className="dcf-gantt__ssr-placeholder" aria-hidden="true" />
          )}
        </div>
      )}

      {issues.length > 0 ? (
        <ul className="dcf-gantt__issues" aria-label="Timeline data warnings">
          {issues.map((issue) => (
            <li
              key={`${issue.taskId}-${issue.code}-${issue.detail}`}
              className="dcf-gantt__issue"
            >
              {issue.detail}
            </li>
          ))}
        </ul>
      ) : null}

      {editingTask ? (
        <aside
          className="dcf-gantt__detail"
          data-gantt-detail=""
          role="dialog"
          aria-modal="false"
          aria-label={editingTask.title}
        >
          <div className="dcf-gantt__detail-header">
            <h3 className="dcf-gantt__detail-title">{editingTask.title}</h3>
            <button
              type="button"
              className="dcf-gantt__detail-close"
              onClick={closeDetail}
            >
              Close
            </button>
          </div>
          {props.renderTaskDetail?.(detailContext(editingTask))}
        </aside>
      ) : null}

      <p className="dcf-gantt__help" id={helpId}>
        {keyboardHelp}
      </p>
      <div
        className="dcf-gantt__sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
    </div>
  );
}

function rejectDate<T>(
  mapped: GanttMappedTask<T>,
  previous: GanttTaskDateRange,
  requested: GanttTaskDateRange,
  reason: GanttDateChangeRejectionReason,
  mode: GanttDateChangeMode,
  dependencyId?: string
): DateEvaluation<T> {
  return {
    accepted: false,
    rejection: {
      task: mapped.task,
      taskId: mapped.taskId,
      previous,
      requested,
      reason,
      mode,
      ...(dependencyId ? { dependencyId } : {}),
    },
  };
}

function rejectProgress<T>(
  mapped: GanttMappedTask<T>,
  requested: number,
  reason: GanttProgressChangeRejectionReason
): ProgressEvaluation<T> {
  return {
    accepted: false,
    rejection: {
      task: mapped.task,
      taskId: mapped.taskId,
      previous: mapped.progress,
      requested,
      reason,
    },
  };
}

function violates(
  type: GanttDependencyType,
  predecessorStart: Date,
  predecessorEnd: Date,
  successorStart: Date,
  successorEnd: Date
): boolean {
  switch (type) {
    case "fs":
      return predecessorEnd.getTime() > successorStart.getTime();
    case "ff":
      return predecessorEnd.getTime() > successorEnd.getTime();
    case "ss":
      return predecessorStart.getTime() > successorStart.getTime();
    case "sf":
      return predecessorStart.getTime() > successorEnd.getTime();
    default:
      return false;
  }
}

function applyLocale(
  gantt: GanttStatic,
  locale: GanttLocaleInput,
  instanceId: string
): void {
  if (typeof locale === "string") {
    gantt.i18n.setLocale(locale);
    return;
  }
  const base = gantt.i18n.getLocale("en");
  const key = `dcf-${instanceId}`;
  const merged = {
    date: { ...base.date, ...(locale.date ?? {}) },
    labels: { ...base.labels, ...(locale.labels ?? {}) },
  } as unknown as GanttLocale;
  gantt.i18n.addLocale(key, merged);
  gantt.i18n.setLocale(key);
}

const ForwardedGantt = forwardRef(
  GanttImpl as unknown as React.ForwardRefRenderFunction<
    GanttHandle,
    GanttProps<unknown>
  >
);

/**
 * @description Accessible, model-driven timeline/Gantt backed by the dhtmlx-gantt Community renderer.
 * @summary Projects a host task list through {@link GanttConfig} into a
 * timeline with a side grid, validates the model through
 * {@link validateGanttModel}, and renders bars, milestones and dependency
 * links. Editing is opt-in and never mutates host data: drag, keyboard and
 * imperative requests are validated (editability, dates, milestones and
 * dependencies) and reported through the accepted or rejected callbacks. The
 * component also supports toolbar scale switching, localization, custom bar and
 * detail templates, today highlighting, and an SSR-safe placeholder when the
 * browser renderer is unavailable. It exposes {@link GanttHandle} through a
 * React `ref`.
 * @param {GanttProps} props - Task source, accessor mapping, view and edit
 * configuration, localization, grid columns, templates and event callbacks.
 * @param {React.Ref<GanttHandle>} ref - Optional ref that receives the
 * imperative date/progress/edit/focus helpers and the renderer instance.
 * @returns {React.ReactElement} The timeline region, or `null` before mount.
 * @function Gantt
 * @example
 * ```tsx
 * import { useRef } from "react";
 * import { Gantt, type GanttHandle } from "@decaf-ts/for-react/gantt";
 *
 * interface Task {
 *   id: string;
 *   name: string;
 *   from: string;
 *   to: string;
 *   done: number;
 * }
 *
 * export function ProjectTimeline({ tasks }: { tasks: Task[] }) {
 *   const ganttRef = useRef<GanttHandle>(null);
 *
 *   return (
 *     <Gantt<Task>
 *       ref={ganttRef}
 *       items={tasks}
 *       viewType="week"
 *       label="Project timeline"
 *       config={{
 *         id: (task) => task.id,
 *         title: (task) => task.name,
 *         start: (task) => task.from,
 *         end: (task) => task.to,
 *         progress: (task) => task.done,
 *       }}
 *       onTaskDateChanged={(event) => console.log(event.taskId, event.current)}
 *       onTaskDateChangeRejected={(event) => console.warn(event.reason)}
 *     />
 *   );
 * }
 * ```
 * @mermaid
 * %%{init: {"theme": "base", "themeVariables": {"actorBkg": "#E8F1FB", "actorBorder": "#5B8DEF", "signalColor": "#34507A"}}}%%
 * sequenceDiagram
 *   autonumber
 *   participant Host as Parent component
 *   participant Gantt as Gantt
 *   participant Map as buildGanttMapping
 *   participant Vendor as dhtmlx-gantt
 *   Host->>Gantt: render with items, config and flags
 *   activate Gantt
 *   Gantt->>Map: project tasks and links
 *   activate Map
 *   Map-->>Gantt: tasks, links and timeline bounds
 *   deactivate Map
 *   Gantt->>Vendor: init and parse mapped tasks
 *   activate Vendor
 *   Vendor-->>Gantt: rendered timeline
 *   deactivate Vendor
 *   Gantt-->>Host: timeline region
 *   deactivate Gantt
 *   Vendor->>Gantt: user drags or resizes a bar
 *   activate Gantt
 *   Gantt->>Gantt: validate dates and dependencies
 *   Gantt->>Host: onTaskDateChanged or rejected
 *   deactivate Gantt
 * @memberOf module:for-react.gantt
 */
export const Gantt = ForwardedGantt as unknown as GanttComponentType;

/**
 * @description Alias of {@link Gantt} kept for callers porting Angular component names to the React package.
 * @summary Behaves exactly like {@link Gantt}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {GanttComponentType}
 * @memberOf module:for-react.gantt
 */
export const GanttComponent = Gantt;

/**
 * @description Alias of {@link Gantt} following the `Rgx*` naming convention of the main for-react UI kit.
 * @summary Behaves exactly like {@link Gantt}; it exists only as a naming
 * bridge and has no separate implementation.
 * @constant
 * @type {GanttComponentType}
 * @memberOf module:for-react.gantt
 */
export const RgxGantt = Gantt;
