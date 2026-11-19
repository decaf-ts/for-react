/**
 * @description Public surface of the `@decaf-ts/for-react/storyboard` subpath.
 * @summary Re-exports the {@link StoryboardTutorial} React host with its
 * `StoryboardTutorialComponent` Angular-name alias and props, the
 * {@link StoryboardTutorialStore} singleton, factory and `useSyncExternalStore`
 * hooks, the framework-agnostic {@link StoryboardTutorialEngine}, the completion
 * resolver and action detector, the fade/highlight focus and bubble message
 * strategies with their CSS-class constants, and the scenario/step/state and
 * strategy contracts documented under the `storyboard` namespace.
 */
export {
  StoryboardTutorial,
  StoryboardTutorialComponent,
} from "./StoryboardTutorial.js";
export type { StoryboardTutorialProps } from "./StoryboardTutorial.js";
export {
  StoryboardTutorialStore,
  createStoryboardTutorialStore,
  storyboardTutorialStore,
  useStoryboardTutorial,
  useStoryboardTutorialState,
  useStoryboardTutorialStatus,
  useStoryboardTutorialActive,
  useStoryboardTutorialRunning,
} from "./storyboard.store.js";
export type {
  PersistedStoryboardTutorialState,
  StoryboardTutorialListener,
  StoryboardTutorialSnapshot,
} from "./storyboard.store.js";
export {
  StoryboardTutorialEngine,
  defaultStoryboardTutorialClock,
} from "./storyboard.engine.js";
export type {
  StoryboardTutorialChangeListener,
  StoryboardTutorialClock,
} from "./storyboard.engine.js";
export {
  StoryboardTutorialActionDetector,
  resolveTutorialCompletion,
} from "./storyboard.completion.js";
export type { TutorialActionContext } from "./storyboard.completion.js";
export {
  FadeFocusStrategy,
  HighlightFocusStrategy,
  TUTORIAL_FADE_CLASS,
  TUTORIAL_FADE_TARGET_CLASS,
  TUTORIAL_HIGHLIGHT_CLASS,
  TUTORIAL_HIGHLIGHT_TARGET_CLASS,
} from "./storyboard.focus.js";
export {
  BubbleMessageStrategy,
  DEFAULT_LABELS,
  TUTORIAL_BUBBLE_CLASS,
} from "./storyboard.message.js";
export {
  DEFAULT_TUTORIAL_DRAG_THRESHOLD,
  DEFAULT_TUTORIAL_FOCUS,
  DEFAULT_TUTORIAL_INPUT_LENGTH,
  DEFAULT_TUTORIAL_MESSAGE,
  TUTORIAL_ACTIVE_CLASS,
  TUTORIAL_STORAGE_KEY,
  TUTORIAL_WHITELIST_ATTRIBUTE,
} from "./storyboard.types.js";
export type {
  StoryboardTutorialControls,
  StoryboardTutorialLabels,
  StoryboardTutorialScenario,
  StoryboardTutorialState,
  StoryboardTutorialStep,
  StoryboardTutorialStepInput,
  StoryboardTutorialStepResult,
  StoryboardTutorialStepRunner,
  TutorialActionDetection,
  TutorialActionType,
  TutorialCompletionConfig,
  TutorialCompletionReason,
  TutorialContext,
  TutorialFocusContext,
  TutorialFocusStrategy,
  TutorialMessageContext,
  TutorialMessageStrategy,
  TutorialPlacement,
  TutorialStatus,
} from "./storyboard.types.js";
