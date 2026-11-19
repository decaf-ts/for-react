import React, { useMemo } from "react";
import { RgxComponentRegistry } from "../../engine/ComponentRegistry.js";
import { ReactEngineKeys, BaseComponentProps } from "../../engine/constants.js";
import { KeyValue } from "../../engine/types.js";

/**
 * @description Props accepted by {@link RgxComponentRenderer}.
 * @summary Identifies the registered component tag and supplies the globals,
 * children, parent context and extra classes used when rendering it.
 * @memberOf module:for-react
 */
export interface RgxComponentRendererProps {
  tag: string;
  globals?: KeyValue;
  children?: React.ReactNode;
  projectable?: boolean;
  parent?: KeyValue;
  className?: string;
}

/**
 * @description React equivalent of the Angular `ComponentRendererComponent`.
 * @summary Dynamically looks up a component in the registry by tag and renders
 * it with props derived from the supplied globals.
 * @param {RgxComponentRendererProps} props - The tag, globals and rendering options.
 * @returns {React.ReactElement | null} The resolved component, or null when no component is registered for the tag.
 * @memberOf module:for-react
 */
export const RgxComponentRenderer: React.FC<RgxComponentRendererProps> = ({
  tag,
  globals = {},
  children,
  projectable = true,
  parent,
  className,
}) => {
  const Component = useMemo(() => RgxComponentRegistry.get(tag), [tag]);

  const props = useMemo(() => {
    const source =
      (globals["item"] as KeyValue | undefined) ||
      (globals["props"] as KeyValue | undefined) ||
      globals;
    const base: KeyValue = { ...(source || {}) };
    if (base.tag) delete base.tag;

    const childrenFromProps =
      (base[ReactEngineKeys.CHILDREN_DEFINITIONS] as KeyValue[] | undefined) ||
      (base[ReactEngineKeys.CHILDREN] as KeyValue[] | undefined);
    if (!projectable && childrenFromProps) {
      base[ReactEngineKeys.CHILDREN_DEFINITIONS] = childrenFromProps;
      delete base[ReactEngineKeys.CHILDREN];
    }

    if (parent && !base[BaseComponentProps.PARENT_FORM]) {
      base[BaseComponentProps.PARENT_FORM] = parent;
    }

    base.className = [base.className, className].filter(Boolean).join(" ").trim();
    return base;
  }, [globals, parent, className, projectable]);

  if (!Component) return null;
  return <Component {...props}>{projectable ? children : null}</Component>;
};
