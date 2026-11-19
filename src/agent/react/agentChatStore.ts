/**
 * @file
 * @summary Zustand store owning the decaf side-channel state of one agent chat
 * instance (telemetry, structured object/history, approval, demo events,
 * backend-available tri-state).
 * @description The @ai-sdk `Chat`/`useChat` state machine owns messages,
 * streaming status and tool parts. Everything without a protocol-native
 * carrier lives here and is fed by the transport's
 * `AgentChatSideChannelHandlers` and by the scripted demo transport's
 * `subscribeDemoEvents` channel.
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import type {
  AgentChatAgentStep,
  AgentChatApprovalStatus,
  AgentChatDemoEvent,
  AgentChatNestedAgentSnapshot,
  AgentChatNotification,
  AgentChatOrder,
  AgentChatProgressEvent,
  AgentChatRoundtripTelemetry,
  AgentChatStructuredObjectEntry,
  AgentChatStructuredObjectView,
  AgentChatTrackerStatus,
  AgentChatWeather,
  AgentChatWorkflowStep,
} from "../types.js";

/** Lifecycle statuses after which a run is no longer active. */
const TERMINAL_ROUNDTRIP_STATUSES = new Set([
  "succeeded",
  "failed",
  "cancelled",
]);

/** Run-level approval projection shared by the store and the approval UI.
 * @memberOf module:for-react.agent
 */
export interface AgentChatApprovalView {
  /** Run awaiting a decision. */
  runId: string;
  /** Current decision state. */
  status: AgentChatApprovalStatus;
  /** Optional suspended payload preview. */
  payload?: unknown;
  /** Optional tool name associated with the suspension. */
  toolName?: string;
}

/** Tracker card payload kept in the demo side-channel state.
 * @memberOf module:for-react.agent
 */
export interface AgentChatTrackerView {
  /** Shipping status driving the timeline. */
  status: AgentChatTrackerStatus;
  /** Completion percentage from 0 to 100. */
  progress: number;
  /** Optional short label. */
  label?: string;
  /** Optional description line. */
  description?: string;
}

/** Demo-only panel state driven by `AgentChatDemoEvent`s.
 * @memberOf module:for-react.agent
 */
export interface AgentChatDemoState {
  /** Workflow status rows (latest snapshot wins). */
  workflowSteps: AgentChatWorkflowStep[];
  /** Agent-network step (latest snapshot wins). */
  agentStep: AgentChatAgentStep | null;
  /** Nested-agent snapshot (latest wins). */
  nestedAgent: AgentChatNestedAgentSnapshot | null;
  /** Latest progress event. */
  progress: AgentChatProgressEvent | null;
  /** Orders tool result rows. */
  orders: AgentChatOrder[];
  /** Shipment tracker payload. */
  tracker: AgentChatTrackerView | null;
  /** Weather payload. */
  weather: AgentChatWeather | null;
  /** Toast stack (newest last). */
  notifications: AgentChatNotification[];
}

/** Complete decaf-owned state of one agent chat instance.
 * @memberOf module:for-react.agent
 */
export interface AgentChatDecafState {
  /** Per-run telemetry rows in first-seen order. */
  roundtrips: AgentChatRoundtripTelemetry[];
  /** Latest structured object extracted from a run, or `null`. */
  structuredObject: AgentChatStructuredObjectView | null;
  /** Committed structured-object history, oldest first. */
  structuredObjectHistory: AgentChatStructuredObjectEntry[];
  /** Run-level approval prompt, or `null`. */
  approval: AgentChatApprovalView | null;
  /** Tri-state backend availability. */
  backendAvailable: boolean | null;
  /** Last surfaced error text, or `null`. */
  error: string | null;
  /** Run id of the in-flight roundtrip, or `null`. */
  activeRunId: string | null;
  /** Demo-only panels. */
  demo: AgentChatDemoState;
  /** Merges one telemetry snapshot and tracks the active run. */
  mergeTelemetry(telemetry: AgentChatRoundtripTelemetry): void;
  /** Replaces the latest structured object. */
  setStructuredObject(view: AgentChatStructuredObjectView | null): void;
  /** Appends a committed structured-object snapshot. */
  commitStructuredObject(entry: AgentChatStructuredObjectEntry): void;
  /** Replaces the approval prompt. */
  setApproval(approval: AgentChatApprovalView | null): void;
  /** Replaces the backend availability tri-state. */
  setBackendAvailable(available: boolean | null): void;
  /** Replaces the surfaced error text. */
  setError(error: string | null): void;
  /** Applies one demo side-channel event. */
  applyDemoEvent(event: AgentChatDemoEvent): void;
  /** Dismisses a notification by id. */
  dismissNotification(id: string): void;
  /** Clears every decaf-owned field. */
  reset(): void;
}

