import React from "react";
import type { Model } from "@decaf-ts/decorator-validation";
import type {
  DecafComponent,
  DecafSpinnerOptions,
  DecafToastOptions,
  FieldDefinition,
  IDecafModal,
  IDecafRouter,
  IDecafSpinner,
  IDecafToast,
} from "@decaf-ts/ui-decorators";
import { RenderingEngine } from "@decaf-ts/ui-decorators";
import { RgxComponentRegistry } from "./ComponentRegistry.js";
import { ControlFieldProps } from "./types.js";
import { RgxFormService } from "./RgxFormService.js";
import { ReactEngineKeys } from "./constants.js";
import { KeyValue } from "./types.js";
import type { RgxModalProps } from "../components/modal/RgxModal.js";
import { presentRgxModal } from "../components/modal/RgxModal.js";
import { defaultRouterService } from "../services/RgxRouterService.js";
import { getRgxToast } from "../utils/RgxToast.js";
import { getRgxSpinner } from "../utils/RgxSpinner.js";

function presentModalBridge(props: RgxModalProps): IDecafModal {
  let handle: ReturnType<typeof presentRgxModal>;
  const ensurePresented = () => {
    if (!handle) handle = presentRgxModal({ ...props, isOpen: true });
    return handle;
  };
  const bridge: Record<string, unknown> = {
    isOpen: true,
    title: props.title,
    tag: props.tag,
    options: props.options,
    globals: props.globals,
    inlineContent: props.inlineContent,
    inlineContentPosition: props.inlineContentPosition ?? "bottom",
    fullscreen: props.fullscreen ?? false,
    expandable: props.expandable ?? false,
    borders: props.borders ?? true,
    lightBox: props.lightBox ?? false,
    headerTransparent: props.headerTransparent ?? false,
    headerBackground: props.headerBackground ?? "transparent",
    showHeader: props.showHeader ?? true,
    showCloseButton: props.showCloseButton ?? true,
    expanded: false,
    iconColor: "",
    willDismissEvent: { emit: () => undefined },
    ngOnInit: async () => undefined,
    prepare: async () => undefined,
    parseInlineContent: () => undefined,
    create: async () => {
      ensurePresented();
      return bridge;
    },
    present: async () => {
      ensurePresented();
    },
    handleEvent: async () => undefined,
    handleWillDismiss: async () => ({}),
    handleExpandToggle: () => undefined,
    cancel: async () => {
      ensurePresented()?.dismiss("cancel");
    },
    confirm: async (event?: unknown) => {
      ensurePresented()?.dismiss("confirm", event);
    },
  };
  return bridge as unknown as IDecafModal;
}

function generateRendererId() {
  return Math.random().toString(36).replace(".", "");
}

/**
 * @description React implementation of the decaf rendering engine.
 * @summary Translates decaf field definitions into React elements by resolving
 * components from {@link RgxComponentRegistry} and wiring each field to an
 * {@link RgxFormService} instance. Nested field definitions are rendered
 * recursively, inheriting the parent renderer identifier.
 * @memberOf module:for-react
 */
export class RgxRenderingEngine extends RenderingEngine<
  React.ReactNode,
  React.ReactNode
