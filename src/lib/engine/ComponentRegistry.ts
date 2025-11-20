import type React from "react";

type ReactComponent = React.ComponentType<any>;

/**
 * @description Simple registry that maps component tags to React components.
 * @summary `RgxComponentRegistry` enables the rendering engine to look up components
 * at runtime by tag name. Components should be registered during application boot.
 */
export class RgxComponentRegistry {
  private static registry = new Map<string, ReactComponent>();

  /**
   * @description Registers a component implementation for the provided tag.
   * @param tag Component tag as defined in the decorator metadata.
   * @param component React component implementation.
   */
  static register<T extends ReactComponent>(tag: string, component: T): T {
    this.registry.set(tag, component);
    return component;
  }

  /**
   * @description Fetches the component implementation for a tag.
   * @param tag Component tag that was provided to {@link register}.
   */
  static get(tag: string): ReactComponent | undefined {
    return this.registry.get(tag);
  }

  /**
   * @description Resets the registry, mostly used in tests.
   */
  static clear(): void {
    this.registry.clear();
  }
}