/** Fresh demo panel state. */
function emptyDemoState(): AgentChatDemoState {
  return {
    workflowSteps: [],
    agentStep: null,
    nestedAgent: null,
    progress: null,
    orders: [],
    tracker: null,
    weather: null,
    notifications: [],
  };
}

/**
 * Creates the Zustand vanilla store backing one agent chat instance.
 *
 * @param initial - Optional partial seed (tests/demo).
 * @returns The vanilla store; bind it with `useStore` or the provider hooks.
 * @memberOf module:for-react.agent
 */
export function createAgentChatDecafStore(
  initial: Partial<
    Pick<
      AgentChatDecafState,
      | "roundtrips"
      | "structuredObject"
      | "backendAvailable"
      | "error"
      | "activeRunId"
    >
  > = {}
): StoreApi<AgentChatDecafState> {
  return createStore<AgentChatDecafState>()((set, get) => ({
    roundtrips: initial.roundtrips ?? [],
    structuredObject: initial.structuredObject ?? null,
    structuredObjectHistory: [],
    approval: null,
    backendAvailable: initial.backendAvailable ?? null,
    error: initial.error ?? null,
    activeRunId: initial.activeRunId ?? null,
    demo: emptyDemoState(),

    mergeTelemetry(telemetry) {
      const rows = get().roundtrips;
      const index = rows.findIndex((row) => row.runId === telemetry.runId);
      set({
        roundtrips:
          index >= 0
            ? rows.map((row, position) =>
                position === index ? telemetry : row
              )
            : [...rows, telemetry],
        activeRunId: TERMINAL_ROUNDTRIP_STATUSES.has(telemetry.status)
          ? null
          : telemetry.runId,
      });
    },

    setStructuredObject(view) {
      const current = get();
      if (!view) {
        set({ structuredObject: null });
        return;
      }
      const committedAt = new Date().toISOString();
      const duplicate = current.structuredObjectHistory.some(
        (entry) =>
          entry.runId === view.runId && entry.value === view.value
      );
      set({
        structuredObject: view,
        structuredObjectHistory: duplicate
          ? current.structuredObjectHistory
          : [
              ...current.structuredObjectHistory,
              { runId: view.runId, value: view.value, committedAt },
            ],
      });
    },

    commitStructuredObject(entry) {
      set((state) => ({
        structuredObjectHistory: [...state.structuredObjectHistory, entry],
      }));
    },

    setApproval(approval) {
      set({ approval });
    },

    setBackendAvailable(available) {
      set({ backendAvailable: available });
    },

    setError(error) {
      set({ error });
    },

    applyDemoEvent(event) {
      const state = get();
      const demo = state.demo;
      switch (event.kind) {
        case "workflow-steps":
          set({ demo: { ...demo, workflowSteps: [...event.steps] } });
          break;
        case "agent-step":
          set({ demo: { ...demo, agentStep: event.step } });
          break;
        case "nested-agent":
          set({ demo: { ...demo, nestedAgent: event.snapshot } });
          break;
        case "progress":
          set({ demo: { ...demo, progress: event.event } });
          break;
        case "orders":
          set({ demo: { ...demo, orders: [...event.orders] } });
          break;
        case "tracker":
          set({
            demo: {
              ...demo,
              tracker: {
                status: event.status,
                progress: event.progress,
                ...(event.label ? { label: event.label } : {}),
                ...(event.description
                  ? { description: event.description }
                  : {}),
              },
            },
          });
          break;
        case "weather":
          set({ demo: { ...demo, weather: event.weather } });
          break;
        case "notification": {
          const exists = demo.notifications.some(
            (entry) => entry.id === event.notification.id
          );
          set({
            demo: {
              ...demo,
              notifications: exists
                ? demo.notifications
                : [...demo.notifications, event.notification],
            },
          });
          break;
        }
        case "approval":
          set({
            approval: {
              runId: event.runId,
              status: event.status,
              ...(event.payload !== undefined
                ? { payload: event.payload }
                : {}),
              ...(event.toolName ? { toolName: event.toolName } : {}),
            },
          });
          break;
        case "reset":
          set({ demo: emptyDemoState(), approval: null });
          break;
        default:
          break;
      }
    },

    dismissNotification(id) {
      const demo = get().demo;
      set({
        demo: {
          ...demo,
          notifications: demo.notifications.filter((entry) => entry.id !== id),
        },
      });
    },

    reset() {
      set({
        roundtrips: [],
        structuredObject: null,
        structuredObjectHistory: [],
        approval: null,
        backendAvailable: get().backendAvailable,
        error: null,
        activeRunId: null,
        demo: emptyDemoState(),
      });
    },
  }));
}

/** Store handle type returned by {@link createAgentChatDecafStore}.
 * @memberOf module:for-react.agent
 */
export type AgentChatDecafStore = StoreApi<AgentChatDecafState>;
