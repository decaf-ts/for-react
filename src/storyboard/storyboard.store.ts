/**
 * @module module:for-react.storyboard.store
 * @description React-facing store for the storyboard tutorial.
 * @summary Wraps the framework-agnostic {@link StoryboardTutorialEngine} in a
 * module singleton plus `useSyncExternalStore` hooks, so React hosts subscribe to
 * the current state and status without a component library. The store adds
 * optional `sessionStorage` persistence for hard-reload survival and makes the
 * engine controls available to components and strategies.
 */

import { BadRequestError } from "@decaf-ts/db-decorators";
import { useSyncExternalStore } from "react";
import {
  StoryboardTutorialEngine,
  type StoryboardTutorialClock,
} from "./storyboard.engine.js";
import {
  TUTORIAL_STORAGE_KEY,
  type StoryboardTutorialControls,
  type StoryboardTutorialScenario,
  type StoryboardTutorialState,
  type StoryboardTutorialStep,
  type TutorialCompletionReason,
  type TutorialContext,
  type TutorialStatus,
} from "./storyboard.types.js";

/**
 * @description Subset of a running tutorial state persisted to `sessionStorage`.
 * @summary Only the scenario id, context, cursor and consumed step ids are stored;
 * the remaining steps and their functions are rebuilt from the registered
 * scenario on restore, so steps inserted dynamically by a prior run cannot
 * survive a reload.
 * @interface PersistedStoryboardTutorialState
 * @template C the tutorial context type
 * @memberOf module:for-react.storyboard.store
 */
export interface PersistedStoryboardTutorialState<
  C extends TutorialContext = TutorialContext
> {
  /** Identifier of the scenario the snapshot belongs to. */
  scenarioId: string;
  /** Accumulated context at the time of persistence. */
  context: C;
  /** Zero-based cursor of the active step within the original scenario. */
  cursor: number;
  /** Ids of the steps already consumed, in execution order. */
  completed: string[];
}

/**
 * @description Immutable projection React subscribers read from.
 * @summary Identity changes on every engine transition, so `useSyncExternalStore`
 * re-renders exactly when the state or status changes and never on unrelated
 * store activity.
 * @interface StoryboardTutorialSnapshot
 * @template C the tutorial context type
 * @memberOf module:for-react.storyboard.store
 */
export interface StoryboardTutorialSnapshot<
  C extends TutorialContext = TutorialContext
> {
  /** The current whole storyboard state, or null when no tutorial is running. */
  readonly state: StoryboardTutorialState<C> | null;
  /** The current lifecycle status. */
  readonly status: TutorialStatus;
}

/**
 * @description Callback invoked by the store whenever a snapshot changes.
 * @typedef {Function} StoryboardTutorialListener
 * @memberOf module:for-react.storyboard.store
 */
export type StoryboardTutorialListener = () => void;

/**
 * @description React store and module singleton for the storyboard tutorial.
 * @summary Owns one {@link StoryboardTutorialEngine}, projects its state/status
 * into an immutable snapshot for `useSyncExternalStore`, and implements the
 * {@link StoryboardTutorialControls} surface so components can drive the run.
 * Persistence is best-effort: when `sessionStorage` is unavailable or full the
 * in-memory run continues unaffected. The exported
 * {@link storyboardTutorialStore} is the default singleton; create a dedicated
 * instance with {@link createStoryboardTutorialStore} when hosts need isolation.
 * @class StoryboardTutorialStore
 * @template C the tutorial context type
 * @memberOf module:for-react.storyboard.store
 */
export class StoryboardTutorialStore<
  C extends TutorialContext = TutorialContext