> {
  /**
   * @description Creates a rendering engine bound to the React engine flavour.
   * @summary Registers the engine under {@link ReactEngineKeys.FLAVOUR} so the
   * ui-decorators runtime can resolve it for React rendering.
   */
  constructor() {
    super(ReactEngineKeys.FLAVOUR);
  }

  /**
   * @description Marks the engine as initialized.
   * @summary Idempotent lifecycle hook; subsequent calls return immediately
   * once the engine has been initialized.
   * @returns {Promise<void>} Resolves when the engine is ready for use.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }

  override router(): IDecafRouter {
    return defaultRouterService as unknown as IDecafRouter;
  }

  override async getToast(options: DecafToastOptions): Promise<IDecafToast> {
    const toast = getRgxToast(options);
    return {
      options,
      error: (message: string) => toast.error(message),
      warn: (message: string) => toast.warn(message),
      success: async (message: string) => {
        await toast.success(message);
      },
      show: async (message: string, overrides?: DecafToastOptions) => {
        await toast.show(message, overrides);
      },
      create: async (overrides: DecafToastOptions) => {
        await toast.show(overrides.message, overrides);
        return {};
      },
    };
  }

  override async getSpinner(
    options: DecafSpinnerOptions
  ): Promise<IDecafSpinner> {
    const spinner = getRgxSpinner(options);
    return {
      isVisible: () => spinner.isVisible(),
      show: async (message, overrides) =>
        spinner.show(message, overrides),
      update: async (message, isProgressUpdate) =>
        spinner.update(message, isProgressUpdate),
      remove: async () => spinner.remove(),
      getOptions: async (overrides, message) =>
        spinner.getOptions(overrides, message),
      getMessage: async () => spinner.getMessage(),
    };
  }

  override async getModal<C extends DecafComponent<Model>>(
    component: Partial<C>,
    ..._args: unknown[]
  ): Promise<IDecafModal> {
    return presentModalBridge(component as unknown as RgxModalProps);
  }

  private renderChildren(
    children: FieldDefinition<ControlFieldProps>[] | undefined,
    parentRendererId: string
  ) {
    if (!children?.length) return null;
    return children.map((child) => {
      const childRendererId =
        child.rendererId ??
        RgxFormService.mountFormIdPath(parentRendererId, child.props.childOf);
      return this.renderFieldDefinition({
        ...child,
        rendererId: childRendererId,
      });
    });
  }

  /**
   * @description Renders a single field definition.
   * @summary Delegates to {@link RgxRenderingEngine#renderFieldDefinition} so
   * callers can use the generic engine API to produce React output.
   * @param {FieldDefinition<ControlFieldProps>} def - Field definition to render.
   * @returns {React.ReactNode} The rendered React node, or `null` when the tag
   * is unregistered.
   */
  fromFieldDefinition(
    def: FieldDefinition<ControlFieldProps>
  ): React.ReactNode {
    return this.renderFieldDefinition(def);
  }

  /**
   * @description Renders a field definition and registers it with its form service.
   * @summary Resolves the target component, attaches a form provider and
   * control metadata, and recursively renders any child definitions. Returns
   * `null` when no component is registered for the definition's tag.
   * @param {FieldDefinition<ControlFieldProps>} def - Field definition to render.
   * @returns {React.ReactNode} The rendered React element or `null`.
   */
  renderFieldDefinition(
    def: FieldDefinition<ControlFieldProps>
  ): React.ReactNode {
    const rendererId = def.rendererId || generateRendererId();
    const form = RgxFormService.get(rendererId);
    const propsFromDef = { ...(def.props || {}) } as KeyValue;
    const definitionChildren =
      (propsFromDef[
        ReactEngineKeys.CHILDREN_DEFINITIONS
      ] as FieldDefinition<ControlFieldProps>[]) ||
      (propsFromDef[
        ReactEngineKeys.CHILDREN
      ] as FieldDefinition<ControlFieldProps>[]) ||
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

    const children = this.renderChildren(
      def.children as FieldDefinition<ControlFieldProps>[],
      rendererId
    );
    const key = [
      rendererId,
      componentProps.path || componentProps.name || def.tag,
    ].join(".");

    return (
      <Component key={key} {...componentProps}>
        {children}
      </Component>
    );
  }

  /**
   * @description Converts a model into a field definition and renders it.
   * @summary Builds the definition through the inherited `toFieldDefinition`
   * helper, merging optional global props, then renders the resulting tree.
   * @param {Model} model - Model instance to render.
   * @param {Record<string, unknown>} [globalProps] - Optional props applied to
   * the generated definition.
   * @returns {React.ReactNode} The rendered React node for the model.
   */
  render<M extends Model>(
    model: M,
    globalProps: Record<string, unknown> = {}
  ): React.ReactNode {
    const def = this.toFieldDefinition(
      model,
      globalProps
    ) as unknown as FieldDefinition<ControlFieldProps>;
    return this.renderFieldDefinition(def);
  }
}

let rgxEngine: RgxRenderingEngine | undefined;

/**
 * @description Returns the shared rendering engine instance.
 * @summary Lazily creates a singleton {@link RgxRenderingEngine} on first use
 * and returns the same instance on subsequent calls.
 * @returns {RgxRenderingEngine} The process-wide rendering engine.
 * @memberOf module:for-react
 */
export function getRgxRenderingEngine(): RgxRenderingEngine {
  if (!rgxEngine) {
    rgxEngine = new RgxRenderingEngine();
  }
  return rgxEngine;
}
