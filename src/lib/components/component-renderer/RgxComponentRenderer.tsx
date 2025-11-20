import React, { useMemo } from "react";
import { RgxComponentRegistry } from "../../engine/ComponentRegistry";
import { ReactEngineKeys, BaseComponentProps } from "../../engine/constants";
import { KeyValue } from "../../engine/types";

export interface RgxComponentRendererProps {
  tag: string;
  globals?: KeyValue;
  children?: React.ReactNode;
  projectable?: boolean;
  parent?: KeyValue;
  className?: string;
}

/**
 * React equivalent of the Angular `ComponentRendererComponent`.
 * Dynamically looks up components in the registry and renders them with the provided props.
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
