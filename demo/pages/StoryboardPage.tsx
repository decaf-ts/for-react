import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StoryboardTutorial,
  storyboardTutorialStore,
  useStoryboardTutorial,
  type StoryboardTutorialLabels,
  type StoryboardTutorialScenario,
  type StoryboardTutorialState,
  type TutorialFocusContext,
  type TutorialFocusStrategy,
  type TutorialMessageContext,
  type TutorialMessageStrategy,
  type TutorialStatus,
} from "../../src/storyboard";
import { useTranslate } from "../../src/lib";
import { CardTitle } from "../components/CardTitle";

const CONTROLS_TARGET = '[data-tutorial="controls"]';

type Translator = (key: string, params?: Record<string, unknown>) => string;

const PANEL_MESSAGE_CLASS = "storyboard-page__panel-message";

class SoftSpotlightFocusStrategy implements TutorialFocusStrategy {
  readonly name = "soft-spotlight";

  apply(context: TutorialFocusContext): void {
    context.overlay.classList.add("storyboard-page__overlay--soft");
    context.overlay.style.pointerEvents = "none";
    context.overlay.style.clipPath = "none";
    context.targets.forEach((target) =>
      target.classList.add("storyboard-page__focus-target")
    );
  }

  clear(context: TutorialFocusContext): void {
    context.overlay.classList.remove("storyboard-page__overlay--soft");
    context.overlay.style.pointerEvents = "";
    context.overlay.style.clipPath = "";
    context.targets.forEach((target) =>
      target.classList.remove("storyboard-page__focus-target")
    );
  }
}

class PanelMessageStrategy implements TutorialMessageStrategy {
  readonly name = "panel";

  render(context: TutorialMessageContext): void {
    this.clear(context);
    const doc = context.container.ownerDocument;
    const panel = doc.createElement("div");
    panel.className = PANEL_MESSAGE_CLASS;
    panel.setAttribute("role", "dialog");

    const title = doc.createElement("h4");
    title.className = `${PANEL_MESSAGE_CLASS}-title`;
    title.textContent = context.step.title ?? "Tutorial";
    panel.appendChild(title);

    const content = doc.createElement("p");
    content.className = `${PANEL_MESSAGE_CLASS}-content`;
    content.textContent = context.step.content ?? "";
    panel.appendChild(content);

    const footer = doc.createElement("div");
    footer.className = `${PANEL_MESSAGE_CLASS}-footer`;

    const total = context.state.completed.length + context.state.steps.length;
    const progress = doc.createElement("span");
    progress.className = `${PANEL_MESSAGE_CLASS}-progress`;
    progress.textContent = (context.labels.progress ?? "{current} / {total}")
      .replace("{current}", String(context.state.completed.length + 1))
      .replace("{total}", String(total));
    footer.appendChild(progress);

    const previous = this.button(
      doc,
      context.labels.previous ?? "Previous",
      () => context.controls.previous()
    );
    previous.disabled = context.state.cursor === 0;
    footer.appendChild(previous);

    const isLast = !!context.step.final || context.state.steps.length <= 1;
    footer.appendChild(
      this.button(
        doc,
        isLast
          ? context.labels.finish ?? "Finish"
          : context.labels.next ?? "Next",
        () => {
          void context.controls.complete("next");
        }
      )
    );
    footer.appendChild(
      this.button(doc, context.labels.abort ?? "Skip", () =>
        context.controls.abort()
      )
    );

    panel.appendChild(footer);
    context.container.appendChild(panel);
  }

  clear(context: TutorialMessageContext): void {
    context.container
      .querySelectorAll(`.${PANEL_MESSAGE_CLASS}`)
      .forEach((panel) => panel.remove());
  }

  private button(
    doc: Document,
    label: string,
    handler: () => void
  ): HTMLButtonElement {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = `${PANEL_MESSAGE_CLASS}-button`;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }
}

const SOFT_SPOTLIGHT = new SoftSpotlightFocusStrategy();
const PANEL_MESSAGE = new PanelMessageStrategy();