> implements StoryboardTutorialControls<C>
{
  private currentState: StoryboardTutorialState<C> | null = null;

  private currentStatus: TutorialStatus = "idle";

  private snapshot: StoryboardTutorialSnapshot<C> = {
    state: null,
    status: "idle",
  };

  private readonly listeners = new Set<StoryboardTutorialListener>();

  private persistEnabled = true;

  private readonly engine: StoryboardTutorialEngine<C>;

  /**
   * @description Creates a store wrapping a fresh engine.
   * @param clock optional injectable time source forwarded to the engine.
   * @memberOf module:for-react.storyboard.store
   */
  constructor(clock?: StoryboardTutorialClock) {
    this.engine = new StoryboardTutorialEngine<C>(
      (state, status) => this.handleChange(state, status),
      clock
    );
  }

  /**
   * @description The current whole storyboard state, or null when idle.
   * @memberOf module:for-react.storyboard.store
   */
  get state(): StoryboardTutorialState<C> | null {
    return this.currentState;
  }

  /**
   * @description The current lifecycle status.
   * @memberOf module:for-react.storyboard.store
   */
  get status(): TutorialStatus {
    return this.currentStatus;
  }

  /**
   * @description The currently active step, or null when idle.
   * @memberOf module:for-react.storyboard.store
   */
  get active(): StoryboardTutorialStep<C> | null {
    return this.currentState?.steps[0] ?? null;
  }

  /**
   * @description Whether a step is active and the run is running.
   * @memberOf module:for-react.storyboard.store
   */
  get isRunning(): boolean {
    return this.currentStatus === "running" && !!this.active;
  }

  /**
   * @description Engine controls for components and strategies.
   * @memberOf module:for-react.storyboard.store
   */
  get controls(): StoryboardTutorialControls<C> {
    return this.engine;
  }

  /**
   * @description Subscribes a listener to snapshot changes.
   * @param listener the callback to invoke on every transition.
   * @returns an unsubscribe function.
   * @memberOf module:for-react.storyboard.store
   */
  subscribe = (listener: StoryboardTutorialListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * @description Returns the current snapshot for `useSyncExternalStore`.
   * @returns the current immutable snapshot.
   * @memberOf module:for-react.storyboard.store
   */
  getSnapshot = (): StoryboardTutorialSnapshot<C> => this.snapshot;

  /**
   * @description Returns the server snapshot, identical to {@link getSnapshot}
   * because the store holds no server-specific state.
   * @returns the current immutable snapshot.
   * @memberOf module:for-react.storyboard.store
   */
  getServerSnapshot = (): StoryboardTutorialSnapshot<C> => this.snapshot;

  /**
   * @description Registers a scenario and resumes or starts it as configured.
   * @summary Registers the scenario with the engine, applies the scenario or
   * option persistence flag, then (in order) returns the current run, restores a
   * persisted snapshot for the same scenario id, or starts a new run when
   * `autoStart` is set. Binding is idempotent while a run is active.
   * @param scenario the scenario to bind.
   * @param options optional persistence and auto-start overrides.
   * @returns the active or restored state, or null when nothing started.
   * @memberOf module:for-react.storyboard.store
   */
  bind(
    scenario: StoryboardTutorialScenario<C>,
    options: { persist?: boolean; autoStart?: boolean } = {}
  ): StoryboardTutorialState<C> | null {
    if (!scenario?.id)
      throw new BadRequestError("A storyboard tutorial scenario requires an id");
    this.engine.register(scenario);
    if (options.persist !== undefined) this.persistEnabled = options.persist;
    if (scenario.persist !== undefined) this.persistEnabled = scenario.persist;

    if (this.currentState) return this.currentState;
    const snapshot = this.readSnapshot(scenario.id);
    if (snapshot) return this.engine.restore(scenario, snapshot);
    if (options.autoStart) return this.start(scenario);
    return null;
  }

  /**
   * @description Starts a scenario by instance or registered id.
   * @param scenarioOrId the scenario instance or a registered scenario id.
   * @param context optional initial context overriding the scenario's own.
   * @returns the initial storyboard state.
   * @memberOf module:for-react.storyboard.store
   */
  start(
    scenarioOrId: StoryboardTutorialScenario<C> | string,
    context?: C
  ): StoryboardTutorialState<C> {
    return this.engine.start(scenarioOrId, context);
  }

  /**
   * @description Executes the active step and advances the storyboard.
   * @returns the resulting state, or null when the tutorial has ended.
   * @memberOf module:for-react.storyboard.store
   */
  next(): Promise<StoryboardTutorialState<C> | null> {
    return this.engine.next();
  }

  /**
   * @description Requests completion of the active step using its policy.
   * @param reason why the completion is being requested; defaults to `external`.
   * @returns true when the step advanced, false when deferred or ignored.
   * @memberOf module:for-react.storyboard.store
   */
  complete(reason?: TutorialCompletionReason): Promise<boolean> {
    return this.engine.complete(reason);
  }

  /**
   * @description Returns to the previous step.
   * @returns the restored state, or null when idle.
   * @memberOf module:for-react.storyboard.store
   */
  previous(): StoryboardTutorialState<C> | null {
    return this.engine.previous();
  }

  /**
   * @description Jumps to the step with the given id.
   * @param stepId the id of the step to jump to.
   * @returns the resulting state, or null when idle.
   * @memberOf module:for-react.storyboard.store
   */
  goTo(stepId: string): StoryboardTutorialState<C> | null {
    return this.engine.goTo(stepId);
  }

  /**
   * @description Aborts the running tutorial.
   * @returns null, always.
   * @memberOf module:for-react.storyboard.store
   */
  abort(): StoryboardTutorialState<C> | null {
    return this.engine.abort();
  }

  /**
   * @description Ends the running tutorial successfully.
   * @returns null, always.
   * @memberOf module:for-react.storyboard.store
   */
  end(): StoryboardTutorialState<C> | null {
    return this.engine.end();
  }

  /**
   * @description Removes the persisted snapshot from `sessionStorage`.
   * @summary Always removes the storage key, even when persistence is disabled
   * for the active scenario, so a snapshot left behind by an earlier `persist:true`
   * session cannot leak tutorial context. The `persistEnabled` flag is
   * deliberately left untouched: re-enabling persistence here would contradict a
   * `persist:false` configuration and let the next transition write context back
   * to storage (a documented improvement over the Angular baseline, which
   * short-circuits under `persist:false` and leaves stale snapshots in place).
   * Storage failures are swallowed, matching {@link writeSnapshot}.
   * @memberOf module:for-react.storyboard.store
   */
  clearPersisted(): void {
    const storage = this.storage();
    if (!storage) return;
    try {
      storage.removeItem(TUTORIAL_STORAGE_KEY);
    } catch {
      // Storage can be unavailable; clearing is best-effort, matching writeSnapshot.
    }
  }

  /**
   * @description Projects an engine transition into a fresh snapshot and notifies listeners.
   * @param state the new state, or null once the run stops.
   * @param status the new status.
   * @memberOf module:for-react.storyboard.store
   */
  private handleChange(
    state: StoryboardTutorialState<C> | null,
    status: TutorialStatus
  ): void {
    this.currentState = state;
    this.currentStatus = status;
    this.snapshot = { state, status };
    this.writeSnapshot(state);
    for (const listener of [...this.listeners]) listener();
  }

  /**
   * @description Reads the persisted snapshot for a scenario, when present.
   * @param scenarioId the scenario id the snapshot must belong to.
   * @returns the parsed snapshot, or null when absent, stale or unreadable.
   * @memberOf module:for-react.storyboard.store
   */
  private readSnapshot(
    scenarioId: string
  ): PersistedStoryboardTutorialState<C> | null {
    const storage = this.storage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(TUTORIAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedStoryboardTutorialState<C>;
      if (parsed?.scenarioId !== scenarioId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * @description Persists the running state, or clears it once the run stops.
   * @summary Best-effort: unavailable or full storage is swallowed so the
   * in-memory run is never blocked by persistence.
   * @param state the state to persist, or null to clear the stored snapshot.
   * @memberOf module:for-react.storyboard.store
   */
  private writeSnapshot(state: StoryboardTutorialState<C> | null): void {
    if (!this.persistEnabled) return;
    const storage = this.storage();
    if (!storage) return;
    try {
      if (!state || state.status !== "running") {
        storage.removeItem(TUTORIAL_STORAGE_KEY);
        return;
      }
      const snapshot: PersistedStoryboardTutorialState<C> = {
        scenarioId: state.scenarioId,
        context: state.context,
        cursor: state.cursor,
        completed: state.completed,
      };
      storage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage can be unavailable or full; persistence is best-effort and
      // never blocks the in-memory run.
    }
  }

  /**
   * @description Resolves `sessionStorage`, or null when it is unavailable.
   * @returns the storage instance, or null.
   * @memberOf module:for-react.storyboard.store
   */
  private storage(): Storage | null {
    try {
      return globalThis.sessionStorage ?? null;
    } catch {
      return null;
    }
  }
}

/**
 * @description Creates an isolated store for hosts that need more than one tutorial.
 * @template C the tutorial context type
 * @param clock optional injectable time source forwarded to the engine.
 * @returns a new store instance.
 * @memberOf module:for-react.storyboard.store
 */
export function createStoryboardTutorialStore<
  C extends TutorialContext = TutorialContext
>(clock?: StoryboardTutorialClock): StoryboardTutorialStore<C> {
  return new StoryboardTutorialStore<C>(clock);
}

/**
 * @description Default module-singleton store shared by the React host and hooks.
 * @summary Use {@link createStoryboardTutorialStore} when a host needs isolated
 * tutorial state.
 * @constant
 * @type {StoryboardTutorialStore}
 * @memberOf module:for-react.storyboard.store
 */
export const storyboardTutorialStore = new StoryboardTutorialStore();

/**
 * @description Subscribes a component to the full tutorial snapshot.
 * @summary Uses `useSyncExternalStore` so the component re-renders only when the
 * store's snapshot identity changes. Defaults to the module singleton.
 * @template C the tutorial context type
 * @param store the store to subscribe to; defaults to {@link storyboardTutorialStore}.
 * @returns the current state/status snapshot.
 * @memberOf module:for-react.storyboard.store
 */
export function useStoryboardTutorial<
  C extends TutorialContext = TutorialContext
>(
  store: StoryboardTutorialStore<C> = storyboardTutorialStore as unknown as StoryboardTutorialStore<C>
): StoryboardTutorialSnapshot<C> {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}

/**
 * @description Selects the current whole storyboard state.
 * @template C the tutorial context type
 * @param store the store to read; defaults to the module singleton.
 * @returns the current state, or null when idle.
 * @memberOf module:for-react.storyboard.store
 */
export function useStoryboardTutorialState<
  C extends TutorialContext = TutorialContext
>(
  store?: StoryboardTutorialStore<C>
): StoryboardTutorialState<C> | null {
  return useStoryboardTutorial(store).state;
}

/**
 * @description Selects the current lifecycle status.
 * @template C the tutorial context type
 * @param store the store to read; defaults to the module singleton.
 * @returns the current status.
 * @memberOf module:for-react.storyboard.store
 */
export function useStoryboardTutorialStatus<
  C extends TutorialContext = TutorialContext
>(store?: StoryboardTutorialStore<C>): TutorialStatus {
  return useStoryboardTutorial(store).status;
}

/**
 * @description Selects the currently active step.
 * @template C the tutorial context type
 * @param store the store to read; defaults to the module singleton.
 * @returns the active step, or null when idle.
 * @memberOf module:for-react.storyboard.store
 */
export function useStoryboardTutorialActive<
  C extends TutorialContext = TutorialContext
>(
  store?: StoryboardTutorialStore<C>
): StoryboardTutorialStep<C> | null {
  return useStoryboardTutorial(store).state?.steps[0] ?? null;
}

/**
 * @description Selects whether a step is currently running.
 * @template C the tutorial context type
 * @param store the store to read; defaults to the module singleton.
 * @returns true when the run is running and has an active step.
 * @memberOf module:for-react.storyboard.store
 */
export function useStoryboardTutorialRunning<
  C extends TutorialContext = TutorialContext
>(store?: StoryboardTutorialStore<C>): boolean {
  const snapshot = useStoryboardTutorial(store);
  return (
    snapshot.status === "running" && !!snapshot.state?.steps[0]
  );
}
