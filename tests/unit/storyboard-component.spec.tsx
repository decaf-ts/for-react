/**
 * @module for-react/storyboard-component.spec
 * @summary SAA-2055 — host component contract for the React storyboard
 * tutorial, mapping the Angular `storyboard-tutorial.component.spec.ts`
 * scenarios onto the React store + component pair.
 * @description Covers whitelist blocking (attribute, pointer-events and
 * clip-path holes), keyboard blocking/allowing, strategy precedence
 * (step > scenario > prop > default), the bubble Next/Previous/Skip/Finish and
 * progress controls, the active class, `onStarted`/`onStepped`/`onFinished`,
 * unmount-without-abort resume and the sessionStorage restore path.
 */
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import {
  createStoryboardTutorialStore,
  FadeFocusStrategy,
  HighlightFocusStrategy,
  StoryboardTutorial,
  storyboardTutorialStore,
  TUTORIAL_ACTIVE_CLASS,
  TUTORIAL_BUBBLE_CLASS,
  TUTORIAL_FADE_CLASS,
  TUTORIAL_HIGHLIGHT_CLASS,
  TUTORIAL_HIGHLIGHT_TARGET_CLASS,
  TUTORIAL_WHITELIST_ATTRIBUTE,
  type StoryboardTutorialScenario,
  type StoryboardTutorialState,
  type StoryboardTutorialStore,
  type TutorialFocusStrategy,
  type TutorialMessageContext,
  type TutorialMessageStrategy,
  type TutorialStatus,
} from "../../src/storyboard";

type Ctx = Record<string, unknown>;

const RECT = {
  left: 10,
  top: 20,
  right: 110,
  bottom: 70,
  width: 100,
  height: 50,
  x: 10,
  y: 20,
  toJSON: () => ({}),
} as DOMRect;

function makeTarget(id: string, tag = "button"): HTMLElement {
  const target = document.createElement(tag);
  target.id = id;
  target.className = "spec-target";
  jest.spyOn(target, "getBoundingClientRect").mockReturnValue(RECT);
  document.body.appendChild(target);
  return target;
}

class SpyFocusStrategy implements TutorialFocusStrategy<Ctx> {
  readonly name: string;
  readonly apply = jest.fn();
  readonly clear = jest.fn();

  constructor(name: string) {
    this.name = name;
  }
}

class SpyMessageStrategy implements TutorialMessageStrategy<Ctx> {
  readonly name: string;
  readonly renderSpy = jest.fn();
  readonly clear = jest.fn();

  constructor(name: string) {
    this.name = name;
  }

  render(context: TutorialMessageContext<Ctx>): void {
    this.renderSpy(context);
  }
}

interface RenderOptions {
  store?: StoryboardTutorialStore<Ctx>;
  autoStart?: boolean;
  persist?: boolean;
  focusStrategy?: TutorialFocusStrategy<Ctx>;
  messageStrategy?: TutorialMessageStrategy<Ctx>;
  onStarted?: (state: StoryboardTutorialState<Ctx>) => void;
  onStepped?: (state: StoryboardTutorialState<Ctx>) => void;
  onFinished?: (status: TutorialStatus) => void;
}

function renderTutorial(
  scenario: StoryboardTutorialScenario<Ctx>,
  options: RenderOptions = {}
) {
  const store = options.store ?? createStoryboardTutorialStore<Ctx>();
  const view = render(
    <StoryboardTutorial<Ctx>
      scenario={scenario}
      store={store}
      autoStart={options.autoStart ?? true}
      persist={options.persist ?? false}
      instanceId="spec-host"
      focusStrategy={options.focusStrategy}
      messageStrategy={options.messageStrategy}
      onStarted={options.onStarted}
      onStepped={options.onStepped}
      onFinished={options.onFinished}
    />
  );
  return { ...view, store };
}

function host(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>("#spec-host");
  if (!element) throw new Error("storyboard host not rendered");
  return element;
}

function overlay(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    ".dcf-storyboard-tutorial__overlay"
  );
  if (!element) throw new Error("overlay not rendered");
  return element;
}

function bubble(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `.${TUTORIAL_BUBBLE_CLASS}`
  );
  if (!element) throw new Error("bubble not rendered");
  return element;
}

