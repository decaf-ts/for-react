# `@decaf-ts/for-react/storyboard`

Guided storyboard tutorial surface: the `StoryboardTutorial` React host
component, the module-singleton `StoryboardTutorialStore` and its
`useSyncExternalStore` hooks, the framework-agnostic
`StoryboardTutorialEngine`, completion resolution and the pluggable
focus/message strategies.

The entry point adds **no runtime dependency** of its own. It uses only
`react`, `@decaf-ts/for-react` core helpers and `@decaf-ts/db-decorators`
(already a dependency of the package).

## Install

```bash
npm install @decaf-ts/for-react
```

Import the stylesheet next to the component (consumer-wired, like every
for-react subpath):

```ts
import "@decaf-ts/for-react/storyboard/styles.css";
```

### Compatibility

| Package               | Tested range |
| --------------------- | ------------ |
| `react` / `react-dom` | `>=18.0.0`   |
| `@decaf-ts/for-react` | `0.0.x`      |

## Usage

```tsx
import {
  StoryboardTutorial,
  type StoryboardTutorialScenario,
} from "@decaf-ts/for-react/storyboard";
import "@decaf-ts/for-react/storyboard/styles.css";

const scenario: StoryboardTutorialScenario = {
  id: "first-run",
  persist: true,
  steps: [
    {
      id: "welcome",
      title: "Welcome",
      content: "This button opens the next step.",
      target: '[data-tutorial="start"]',
      whitelist: ['[data-tutorial="start"]'],
      placement: "bottom",
      final: true,
    },
  ],
};

export function Onboarding() {
  return <StoryboardTutorial scenario={scenario} autoStart />;
}
```

### Store and hooks

The run lives in a module singleton, so it survives host unmounts and route
navigation exactly like the Angular root-provided service: a new host instance
re-binds and resumes the same step. Snapshots are persisted to `sessionStorage`
under `dcf-storyboard-tutorial` when `persist` is enabled.

```tsx
import {
  storyboardTutorialStore,
  useStoryboardTutorial,
} from "@decaf-ts/for-react/storyboard";

function Toolbar() {
  const { state, status } = useStoryboardTutorial();
  return (
    <button
      type="button"
      disabled={status === "running"}
      onClick={() => storyboardTutorialStore.start("first-run")}
    >
      Start tour
    </button>
  );
}
```

`useStoryboardTutorialState`, `useStoryboardTutorialStatus`,
`useStoryboardTutorialActive` and `useStoryboardTutorialRunning` are narrower
selectors over the same store. `createStoryboardTutorialStore(clock)` creates an
isolated store, which the host can pass through the `store` prop for test or
multi-instance isolation.

### API

| Member               | Type                                  | Purpose                                                                 |
| -------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| `scenario`           | `StoryboardTutorialScenario`          | Ordered tutorial steps, context, and scenario-level defaults.           |
| `autoStart`          | `boolean` (default `false`)           | Starts the scenario when nothing is running.                            |
| `persist`            | `boolean` (default `true`)            | Persists the run to `sessionStorage` for hard-reload survival.          |
| `focusStrategy`      | `TutorialFocusStrategy`               | Overrides the scenario default focus strategy.                          |
| `messageStrategy`    | `TutorialMessageStrategy`             | Overrides the scenario default message strategy.                        |
| `instanceId`         | `string`                              | Stable host id; defaults to `decaf-storyboard-<random>`.                |
| `store`              | `StoryboardTutorialStore`             | Isolated store; defaults to the module singleton.                       |
| `className`          | `string`                              | Extra class applied to the host element.                                |
| `onStarted`          | `(state) => void`                     | Fires when a tutorial starts.                                           |
| `onStepped`          | `(state) => void`                     | Fires on every step transition.                                         |
| `onFinished`         | `(status) => void`                    | Fires with the terminal `TutorialStatus` when the run ends or aborts.   |

Labels are declared on the scenario (`scenario.labels`) and may be overridden
per step (`step.labels`); they are not a component prop. Every label has an
English default.

### Export surface

- `StoryboardTutorial`, `StoryboardTutorialComponent`
- `StoryboardTutorialStore`, `createStoryboardTutorialStore`,
  `storyboardTutorialStore`, the `useStoryboardTutorial*` hooks
- `StoryboardTutorialEngine`, `StoryboardTutorialClock`
- `resolveTutorialCompletion`, `StoryboardTutorialActionDetector`
- `FadeFocusStrategy`, `HighlightFocusStrategy` and the
  `TutorialFocusStrategy` contract
- `BubbleMessageStrategy`, `DEFAULT_LABELS` and the
  `TutorialMessageStrategy` contract
- `StoryboardTutorialScenario`, `StoryboardTutorialState`,
  `StoryboardTutorialLabels`, `TutorialStatus` and related types

### Behaviour notes

- The overlay blocks pointer and keyboard interaction for the whole page
  except the active step's `whitelist` selectors (marked with
  `data-dcf-tutorial-whitelisted`); an `evenodd` clip-path cuts holes over the
  whitelisted elements.
- Completion supports `timeout`, `minTime` and an `action`
  (`click`/`drag`/`input`/`keys`); a step field overrides the scenario default
  field by field and `completion: false` disables the default for that step.
- A component unmount tears down the visuals but never aborts the run.

### Security and trust notes

- `whitelist`, `target` and completion-action `selector` strings are **trusted
  app content**: they are passed straight to `querySelector`/`querySelectorAll`,
  and every matching element is made interactive and keyboard-exempt while the
  step is active. Never derive them from user input; an invalid selector throws
  a `SyntaxError` inside the render effect.
- With `persist` enabled (the component default) the scenario `context` is
  serialized to `sessionStorage` under `dcf-storyboard-tutorial` and restored
  after a reload. Keep credentials, tokens and PII out of the tutorial context,
  or run those scenarios with `persist: false`. Corrupt or tampered snapshots
  fail closed (they are never restored).
- `data-dcf-tutorial-whitelisted` and `dcf-storyboard-tutorial` are **reserved
  names**: the overlay exempts any element carrying the attribute, and teardown
  does not strip marks it did not set. Do not use them for your own state.
- Keep one mounted host per store. `bind()` will not start a second scenario
  while a run is active (it re-binds to the running one), but two hosts on the
  same store each render their own overlay and keyboard blocker, each exempting
  only its own step's whitelist.
