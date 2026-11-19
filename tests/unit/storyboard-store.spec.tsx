/**
 * @module for-react/storyboard-store.spec
 * @summary SAA-2055 — contract for the React storyboard tutorial store and its
 * `useSyncExternalStore` hooks.
 * @description Proves `bind({persist,autoStart})`, the sessionStorage snapshot
 * write/read/clear cycle, restore on a fresh store, the `state/status/active/
 * isRunning` surface, the id-less scenario guard and every
 * `useStoryboardTutorial*` hook under React 19.
 */
import { act, renderHook } from "@testing-library/react";
import { BadRequestError } from "@decaf-ts/db-decorators";
import {
  createStoryboardTutorialStore,
  StoryboardTutorialStore,
  TUTORIAL_STORAGE_KEY,
  useStoryboardTutorial,
  useStoryboardTutorialActive,
  useStoryboardTutorialRunning,
  useStoryboardTutorialState,
  useStoryboardTutorialStatus,
  type StoryboardTutorialScenario,
} from "../../src/storyboard";

type Ctx = Record<string, unknown>;

function scenario(
  overrides: Partial<StoryboardTutorialScenario<Ctx>> = {}
): StoryboardTutorialScenario<Ctx> {
  return {
    id: "store-scenario",
    context: { count: 0 },
    steps: [{ id: "one" }, { id: "two" }, { id: "three" }],
    ...overrides,
  };
}

