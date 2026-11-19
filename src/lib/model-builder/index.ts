/**
 * @file Model builder barrel.
 * @description Re-exports the decorator-validation fluent model builder: the
 * {@link ModelBuilder} entry point, the {@link AttributeBuilder} used to
 * configure individual model attributes, and the {@link DecorateOption}
 * contract shared by both. Importing `@decaf-ts/core` for its side effects
 * registers the core decoration metadata before a builder applies attributes.
 * @summary Single import point for the fluent model-builder surface exposed at
 * the package root.
 */
import "@decaf-ts/core";

export {
  AttributeBuilder,
  ModelBuilder,
} from "@decaf-ts/decorator-validation";
export type { DecorateOption } from "@decaf-ts/decorator-validation";
