/**
 * @module module:for-react.storyboard.StoryboardTutorial
 * @description React host component for the storyboard tutorial.
 * @summary Renders the blocking overlay, the whitelisted target holes and the
 * instruction host, binds a scenario to the store on mount, and drives the
 * focus/message strategies and action detector from every state transition. The
 * host is presentation-only: every navigation, completion and abort decision is
 * delegated to the store's engine controls.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { generateRandomValue } from "../lib/utils/helpers.js";
import {
  StoryboardTutorialActionDetector,
  resolveTutorialCompletion,
  type TutorialActionContext,
} from "./storyboard.completion.js";
import { FadeFocusStrategy } from "./storyboard.focus.js";
import { BubbleMessageStrategy } from "./storyboard.message.js";
import {
  StoryboardTutorialStore,
  storyboardTutorialStore,
  useStoryboardTutorial,
} from "./storyboard.store.js";
import {
  TUTORIAL_ACTIVE_CLASS,
  TUTORIAL_WHITELIST_ATTRIBUTE,
  type StoryboardTutorialLabels,
  type StoryboardTutorialScenario,
  type StoryboardTutorialState,
  type StoryboardTutorialStep,
  type TutorialContext,
  type TutorialFocusContext,
  type TutorialFocusStrategy,
  type TutorialMessageContext,
  type TutorialMessageStrategy,
  type TutorialStatus,
} from "./storyboard.types.js";

/**
 * @description Props accepted by {@link StoryboardTutorial}.
 * @summary `scenario` is the run to bind; the component registers it and resumes
 * a persisted snapshot or starts it when `autoStart` is set. Strategies resolve in
 * the order step, scenario, prop, built-in default, so props are the last
 * override before the built-in fade/bubble implementations. All callbacks are
 * informational and never required to keep the tutorial working.
 * @interface StoryboardTutorialProps
 * @template C the tutorial context type
 * @property {StoryboardTutorialScenario<C>} [scenario] - Scenario to bind; nothing
 * renders until a scenario is supplied.
 * @property {boolean} [autoStart=false] - Starts the scenario when no persisted run
 * is resumed.
 * @property {boolean} [persist=true] - Opts the run into `sessionStorage`
 * persistence for hard-reload survival.
 * @property {TutorialFocusStrategy<C>} [focusStrategy] - Host focus/attention
 * strategy used when the step and scenario declare none.
 * @property {TutorialMessageStrategy<C>} [messageStrategy] - Host instruction
 * strategy used when the step and scenario declare none.
 * @property {string} [instanceId] - Stable host id; a random id is generated when
 * omitted.
 * @property {StoryboardTutorialStore<C>} [store] - Store instance; defaults to the
 * {@link storyboardTutorialStore} module singleton.
 * @property {string} [className] - Extra class names appended to the host element.
 * @property {function(StoryboardTutorialState<C>): void} [onStarted] - Invoked when
 * the first step becomes active.
 * @property {function(StoryboardTutorialState<C>): void} [onStepped] - Invoked when
 * the active step changes to a different step.
 * @property {function(TutorialStatus): void} [onFinished] - Invoked once the run
 * stops, with the final status.
 * @memberOf module:for-react.storyboard.StoryboardTutorial
 */
export interface StoryboardTutorialProps<
  C extends TutorialContext = TutorialContext