function buildScenarios(
  translate: Translator
): Record<string, StoryboardTutorialScenario> {
  const labels: StoryboardTutorialLabels = {
    previous: translate("storyboard.previous"),
    next: translate("storyboard.next"),
    finish: translate("storyboard.end"),
    abort: translate("storyboard.abort"),
    close: translate("storyboard.close"),
    progress: "{current} / {total}",
  };

  const featureTour: StoryboardTutorialScenario = {
    id: "for-react-feature-page-tour",
    name: translate("storyboard.scenario_name"),
    persist: false,
    focus: SOFT_SPOTLIGHT,
    labels,
    steps: [
      {
        id: "welcome",
        title: translate("storyboard.welcome_title"),
        content: translate("storyboard.welcome_content"),
        target: '[data-tutorial="playground"]',
        placement: "bottom",
        whitelist: [CONTROLS_TARGET],
      },
      {
        id: "name",
        title: translate("storyboard.name_title"),
        content: translate("storyboard.name_content"),
        target: "#tutorial-name",
        placement: "bottom",
        whitelist: ["#tutorial-name", CONTROLS_TARGET],
      },
      {
        id: "confirm",
        title: translate("storyboard.confirm_title"),
        content: translate("storyboard.confirm_content"),
        target: '[data-tutorial="confirm"]',
        placement: "top",
        whitelist: ['[data-tutorial="confirm"]', CONTROLS_TARGET],
      },
      {
        id: "finish",
        title: translate("storyboard.finish_title"),
        content: translate("storyboard.finish_content"),
        placement: "center",
        final: true,
        whitelist: [CONTROLS_TARGET],
      },
    ],
  };

  const placements: StoryboardTutorialScenario = {
    id: "for-react-storyboard-placements",
    name: translate("storyboard.placements_name"),
    persist: false,
    labels,
    steps: [
      {
        id: "placement-top",
        title: translate("storyboard.placement_top_title"),
        content: translate("storyboard.placement_top_content"),
        target: '[data-tutorial="playground"]',
        whitelist: ['[data-tutorial="playground"]'],
        placement: "top",
      },
      {
        id: "placement-bottom",
        title: translate("storyboard.placement_bottom_title"),
        content: translate("storyboard.placement_bottom_content"),
        target: "#tutorial-name",
        whitelist: ["#tutorial-name"],
        placement: "bottom",
      },
      {
        id: "placement-left",
        title: translate("storyboard.placement_left_title"),
        content: translate("storyboard.placement_left_content"),
        target: '[data-tutorial="confirm"]',
        whitelist: ['[data-tutorial="confirm"]'],
        placement: "left",
      },
      {
        id: "placement-right",
        title: translate("storyboard.placement_right_title"),
        content: translate("storyboard.placement_right_content"),
        target: "#tutorial-notes",
        whitelist: ["#tutorial-notes"],
        placement: "right",
      },
      {
        id: "placement-center",
        title: translate("storyboard.placement_center_title"),
        content: translate("storyboard.placement_center_content"),
        placement: "center",
        whitelist: ["#tutorial-notes"],
        focus: SOFT_SPOTLIGHT,
        final: true,
      },
    ],
  };

  const timeout: StoryboardTutorialScenario = {
    id: "for-react-storyboard-timeout",
    name: translate("storyboard.timeout_name"),
    persist: false,
    labels,
    completion: { timeout: 1200 },
    steps: [
      {
        id: "timeout-1",
        title: translate("storyboard.timeout_title"),
        content: translate("storyboard.timeout_content"),
        target: '[data-tutorial="playground"]',
        whitelist: ['[data-tutorial="playground"]'],
        placement: "bottom",
      },
      {
        id: "timeout-2",
        title: translate("storyboard.timeout_title"),
        content: translate("storyboard.timeout_content"),
        target: "#tutorial-notes",
        whitelist: ["#tutorial-notes"],
        placement: "center",
        final: true,
      },
    ],
  };

  const click: StoryboardTutorialScenario = {
    id: "for-react-storyboard-click",
    name: translate("storyboard.click_name"),
    persist: false,
    labels,
    steps: [
      {
        id: "click-1",
        title: translate("storyboard.click_title"),
        content: translate("storyboard.click_content"),
        target: '[data-tutorial="confirm"]',
        whitelist: ['[data-tutorial="confirm"]'],
        placement: "top",
        completion: {
          action: {
            type: "click",
            selector: '[data-tutorial="confirm"]',
            button: 0,
          },
        },
      },
      {
        id: "click-2",
        title: translate("storyboard.click_done_title"),
        content: translate("storyboard.click_done_content"),
        placement: "center",
        whitelist: ["#tutorial-notes"],
        final: true,
      },
    ],
  };

  const input: StoryboardTutorialScenario = {
    id: "for-react-storyboard-input",
    name: translate("storyboard.input_name"),
    persist: false,
    labels,
    steps: [
      {
        id: "input-1",
        title: translate("storyboard.input_title"),
        content: translate("storyboard.input_content"),
        target: "#tutorial-name",
        whitelist: ["#tutorial-name"],
        placement: "bottom",
        completion: {
          minTime: 250,
          action: { type: "input", selector: "#tutorial-name", minLength: 3 },
        },
      },
      {
        id: "input-2",
        title: translate("storyboard.click_done_title"),
        content: translate("storyboard.input_done_content"),
        placement: "center",
        whitelist: ["#tutorial-notes"],
        final: true,
      },
    ],
  };

  const keys: StoryboardTutorialScenario = {
    id: "for-react-storyboard-keys",
    name: translate("storyboard.keys_name"),
    persist: false,
    labels,
    steps: [
      {
        id: "keys-1",
        title: translate("storyboard.keys_title"),
        content: translate("storyboard.keys_content"),
        target: "#tutorial-name",
        whitelist: ["#tutorial-name"],
        placement: "bottom",
        completion: {
          action: {
            type: "keys",
            selector: "#tutorial-name",
            keys: ["Enter", "Tab"],
          },
        },
      },
      {
        id: "keys-2",
        title: translate("storyboard.click_done_title"),
        content: translate("storyboard.keys_done_content"),
        placement: "center",
        whitelist: ["#tutorial-notes"],
        final: true,
      },
    ],
  };

  const labelsScenario: StoryboardTutorialScenario = {
    id: "for-react-storyboard-labels",
    name: translate("storyboard.labels_name"),
    persist: false,
    labels: {
      previous: translate("storyboard.labels_previous"),
      next: translate("storyboard.labels_next"),
      finish: translate("storyboard.labels_finish"),
      abort: translate("storyboard.labels_abort"),
      close: translate("storyboard.labels_close"),
      progress: translate("storyboard.labels_progress"),
    },
    steps: [
      {
        id: "labels-1",
        title: translate("storyboard.labels_title"),
        content: translate("storyboard.labels_content"),
        target: '[data-tutorial="playground"]',
        whitelist: ['[data-tutorial="playground"]'],
        placement: "bottom",
        message: PANEL_MESSAGE,
      },
      {
        id: "labels-2",
        title: translate("storyboard.finish_title"),
        content: translate("storyboard.finish_content"),
        placement: "center",
        whitelist: [CONTROLS_TARGET],
        message: PANEL_MESSAGE,
        final: true,
      },
    ],
  };

  return {
    "feature-tour": featureTour,
    placements,
    timeout,
    click,
    input,
    keys,
    labels: labelsScenario,
  };
}

