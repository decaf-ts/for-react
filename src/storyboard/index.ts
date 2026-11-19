/**
 * @namespace storyboard
 * @description Named `./storyboard` subpath export of `@decaf-ts/for-react`.
 * @summary Guided storyboard tutorial surface: the {@link StoryboardTutorial}
 * React host component, the module-singleton
 * {@link StoryboardTutorialStore} with its `useSyncExternalStore` hooks, the
 * framework-agnostic {@link StoryboardTutorialEngine}, the completion resolver
 * and detector, and the pluggable fade/highlight focus and bubble message
 * strategies. Importing this subpath adds no runtime dependency of its own.
 * The public surface is re-exported from `public-api.ts`.
 * @memberOf module:for-react
 */
export * from "./public-api.js";