> {
  scenario?: StoryboardTutorialScenario<C>;
  autoStart?: boolean;
  persist?: boolean;
  focusStrategy?: TutorialFocusStrategy<C>;
  messageStrategy?: TutorialMessageStrategy<C>;
  instanceId?: string;
  store?: StoryboardTutorialStore<C>;
  className?: string;
  onStarted?: (state: StoryboardTutorialState<C>) => void;
  onStepped?: (state: StoryboardTutorialState<C>) => void;
  onFinished?: (status: TutorialStatus) => void;
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * @description React host for a scripted storyboard tutorial.
 * @summary Binds `scenario` to the store on mount and, on every state/status
 * transition, resolves the whitelisted targets, applies the interaction blocking
 * overlay holes, renders the focus and message strategies, arms the action
 * detector and forwards the step lifecycle callbacks. The host is presentation
 * and DOM-integration only: stepping, completion, abort and end all go through
 * the store's {@link StoryboardTutorialControls}, so its behaviour matches the
 * framework-agnostic engine. Unmounting tears down listeners, strategy classes and
 * the interaction block, then restores the previously focused element.
 * @template C the tutorial context type
 * @param {StoryboardTutorialProps<C>} props - Tutorial host props.
 * @returns {React.ReactElement} The tutorial host element with its overlay and
 * message container.
 * @memberOf module:for-react.storyboard.StoryboardTutorial
 */
export function StoryboardTutorial<
  C extends TutorialContext = TutorialContext
>(props: StoryboardTutorialProps<C>) {
  const {
    scenario,
    autoStart = false,
    persist = true,
    instanceId,
    className,
  } = props;
  const store =
    props.store ??
    (storyboardTutorialStore as unknown as StoryboardTutorialStore<C>);

  const snapshot = useStoryboardTutorial(store);
  const running =
    snapshot.status === "running" && !!snapshot.state?.steps[0];

  const hostRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const messageHostRef = useRef<HTMLDivElement | null>(null);

  const generatedId = useMemo(
    () => instanceId || `decaf-storyboard-${generateRandomValue(8)}`,
    [instanceId]
  );

  const propsRef = useRef(props);
  propsRef.current = props;

  const storeRef = useRef(store);
  storeRef.current = store;

  const defaultFocus = useMemo(() => new FadeFocusStrategy<C>(), []);
  const defaultMessage = useMemo(() => new BubbleMessageStrategy<C>(), []);
  const actionDetector = useMemo(
    () => new StoryboardTutorialActionDetector<C>(),
    []
  );

  const appliedFocus = useRef<
    { strategy: TutorialFocusStrategy<C>; context: TutorialFocusContext<C> } | undefined
  >(undefined);
  const appliedMessage = useRef<
    {
      strategy: TutorialMessageStrategy<C>;
      context: TutorialMessageContext<C>;
    } | undefined
  >(undefined);
  const originalTargetStyles = useRef(new Map<HTMLElement, string>());
  const lastStepId = useRef<string | null>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const clearInteractionBlock = (overlay?: HTMLElement | null): void => {
    if (overlay) overlay.style.clipPath = "";
    originalTargetStyles.current.forEach((pointerEvents, target) => {
      target.removeAttribute(TUTORIAL_WHITELIST_ATTRIBUTE);
      target.style.pointerEvents = pointerEvents;
    });
    originalTargetStyles.current.clear();
  };

  const clearStrategies = (): void => {
    actionDetector.disarm();
    if (appliedFocus.current) {
      appliedFocus.current.strategy.clear(appliedFocus.current.context);
      appliedFocus.current = undefined;
    }
    if (appliedMessage.current) {
      appliedMessage.current.strategy.clear(appliedMessage.current.context);
      appliedMessage.current = undefined;
    }
  };

  const teardown = (): void => {
    clearStrategies();
    clearInteractionBlock(overlayRef.current);
    const host = hostRef.current;
    if (host) host.classList.remove(TUTORIAL_ACTIVE_CLASS);
    const previous = lastFocusedElement.current;
    if (previous?.isConnected) previous.focus();
    lastFocusedElement.current = null;
  };

  const resolveLabels = (
    step: StoryboardTutorialStep<C>,
    scenario?: StoryboardTutorialScenario<C>
  ): StoryboardTutorialLabels => ({
    ...(scenario?.labels ?? {}),
    ...(step.labels ?? {}),
  });

  const resolveTargets = (
    whitelist: string[] | undefined,
    root: HTMLElement
  ): HTMLElement[] => {
    if (!whitelist?.length) return [];
    const doc = root.ownerDocument;
    const targets: HTMLElement[] = [];
    whitelist.forEach((selector) => {
      doc.querySelectorAll(selector).forEach((element) => {
        if (element instanceof HTMLElement && !root.contains(element))
          targets.push(element);
      });
    });
    return targets;
  };

  const resolveAnchor = (
    step: StoryboardTutorialStep<C>,
    targets: HTMLElement[],
    root: HTMLElement
  ): HTMLElement | null => {
    if (step.target) {
      const element = root.ownerDocument.querySelector(step.target);
      if (element instanceof HTMLElement) return element;
    }
    return targets[0] ?? null;
  };

  const applyInteractionBlock = (
    overlay: HTMLElement,
    targets: HTMLElement[]
  ): void => {
    clearInteractionBlock(overlay);
    targets.forEach((target) => {
      if (!originalTargetStyles.current.has(target))
        originalTargetStyles.current.set(target, target.style.pointerEvents);
      target.setAttribute(TUTORIAL_WHITELIST_ATTRIBUTE, "true");
      target.style.pointerEvents = "auto";
    });

    const rects = targets
      .map((target) => target.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    if (!rects.length) {
      overlay.style.clipPath = "";
      return;
    }
    const holes = rects
      .map(
        (rect) =>
          `${rect.left}px ${rect.top}px, ${rect.right}px ${rect.top}px, ${rect.right}px ${rect.bottom}px, ${rect.left}px ${rect.bottom}px, ${rect.left}px ${rect.top}px`
      )
      .join(", ");
    overlay.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${holes})`;
  };

  const render = (
    state: StoryboardTutorialState<C> | null,
    status: TutorialStatus
  ): void => {
    const overlay = overlayRef.current;
    const messageHost = messageHostRef.current;
    const root = hostRef.current;
    if (!overlay || !messageHost || !root) return;

    const active = !!state && state.status === "running" && !!state.steps[0];
    if (!active) {
      const wasRunning = lastStepId.current !== null;
      teardown();
      lastStepId.current = null;
      if (wasRunning) propsRef.current.onFinished?.(status);
      return;
    }

    const current = state as StoryboardTutorialState<C>;
    const step = current.steps[0];
    if (lastStepId.current === null)
      lastFocusedElement.current =
        root.ownerDocument.activeElement as HTMLElement | null;
    root.classList.add(TUTORIAL_ACTIVE_CLASS);

    clearStrategies();
    const targets = resolveTargets(step.whitelist, root);
    applyInteractionBlock(overlay, targets);

    const currentScenario = propsRef.current.scenario;
    const focus =
      step.focus ??
      currentScenario?.focus ??
      propsRef.current.focusStrategy ??
      defaultFocus;
    const message =
      step.message ??
      currentScenario?.message ??
      propsRef.current.messageStrategy ??
      defaultMessage;
    const completion = resolveTutorialCompletion(step, currentScenario);

    const focusContext: TutorialFocusContext<C> = {
      step,
      state: current,
      targets,
      overlay,
      root,
    };
    focus.apply(focusContext);
    appliedFocus.current = { strategy: focus, context: focusContext };

    const anchor = resolveAnchor(step, targets, root);
    const messageContext: TutorialMessageContext<C> = {
      step,
      state: current,
      targets,
      anchor,
      container: messageHost,
      controls: storeRef.current.controls,
      labels: resolveLabels(step, currentScenario),
      completion,
    };
    message.render(messageContext);
    appliedMessage.current = { strategy: message, context: messageContext };

    if (completion?.action) {
      const actionContext: TutorialActionContext<C> = {
        step,
        config: completion.action,
        controls: storeRef.current.controls,
        root,
        document: root.ownerDocument,
      };
      actionDetector.arm(actionContext);
    }

    if (step.id !== lastStepId.current) {
      if (lastStepId.current === null)
        propsRef.current.onStarted?.(current);
      else propsRef.current.onStepped?.(current);
      lastStepId.current = step.id;
    }
  };

  const renderRef = useRef(render);
  renderRef.current = render;

  useEffect(() => {
    if (!scenario) return;
    storeRef.current.bind(scenario, { persist, autoStart });
  }, [scenario, persist, autoStart, store]);

  useEffect(() => {
    renderRef.current(snapshot.state, snapshot.status);
  }, [snapshot.state, snapshot.status]);

  useEffect(
    () => () => {
      teardown();
    },
    []
  );

  useEffect(() => {
    const onResize = (): void => {
      renderRef.current(
        storeRef.current.state,
        storeRef.current.status
      );
    };
    const win = hostRef.current?.ownerDocument?.defaultView;
    win?.addEventListener("resize", onResize);
    return () => win?.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!running) return;
    const doc = hostRef.current?.ownerDocument;
    if (!doc) return;
    const onKeydown = (event: KeyboardEvent): void => {
      const root = hostRef.current;
      if (!root) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (root.contains(target)) return;
      if (target.closest(`[${TUTORIAL_WHITELIST_ATTRIBUTE}]`)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    doc.addEventListener("keydown", onKeydown, true);
    return () => doc.removeEventListener("keydown", onKeydown, true);
  }, [running]);

  return (
    <div
      id={generatedId}
      ref={hostRef}
      className={classNames(
        "dcf-storyboard-tutorial",
        running && "dcf-storyboard-tutorial--active",
        className
      )}
      aria-hidden={!running}
    >
      <div ref={overlayRef} className="dcf-storyboard-tutorial__overlay" />
      <div
        ref={messageHostRef}
        className="dcf-storyboard-tutorial__message-host"
      />
    </div>
  );
}

/**
 * @description Alias of {@link StoryboardTutorial} kept for callers porting
 * Angular component names to the React package.
 * @summary Behaves exactly like {@link StoryboardTutorial}; it is a naming bridge
 * with no separate implementation.
 * @constant
 * @type {function}
 * @memberOf module:for-react.storyboard.StoryboardTutorial
 */
export const StoryboardTutorialComponent = StoryboardTutorial;
