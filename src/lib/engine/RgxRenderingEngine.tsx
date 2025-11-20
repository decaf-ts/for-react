import React from "react";
import type { Model } from "@decaf-ts/decorator-validation";
import type { FieldDefinition } from "@decaf-ts/ui-decorators";
import { RenderingEngine } from "@decaf-ts/ui-decorators";
import { RgxComponentRegistry } from "./ComponentRegistry";
import { ControlFieldProps, KeyValue } from "./types";
import { RgxFormService } from "./RgxFormService";
import { ReactEngineKeys } from "./constants";
import { KeyValue } from "./types";

function generateRendererId() {
  return Math.random().toString(36).replace(".", "");
}

export class RgxRenderingEngine extends RenderingEngine {
  constructor() {
    super(ReactEngineKeys.FLAVOUR);
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
  }

  private renderChildren(children: FieldDefinition<ControlFieldProps>[] | undefined, parentRendererId: string) {
    if (!children?.length) return null;
    return children.map((child) => {
      const childRendererId = child.rendererId ?? RgxFormService.mountFormIdPath(parentRendererId, child.props.childOf);
      return this.fromFieldDefinition({
        ...child,
        rendererId: childRendererId,
      });
    });
  }

  private fromFieldDefinition(def: FieldDefinition<ControlFieldProps>): React.ReactNode {
    const rendererId = def.rendererId || generateRendererId();
    const form = RgxFormService.get(rendererId);
    const propsFromDef = { ...(def.props || {}) } as KeyValue;
    const definitionChildren =
      (propsFromDef[ReactEngineKeys.CHILDREN_DEFINITIONS] as FieldDefinition<ControlFieldProps>[]) ||
      (propsFromDef[ReactEngineKeys.CHILDREN] as FieldDefinition<ControlFieldProps>[]) ||
      (def.children as FieldDefinition<ControlFieldProps>[]) ||
      [];
    delete propsFromDef[ReactEngineKeys.CHILDREN];
    let componentProps: ControlFieldProps = {
      ...(propsFromDef as ControlFieldProps),
      formProvider: form,
      childrenDefinitions: definitionChildren,
    };

    if (componentProps.path || componentProps.name) {
      componentProps = form.addFormControl(componentProps);
    }

    const Component = RgxComponentRegistry.get(def.tag);
    if (!Component) {
      console.warn(`Component ${def.tag} not found on registry`);
      return null;
    }

    const children = this.renderChildren(def.children as FieldDefinition<ControlFieldProps>[], rendererId);
    const key = [rendererId, componentProps.path || componentProps.name || def.tag].join(".");

    return (
      <Component key={key} {...componentProps}>
        {children}
      </Component>
    );
  }

  render<M extends Model>(model: M, globalProps: Record<string, unknown> = {}): React.ReactNode {
    const def = this.toFieldDefinition(model, globalProps) as unknown as FieldDefinition<ControlFieldProps>;
    return this.fromFieldDefinition(def);
  }
}