const SCENARIO_KEYS = [
  "feature-tour",
  "placements",
  "timeout",
  "click",
  "input",
  "keys",
  "labels",
] as const;

const SCENARIO_LABEL_KEYS: Record<string, string> = {
  "feature-tour": "storyboard.scenario_feature_tour",
  placements: "storyboard.scenario_placements",
  timeout: "storyboard.scenario_timeout",
  click: "storyboard.scenario_click",
  input: "storyboard.scenario_input",
  keys: "storyboard.scenario_keys",
  labels: "storyboard.scenario_labels",
};

export function StoryboardPage() {
  const translate = useTranslate();
  const { state, status } = useStoryboardTutorial();
  const active = state?.steps[0] ?? null;

  const [scenarioKey, setScenarioKey] = useState<string>("feature-tour");
  const [name, setName] = useState("");
  const [confirmedValue, setConfirmedValue] = useState("");
  const [lastEvent, setLastEvent] = useState("");

  const scenarios = useMemo(() => buildScenarios(translate), [translate]);
  const scenario = scenarios[scenarioKey] ?? scenarios["feature-tour"];

  const statusRef = useRef<TutorialStatus>(status);
  statusRef.current = status;

  useEffect(() => {
    storyboardTutorialStore.clearPersisted();
    setLastEvent(translate("storyboard.event_none"));
  }, [translate]);

  useEffect(
    () => () => {
      if (statusRef.current === "running") storyboardTutorialStore.abort();
    },
    []
  );

  const start = (): void => {
    storyboardTutorialStore.start(scenario);
  };

  const next = (): void => {
    void storyboardTutorialStore.next();
  };

  const previous = (): void => {
    storyboardTutorialStore.previous();
  };

  const abort = (): void => {
    storyboardTutorialStore.abort();
  };

  const end = (): void => {
    storyboardTutorialStore.end();
  };

  const onScenarioChange = (key: string): void => {
    if (statusRef.current === "running") storyboardTutorialStore.abort();
    setScenarioKey(key);
  };

  const onStarted = (nextState: StoryboardTutorialState): void => {
    setLastEvent(
      translate("storyboard.event_started", { id: nextState.scenarioId })
    );
  };

  const onStepped = (nextState: StoryboardTutorialState): void => {
    const step = nextState.steps[0];
    setLastEvent(
      translate("storyboard.event_stepped", {
        step: step?.title ?? String(nextState.cursor),
      })
    );
  };

  const onFinished = (nextStatus: TutorialStatus): void => {
    setLastEvent(
      translate("storyboard.event_finished", {
        status: translate(`storyboard.status_${nextStatus}`),
      })
    );
  };

  return (
    <section className="app-page storyboard-page" aria-labelledby="storyboard-title">
      <CardTitle title="storyboard.title" subtitle="storyboard.intro" />
      <h2 id="storyboard-title" className="app-visually-hidden">
        {translate("storyboard.title")}
      </h2>

      <section
        className="storyboard-page__controls"
        data-tutorial="controls"
        data-testid="storyboard-controls"
        aria-label={translate("storyboard.title")}
      >
        <label className="storyboard-page__select">
          <span>{translate("storyboard.scenario_label")}</span>
          <select
            data-testid="storyboard-scenario"
            value={scenarioKey}
            onChange={(event) => onScenarioChange(event.target.value)}
          >
            {SCENARIO_KEYS.map((key) => (
              <option key={key} value={key}>
                {translate(SCENARIO_LABEL_KEYS[key])}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="storyboard-page__button storyboard-page__button--primary"
          data-testid="storyboard-start"
          disabled={status === "running"}
          onClick={start}
        >
          {translate("storyboard.start")}
        </button>
        <button
          type="button"
          className="storyboard-page__button"
          data-testid="storyboard-next"
          disabled={status !== "running"}
          onClick={next}
        >
          {translate("storyboard.next")}
        </button>
        <button
          type="button"
          className="storyboard-page__button"
          data-testid="storyboard-previous"
          disabled={status !== "running"}
          onClick={previous}
        >
          {translate("storyboard.previous")}
        </button>
        <button
          type="button"
          className="storyboard-page__button"
          data-testid="storyboard-abort"
          disabled={status !== "running"}
          onClick={abort}
        >
          {translate("storyboard.abort")}
        </button>
        <button
          type="button"
          className="storyboard-page__button"
          data-testid="storyboard-end"
          disabled={status !== "running"}
          onClick={end}
        >
          {translate("storyboard.end")}
        </button>
      </section>

      <div className="storyboard-page__layout">
        <section
          className="storyboard-page__panel"
          data-tutorial="playground"
          data-testid="storyboard-playground"
        >
          <h3>{translate("storyboard.demo_title")}</h3>
          <p className="storyboard-page__hint">
            {translate("storyboard.demo_intro")}
          </p>

          <label className="storyboard-page__field">
            <span>{translate("storyboard.name_label")}</span>
            <input
              id="tutorial-name"
              data-testid="storyboard-name"
              type="text"
              value={name}
              placeholder={translate("storyboard.name_placeholder")}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="storyboard-page__field">
            <span>{translate("storyboard.notes_label")}</span>
            <textarea
              id="tutorial-notes"
              data-testid="storyboard-notes"
              rows={3}
              placeholder={translate("storyboard.notes_placeholder")}
            />
          </label>

          <button
            type="button"
            className="storyboard-page__button storyboard-page__button--primary"
            data-tutorial="confirm"
            data-testid="storyboard-confirm"
            onClick={() => setConfirmedValue(name)}
          >
            {translate("storyboard.confirm")}
          </button>

          {confirmedValue ? (
            <p className="storyboard-page__confirmed" data-testid="storyboard-confirmed">
              {translate("storyboard.confirmed", { value: confirmedValue })}
            </p>
          ) : null}
        </section>

        <aside
          className="storyboard-page__panel storyboard-page__status"
          aria-live="polite"
        >
          <div>
            <h3>{translate("storyboard.status_label")}</h3>
            <p className="storyboard-page__status-value" data-testid="storyboard-status">
              {translate(`storyboard.status_${status}`)}
            </p>
          </div>
          <div>
            <h3>{translate("storyboard.step_label")}</h3>
            <p
              className="storyboard-page__status-value"
              data-testid="storyboard-active-step"
            >
              {active ? active.title : translate("storyboard.step_none")}
            </p>
          </div>
          <div>
            <h3>{translate("storyboard.event_label")}</h3>
            <p className="storyboard-page__event" data-testid="storyboard-last-event">
              {lastEvent}
            </p>
          </div>
        </aside>
      </div>

      <StoryboardTutorial
        scenario={scenario}
        persist={false}
        onStarted={onStarted}
        onStepped={onStepped}
        onFinished={onFinished}
      />
    </section>
  );
}