function button(container: HTMLElement, selector: string): HTMLButtonElement {
  const element = bubble(container).querySelector<HTMLButtonElement>(selector);
  if (!element) throw new Error(`button "${selector}" not rendered`);
  return element;
}

function progress(container: HTMLElement): string | null {
  return (
    bubble(container).querySelector(
      ".dcf-storyboard-tutorial__bubble-progress"
    )?.textContent ?? null
  );
}

describe("StoryboardTutorial component", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    document
      .querySelectorAll(".spec-target")
      .forEach((element) => element.remove());
    sessionStorage.clear();
  });

  describe("interaction blocking", () => {
    it("marks whitelisted targets and cuts overlay holes while a step is active", async () => {
      const target = makeTarget("whitelist-on");
      const { container, store } = renderTutorial({
        id: "block-on",
        steps: [{ id: "s1", whitelist: ["#whitelist-on"] }],
      });

      await waitFor(() => expect(store.isRunning).toBe(true));
      await waitFor(() =>
        expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBe("true")
      );

      expect(target.style.pointerEvents).toBe("auto");
      await waitFor(() =>
        expect(overlay(container).style.clipPath).toContain("polygon(evenodd")
      );
      expect(overlay(container).style.clipPath).toContain("10px 20px");
      expect(overlay(container).style.clipPath).toContain("110px 70px");
      expect(host(container).classList.contains(TUTORIAL_ACTIVE_CLASS)).toBe(
        true
      );
    });

    it("leaves every element unmarked when a step has no whitelist", async () => {
      const target = makeTarget("whitelist-off");
      const { container, store } = renderTutorial({
        id: "block-off",
        steps: [{ id: "s1" }],
      });

      await waitFor(() => expect(store.isRunning).toBe(true));

      expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBeNull();
      expect(target.style.pointerEvents).toBe("");
      expect(overlay(container).style.clipPath).toBe("");
    });

    it("clears the whitelist attribute and overlay clip-path on end", async () => {
      const target = makeTarget("clear-on-end");
      const { container, store } = renderTutorial({
        id: "clear-end",
        steps: [{ id: "s1", whitelist: ["#clear-on-end"] }],
      });
      await waitFor(() =>
        expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBe("true")
      );

      act(() => {
        store.end();
      });

      await waitFor(() =>
        expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBeNull()
      );
      expect(target.style.pointerEvents).toBe("");
      expect(overlay(container).style.clipPath).toBe("");
      expect(host(container).classList.contains(TUTORIAL_ACTIVE_CLASS)).toBe(
        false
      );
    });

    it("clears the whitelist attribute and overlay clip-path on abort", async () => {
      const target = makeTarget("clear-on-abort");
      const { container, store } = renderTutorial({
        id: "clear-abort",
        steps: [{ id: "s1", whitelist: ["#clear-on-abort"] }],
      });
      await waitFor(() =>
        expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBe("true")
      );

      act(() => {
        store.abort();
      });

      await waitFor(() =>
        expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBeNull()
      );
      expect(overlay(container).style.clipPath).toBe("");
    });
  });

  describe("keyboard blocking", () => {
    it("prevents keydown on non-whitelisted page elements while a step is active", async () => {
      makeTarget("keyboard-whitelisted");
      const { store } = renderTutorial({
        id: "keyboard-blocked",
        steps: [{ id: "s1", whitelist: ["#keyboard-whitelisted"] }],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      const outside = document.createElement("input");
      document.body.appendChild(outside);
      try {
        const allowed = fireEvent.keyDown(outside, {
          key: "a",
          bubbles: true,
          cancelable: true,
        });
        expect(allowed).toBe(false);
      } finally {
        outside.remove();
      }
    });

    it("allows keydown on a whitelisted target while a step is active", async () => {
      const target = makeTarget("keyboard-allow");
      const { store } = renderTutorial({
        id: "keyboard-allowed",
        steps: [{ id: "s1", whitelist: ["#keyboard-allow"] }],
      });
      await waitFor(() =>
        expect(target.getAttribute(TUTORIAL_WHITELIST_ATTRIBUTE)).toBe("true")
      );

      const allowed = fireEvent.keyDown(target, {
        key: "a",
        bubbles: true,
        cancelable: true,
      });
      expect(allowed).toBe(true);
      expect(store.isRunning).toBe(true);
    });

    it("allows keydown inside the tutorial host while a step is active", async () => {
      const { container, store } = renderTutorial({
        id: "keyboard-host",
        steps: [{ id: "s1" }],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      const allowed = fireEvent.keyDown(host(container), {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      });
      expect(allowed).toBe(true);
    });

    it("does not block keydown when no tutorial is running", async () => {
      const { store } = renderTutorial(
        { id: "keyboard-idle", steps: [{ id: "s1" }] },
        { autoStart: false }
      );
      await waitFor(() => expect(store.state).toBeNull());

      const outside = document.createElement("input");
      document.body.appendChild(outside);
      try {
        const allowed = fireEvent.keyDown(outside, {
          key: "a",
          bubbles: true,
          cancelable: true,
        });
        expect(allowed).toBe(true);
      } finally {
        outside.remove();
      }
    });
  });

  describe("bubble navigation controls", () => {
    it("advances the active step when the bubble Next control is clicked", async () => {
      const { container, store } = renderTutorial({
        id: "bubble-next",
        steps: [
          { id: "s1", title: "One" },
          { id: "s2", title: "Two" },
          { id: "s3", title: "Three" },
        ],
      });
      await waitFor(() => expect(container.querySelector(`.${TUTORIAL_BUBBLE_CLASS}`)).toBeTruthy());

      expect(progress(container)).toBe("1 / 3");
      expect(button(container, ".dcf-storyboard-tutorial__bubble-button").disabled).toBe(true);
      expect(button(container, ".dcf-storyboard-tutorial__bubble-primary").textContent).toBe("Next");

      fireEvent.click(button(container, ".dcf-storyboard-tutorial__bubble-primary"));

      await waitFor(() => expect(store.active?.id).toBe("s2"));
      expect(progress(container)).toBe("2 / 3");
      expect(
        button(container, ".dcf-storyboard-tutorial__bubble-button").disabled
      ).toBe(false);
    });

    it("returns to the previous step when the bubble Previous control is clicked", async () => {
      const { container, store } = renderTutorial({
        id: "bubble-previous",
        steps: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      fireEvent.click(button(container, ".dcf-storyboard-tutorial__bubble-primary"));
      await waitFor(() => expect(store.active?.id).toBe("s2"));
      expect(progress(container)).toBe("2 / 3");

      fireEvent.click(button(container, ".dcf-storyboard-tutorial__bubble-button"));

      await waitFor(() => expect(store.active?.id).toBe("s1"));
      expect(progress(container)).toBe("1 / 3");
      expect(
        button(container, ".dcf-storyboard-tutorial__bubble-button").disabled
      ).toBe(true);
    });

    it("reports finished(aborted) when the bubble Skip control is clicked", async () => {
      const onFinished = jest.fn();
      const { container, store } = renderTutorial(
        { id: "bubble-skip", steps: [{ id: "s1" }, { id: "s2" }] },
        { onFinished }
      );
      await waitFor(() => expect(store.isRunning).toBe(true));

      expect(
        button(container, ".dcf-storyboard-tutorial__bubble-abort").textContent
      ).toBe("Skip");

      fireEvent.click(button(container, ".dcf-storyboard-tutorial__bubble-abort"));

      await waitFor(() => expect(store.isRunning).toBe(false));
      expect(onFinished).toHaveBeenCalledWith("aborted");
    });

    it("focuses the bubble, traps Tab, aborts on Escape and restores prior focus", async () => {
      const opener = document.createElement("button");
      opener.textContent = "opener";
      document.body.appendChild(opener);
      opener.focus();
      try {
        const { container, store } = renderTutorial({
          id: "bubble-focus",
          steps: [{ id: "s1" }, { id: "s2" }],
        });
        await waitFor(() =>
          expect(container.querySelector(`.${TUTORIAL_BUBBLE_CLASS}`)).toBeTruthy()
        );

        expect(document.activeElement).toBe(bubble(container));

        const buttons = Array.from(
          bubble(container).querySelectorAll<HTMLButtonElement>(
            "button:not([disabled])"
          )
        );
        buttons[buttons.length - 1].focus();
        fireEvent.keyDown(bubble(container), {
          key: "Tab",
          cancelable: true,
        });
        expect(document.activeElement).toBe(buttons[0]);

        fireEvent.keyDown(bubble(container), {
          key: "Escape",
          cancelable: true,
        });

        await waitFor(() => expect(store.isRunning).toBe(false));
        expect(store.status).toBe("aborted");
        await waitFor(() => expect(document.activeElement).toBe(opener));
      } finally {
        opener.remove();
      }
    });

    it("shows Finish on a step marked final and reports the progress text", async () => {
      const { container, store } = renderTutorial({
        id: "bubble-final",
        steps: [{ id: "s1" }, { id: "s2", final: true }, { id: "s3" }],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));
      expect(
        button(container, ".dcf-storyboard-tutorial__bubble-primary").textContent
      ).toBe("Next");

      fireEvent.click(button(container, ".dcf-storyboard-tutorial__bubble-primary"));

      await waitFor(() => expect(store.active?.id).toBe("s2"));
      expect(
        button(container, ".dcf-storyboard-tutorial__bubble-primary").textContent
      ).toBe("Finish");
      expect(progress(container)).toBe("2 / 3");
    });

    it("shows Finish on the last step", async () => {
      const { container, store } = renderTutorial({
        id: "bubble-last",
        steps: [{ id: "s1" }, { id: "s2" }],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      fireEvent.click(button(container, ".dcf-storyboard-tutorial__bubble-primary"));
      await waitFor(() => expect(store.active?.id).toBe("s2"));

      expect(
        button(container, ".dcf-storyboard-tutorial__bubble-primary").textContent
      ).toBe("Finish");
      expect(progress(container)).toBe("2 / 2");
    });

    it("completes from the bubble close control when the step has a completion policy", async () => {
      const { container, store } = renderTutorial({
        id: "close-trigger",
        completion: { minTime: 0 },
        steps: [{ id: "s1" }, { id: "s2" }],
      });
      await waitFor(() =>
        expect(
          container.querySelector(".dcf-storyboard-tutorial__bubble-close")
        ).toBeTruthy()
      );

      fireEvent.click(
        container.querySelector(
          ".dcf-storyboard-tutorial__bubble-close"
        ) as HTMLButtonElement
      );

      await waitFor(() => expect(store.active?.id).toBe("s2"));
    });
  });

  describe("pluggable completion", () => {
    it("advances when the declared click action is detected within the selector", async () => {
      const target = makeTarget("comp-action");
      const { store } = renderTutorial({
        id: "comp-action-scenario",
        steps: [
          {
            id: "s1",
            completion: {
              action: { type: "click", selector: "#comp-action" },
            },
          },
          { id: "s2" },
        ],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      fireEvent.click(target);

      await waitFor(() => expect(store.active?.id).toBe("s2"));
    });

    it("detects actions only within the step whitelist when no action selector is set", async () => {
      const whitelisted = makeTarget("whitelist-action");
      const blocked = makeTarget("whitelist-action-blocked");
      const { store } = renderTutorial({
        id: "whitelist-action-scenario",
        steps: [
          {
            id: "s1",
            whitelist: ["#whitelist-action"],
            completion: { action: { type: "click" } },
          },
          { id: "s2" },
        ],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      fireEvent.click(blocked);
      expect(store.active?.id).toBe("s1");

      fireEvent.click(whitelisted);
      await waitFor(() => expect(store.active?.id).toBe("s2"));
    });

    it("advances when the app calls the exposed complete API", async () => {
      const { store } = renderTutorial({
        id: "imperative-component",
        steps: [{ id: "s1" }, { id: "s2" }],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      let advanced = false;
      await act(async () => {
        advanced = await store.complete("external");
      });

      expect(advanced).toBe(true);
      await waitFor(() => expect(store.active?.id).toBe("s2"));
    });

    it("disarms action detection so later interactions do not advance after the step changed", async () => {
      const target = makeTarget("document-action");
      const { store } = renderTutorial({
        id: "disarm-component",
        steps: [
          {
            id: "s1",
            completion: {
              action: { type: "click", selector: "#document-action" },
            },
          },
          { id: "s2" },
        ],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      fireEvent.click(target);
      await waitFor(() => expect(store.active?.id).toBe("s2"));

      fireEvent.click(target);
      expect(store.active?.id).toBe("s2");
    });
  });

  describe("strategy precedence", () => {
    it("lets a step-level focus and message override the scenario defaults", async () => {
      const scenarioFocus = new SpyFocusStrategy("scenario-focus");
      const scenarioMessage = new SpyMessageStrategy("scenario-message");
      const stepFocus = new SpyFocusStrategy("step-focus");
      const stepMessage = new SpyMessageStrategy("step-message");
      const { store } = renderTutorial({
        id: "override",
        focus: scenarioFocus,
        message: scenarioMessage,
        steps: [{ id: "s1", focus: stepFocus, message: stepMessage }],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      expect(stepFocus.apply).toHaveBeenCalled();
      expect(stepMessage.renderSpy).toHaveBeenCalled();
      expect(scenarioFocus.apply).not.toHaveBeenCalled();
      expect(scenarioMessage.renderSpy).not.toHaveBeenCalled();
      expect(stepFocus.name).toBe("step-focus");
      expect(stepMessage.name).toBe("step-message");
    });

    it("uses the scenario-level strategy when the step does not define one", async () => {
      const scenarioFocus = new SpyFocusStrategy("scenario-focus");
      const scenarioMessage = new SpyMessageStrategy("scenario-message");
      const { store } = renderTutorial({
        id: "scenario-default",
        focus: scenarioFocus,
        message: scenarioMessage,
        steps: [{ id: "s1" }],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      expect(scenarioFocus.apply).toHaveBeenCalled();
      expect(scenarioMessage.renderSpy).toHaveBeenCalled();
    });

    it("uses the component-level strategy when neither step nor scenario defines one", async () => {
      const componentFocus = new SpyFocusStrategy("component-focus");
      const componentMessage = new SpyMessageStrategy("component-message");
      const { store } = renderTutorial(
        { id: "component-default", steps: [{ id: "s1" }] },
        { focusStrategy: componentFocus, messageStrategy: componentMessage }
      );
      await waitFor(() => expect(store.isRunning).toBe(true));

      expect(componentFocus.apply).toHaveBeenCalled();
      expect(componentMessage.renderSpy).toHaveBeenCalled();
    });

    it("falls back to the fade focus and bubble message strategies", async () => {
      const { container, store } = renderTutorial({
        id: "builtin-default",
        steps: [{ id: "s1", title: "Title" }],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      expect(
        overlay(container).classList.contains(TUTORIAL_FADE_CLASS)
      ).toBe(true);
      expect(bubble(container).querySelector("h3")?.textContent).toBe("Title");
    });

    it("applies the highlight classes when a step overrides with a highlight strategy", async () => {
      const target = makeTarget("highlight-target");
      const { container, store } = renderTutorial({
        id: "highlight",
        focus: new FadeFocusStrategy(),
        steps: [
          {
            id: "s1",
            focus: new HighlightFocusStrategy(),
            whitelist: ["#highlight-target"],
          },
        ],
      });
      await waitFor(() => expect(store.isRunning).toBe(true));

      expect(
        overlay(container).classList.contains(TUTORIAL_HIGHLIGHT_CLASS)
      ).toBe(true);
      expect(
        overlay(container).classList.contains(TUTORIAL_FADE_CLASS)
      ).toBe(false);
      expect(
        target.classList.contains(TUTORIAL_HIGHLIGHT_TARGET_CLASS)
      ).toBe(true);
    });
  });

  describe("lifecycle", () => {
    it("emits started, stepped and finished(completed) across a run", async () => {
      const onStarted = jest.fn();
      const onStepped = jest.fn();
      const onFinished = jest.fn();
      const { container, store } = renderTutorial(
        { id: "lifecycle", steps: [{ id: "s1" }, { id: "s2" }] },
        { onStarted, onStepped, onFinished }
      );

      await waitFor(() => expect(onStarted).toHaveBeenCalledTimes(1));
      expect(store.isRunning).toBe(true);

      fireEvent.click(button(container, ".dcf-storyboard-tutorial__bubble-primary"));
      await waitFor(() => expect(onStepped).toHaveBeenCalledTimes(1));

      act(() => {
        store.end();
      });

      await waitFor(() => expect(onFinished).toHaveBeenCalledWith("completed"));
      expect(store.isRunning).toBe(false);
    });

    it("emits finished(aborted) on abort", async () => {
      const onFinished = jest.fn();
      const { store } = renderTutorial(
        { id: "aborted", steps: [{ id: "s1" }, { id: "s2" }] },
        { onFinished }
      );
      await waitFor(() => expect(store.isRunning).toBe(true));

      act(() => {
        store.abort();
      });

      await waitFor(() => expect(onFinished).toHaveBeenCalledWith("aborted"));
      expect(store.isRunning).toBe(false);
    });

    it("emits started exactly once for the initial autoStart", async () => {
      const onStarted = jest.fn();
      const { store } = renderTutorial(
        { id: "auto-start", steps: [{ id: "s1" }, { id: "s2" }] },
        { onStarted }
      );

      await waitFor(() => expect(onStarted).toHaveBeenCalledTimes(1));
      expect(onStarted.mock.calls[0][0].steps[0].id).toBe("s1");
      expect(store.isRunning).toBe(true);
      expect(store.active?.id).toBe("s1");
    });

    it("does not abort the run on unmount, and a new host resumes the same step", async () => {
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: "navigation",
        steps: [
          { id: "s1", title: "One" },
          { id: "s2", title: "Two" },
        ],
      };
      const first = renderTutorial(scenario);
      await waitFor(() => expect(first.store.isRunning).toBe(true));

      await act(async () => {
        await first.store.next();
      });
      expect(first.store.active?.id).toBe("s2");

      first.unmount();

      expect(first.store.active?.id).toBe("s2");
      expect(first.store.isRunning).toBe(true);

      const resumedStarted = jest.fn();
      const second = renderTutorial(scenario, {
        store: first.store,
        onStarted: resumedStarted,
      });

      await waitFor(() =>
        expect(
          host(second.container).classList.contains(TUTORIAL_ACTIVE_CLASS)
        ).toBe(true)
      );
      expect(first.store.active?.id).toBe("s2");
      expect(
        bubble(second.container).querySelector("h3")?.textContent
      ).toBe("Two");
      expect(resumedStarted).toHaveBeenCalledTimes(1);
    });

    it("restores a run from the sessionStorage snapshot on a fresh store", async () => {
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: "persisted",
        persist: true,
        steps: [
          { id: "s1", title: "One" },
          { id: "s2", title: "Two" },
          { id: "s3", title: "Three" },
        ],
      };
      const seed = createStoryboardTutorialStore<Ctx>();
      seed.bind(scenario, { persist: true, autoStart: true });
      await seed.next();
      await seed.next();

      const store = createStoryboardTutorialStore<Ctx>();
      const { container } = renderTutorial(scenario, {
        store,
        persist: true,
        autoStart: false,
      });

      await waitFor(() => expect(store.active?.id).toBe("s3"));
      await waitFor(() =>
        expect(
          host(container).classList.contains(TUTORIAL_ACTIVE_CLASS)
        ).toBe(true)
      );
      expect(store.state?.completed).toEqual(["s1", "s2"]);
      expect(bubble(container).querySelector("h3")?.textContent).toBe("Three");
    });

    it("keeps state on the default singleton across unmount and remount", async () => {
      const defaultStore =
        storyboardTutorialStore as unknown as StoryboardTutorialStore<Ctx>;
      const scenario: StoryboardTutorialScenario<Ctx> = {
        id: "default-store-route",
        steps: [
          { id: "s1", title: "One" },
          { id: "s2", title: "Two" },
        ],
      };
      defaultStore.abort();

      const first = render(
        <StoryboardTutorial<Ctx>
          scenario={scenario}
          autoStart
          persist={false}
          instanceId="spec-host"
        />
      );
      await waitFor(() => expect(defaultStore.isRunning).toBe(true));

      await act(async () => {
        await defaultStore.next();
      });
      expect(defaultStore.active?.id).toBe("s2");

      first.unmount();

      const second = render(
        <StoryboardTutorial<Ctx>
          scenario={scenario}
          autoStart
          persist={false}
          instanceId="spec-host"
        />
      );
      await waitFor(() =>
        expect(
          host(second.container).classList.contains(TUTORIAL_ACTIVE_CLASS)
        ).toBe(true)
      );

      expect(defaultStore.active?.id).toBe("s2");
      expect(bubble(second.container).querySelector("h3")?.textContent).toBe(
        "Two"
      );

      act(() => {
        defaultStore.abort();
      });
    });
  });
});