describe("StoryboardTutorialStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("starts idle with no state or active step", () => {
    const store = new StoryboardTutorialStore<Ctx>();

    expect(store.state).toBeNull();
    expect(store.status).toBe("idle");
    expect(store.active).toBeNull();
    expect(store.isRunning).toBe(false);
    expect(store.getSnapshot()).toEqual({ state: null, status: "idle" });
    expect(store.getServerSnapshot()).toEqual(store.getSnapshot());
  });

  it("starts the scenario when bind is called with autoStart", () => {
    const store = createStoryboardTutorialStore<Ctx>();

    const state = store.bind(scenario(), { autoStart: true });

    expect(state?.steps[0].id).toBe("one");
    expect(store.active?.id).toBe("one");
    expect(store.status).toBe("running");
    expect(store.isRunning).toBe(true);
  });

  it("only registers the scenario when bind is called without autoStart", () => {
    const store = createStoryboardTutorialStore<Ctx>();

    const state = store.bind(scenario());

    expect(state).toBeNull();
    expect(store.state).toBeNull();
    expect(store.status).toBe("idle");
  });

  it("returns the running state when bind is called again", () => {
    const store = createStoryboardTutorialStore<Ctx>();
    const first = store.bind(scenario(), { autoStart: true });

    const second = store.bind(scenario(), { autoStart: true });

    expect(second).toBe(first);
    expect(store.active?.id).toBe("one");
  });

  it("rejects a scenario without an id on bind", () => {
    const store = createStoryboardTutorialStore<Ctx>();

    expect(() => store.bind(scenario({ id: "" }), { autoStart: true })).toThrow(
      BadRequestError
    );
  });

  it("starts a registered scenario by id", () => {
    const store = createStoryboardTutorialStore<Ctx>();
    const registered = scenario({ id: "by-id" });
    store.bind(registered);

    const state = store.start("by-id");

    expect(state.scenarioId).toBe("by-id");
    expect(store.active?.id).toBe("one");
  });

  it("exposes navigation and terminal transitions through the store", async () => {
    const store = createStoryboardTutorialStore<Ctx>();
    store.bind(scenario(), { autoStart: true });

    await store.next();
    expect(store.active?.id).toBe("two");

    const previous = store.previous();
    expect(previous?.steps[0].id).toBe("one");
    expect(store.active?.id).toBe("one");

    store.abort();
    expect(store.state).toBeNull();
    expect(store.status).toBe("aborted");
    expect(store.isRunning).toBe(false);
  });

  it("exposes the engine controls for imperative completion", async () => {
    const store = createStoryboardTutorialStore<Ctx>();
    store.bind(scenario(), { autoStart: true });

    expect(store.controls.state?.steps[0].id).toBe("one");
    expect(await store.complete("external")).toBe(true);
    expect(store.active?.id).toBe("two");
  });

  it("notifies subscribers and emits a new snapshot on every transition", () => {
    const store = createStoryboardTutorialStore<Ctx>();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getSnapshot();

    store.start(scenario());
    const afterStart = store.getSnapshot();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(afterStart).not.toBe(before);
    expect(afterStart.status).toBe("running");

    store.abort();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.start(scenario());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  describe("sessionStorage persistence", () => {
    it("writes a snapshot while running and clears it once stopped", async () => {
      const store = createStoryboardTutorialStore<Ctx>();
      store.bind(scenario({ persist: true }), { persist: true, autoStart: true });

      await store.next();
      await store.next();

      const raw = sessionStorage.getItem(TUTORIAL_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const snapshot = JSON.parse(raw as string);
      expect(snapshot.scenarioId).toBe("store-scenario");
      expect(snapshot.completed).toEqual(["one", "two"]);
      expect(snapshot.cursor).toBe(2);

      store.end();
      expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull();
    });

    it("restores a run on a fresh store", async () => {
      const persisted = scenario({ id: "persisted", persist: true });
      const store = createStoryboardTutorialStore<Ctx>();
      store.bind(persisted, { persist: true, autoStart: true });
      await store.next();
      await store.next();

      const fresh = createStoryboardTutorialStore<Ctx>();
      const restored = fresh.bind(persisted, { persist: true });

      expect(restored?.steps[0].id).toBe("three");
      expect(fresh.active?.id).toBe("three");
      expect(fresh.state?.completed).toEqual(["one", "two"]);
      expect(fresh.status).toBe("running");
      expect(fresh.isRunning).toBe(true);

      fresh.clearPersisted();
      expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull();
    });

    it("ignores a snapshot belonging to a different scenario", async () => {
      const store = createStoryboardTutorialStore<Ctx>();
      store.bind(scenario({ id: "first", persist: true }), {
        persist: true,
        autoStart: true,
      });
      await store.next();

      const other = createStoryboardTutorialStore<Ctx>();
      const restored = other.bind(scenario({ id: "second" }), { persist: true });

      expect(restored).toBeNull();
      expect(other.state).toBeNull();
    });

    it("does not persist when persistence is disabled", async () => {
      const store = createStoryboardTutorialStore<Ctx>();
      store.bind(scenario(), { persist: false, autoStart: true });

      await store.next();

      expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull();
    });

    it("lets the scenario persistence flag win over the bind option", async () => {
      const store = createStoryboardTutorialStore<Ctx>();
      store.bind(scenario({ persist: true }), {
        persist: false,
        autoStart: true,
      });

      await store.next();

      expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeTruthy();
    });

    it("survives malformed storage without blocking the run", () => {
      sessionStorage.setItem(TUTORIAL_STORAGE_KEY, "{not json");
      const store = createStoryboardTutorialStore<Ctx>();

      const state = store.bind(scenario({ persist: true }), {
        persist: true,
        autoStart: true,
      });

      expect(state?.steps[0].id).toBe("one");
      expect(store.isRunning).toBe(true);
    });

    it("does not re-enable persistence when clearPersisted runs under persist:false", async () => {
      const store = createStoryboardTutorialStore<Ctx>();
      store.bind(scenario(), { persist: false });
      store.clearPersisted();

      store.start(scenario());
      await store.next();

      expect(store.isRunning).toBe(true);
      expect(store.state?.completed).toEqual(["one"]);
      expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull();
    });

    it("purges a stale snapshot left by a prior persist:true session", async () => {
      const previous = createStoryboardTutorialStore<Ctx>();
      previous.bind(scenario({ id: "previous-run", persist: true }), {
        persist: true,
        autoStart: true,
      });
      await previous.next();
      expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeTruthy();

      const store = createStoryboardTutorialStore<Ctx>();
      store.bind(scenario({ id: "current-run" }), { persist: false });
      store.clearPersisted();

      expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull();
    });
  });
});

describe("useStoryboardTutorial* hooks", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  function useAll(store: StoryboardTutorialStore<Ctx>) {
    return {
      full: useStoryboardTutorial(store),
      state: useStoryboardTutorialState(store),
      status: useStoryboardTutorialStatus(store),
      active: useStoryboardTutorialActive(store),
      running: useStoryboardTutorialRunning(store),
    };
  }

  it("tracks the store through start, next and end", async () => {
    const store = createStoryboardTutorialStore<Ctx>();
    const { result } = renderHook(() => useAll(store));

    expect(result.current.full.status).toBe("idle");
    expect(result.current.state).toBeNull();
    expect(result.current.active).toBeNull();
    expect(result.current.running).toBe(false);

    act(() => {
      store.start(scenario());
    });

    expect(result.current.full.status).toBe("running");
    expect(result.current.status).toBe("running");
    expect(result.current.state?.steps[0].id).toBe("one");
    expect(result.current.active?.id).toBe("one");
    expect(result.current.running).toBe(true);

    await act(async () => {
      await store.next();
    });

    expect(result.current.active?.id).toBe("two");
    expect(result.current.state?.completed).toEqual(["one"]);

    act(() => {
      store.end();
    });

    expect(result.current.full.status).toBe("completed");
    expect(result.current.state).toBeNull();
    expect(result.current.active).toBeNull();
    expect(result.current.running).toBe(false);
  });

  it("reflects an abort", async () => {
    const store = createStoryboardTutorialStore<Ctx>();
    const { result } = renderHook(() => ({
      status: useStoryboardTutorialStatus(store),
      running: useStoryboardTutorialRunning(store),
    }));

    act(() => {
      store.start(scenario());
    });
    expect(result.current.running).toBe(true);

    act(() => {
      store.abort();
    });

    expect(result.current.status).toBe("aborted");
    expect(result.current.running).toBe(false);
  });

  it("reacts to a restore performed by bind", async () => {
    const persisted = scenario({ id: "hook-restore", persist: true });
    const seed = createStoryboardTutorialStore<Ctx>();
    seed.bind(persisted, { persist: true, autoStart: true });
    await seed.next();

    const store = createStoryboardTutorialStore<Ctx>();
    const { result } = renderHook(() => useStoryboardTutorialState(store));

    act(() => {
      store.bind(persisted, { persist: true });
    });

    expect(result.current?.steps[0].id).toBe("two");
  });
});
