import React, { useEffect, useMemo, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import {
  hideOn,
  uielement,
  uilayoutprop,
  uiorder,
} from "@decaf-ts/ui-decorators";
import { ModelBuilder } from "../../model-builder/index.js";
import type { Model } from "@decaf-ts/decorator-validation";
import { modelBuilderStructuredDefinitionOf } from "../../utils/structured-output.js";
import { translateKey } from "../../services/RgxTranslateService.js";

/**
 * @description Descriptor for a single model property edited in the builder.
 * @summary Groups the field name and data type with its UI, layout and
 * validation settings so the builder can render controls for each aspect.
 * @memberOf module:for-react
 */
export interface ModelBuilderProperty {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  ui: {
    tag: string;
    customTag?: string;
    label?: string;
    placeholder?: string;
    type?: string;
    readonly?: boolean;
    translatable?: boolean;
    options?: string;
  };
  layout: {
    col?: number | string;
    row?: number;
    order?: string;
    orderNum?: number | null;
    hideOn: string[];
  };
  validators: {
    required?: boolean;
    email?: boolean;
    url?: boolean;
    min?: number | null;
    max?: number | null;
    minlength?: number | null;
    maxlength?: number | null;
    pattern?: string;
  };
  expanded?: boolean;
}

/**
 * @description Seed configuration for a model built with
 * {@link RgxModelBuilder}.
 * @summary Supplies an optional model name and the initial property list the
 * builder starts from.
 * @memberOf module:for-react
 */
export interface ModelBuilderConfig {
  name?: string;
  properties: ModelBuilderProperty[];
}

/**
 * @description Public props accepted by the {@link RgxModelBuilder} component.
 * @summary Configures the initial definition and model config, the tag and
 * input-type options offered per property, the operations available for the
 * "hide on" flag, and the callbacks fired when a definition is built:
 * `structuredOutputChange`, `onChange`, `onBuild`, and `onModelBuild`, which
 * receives the runtime `Model` instance constructed alongside the definition.
 * An optional preview and custom preview renderer are also accepted.
 * @memberOf module:for-react
 */
export interface RgxModelBuilderProps {
  preview?: boolean;
  structuredOutputMode?: boolean;
  definition?: unknown;
  modelConfig?: ModelBuilderConfig;
  locale?: string;
  className?: string;
  componentTags?: { label: string; value: string }[];
  inputTypes?: string[];
  hideOnOps?: string[];
  structuredOutputChange?: (definition: Record<string, unknown>) => void;
  onChange?: (definition: Record<string, unknown>) => void;
  onBuild?: (definition: Record<string, unknown>) => void;
  onModelBuild?: (model: Model) => void;
  renderPreview?: (definition: Record<string, unknown>) => React.ReactNode;
}

function createProperty(index: number): ModelBuilderProperty {
  return {
    name: `field${index + 1}`,
    type: "string",
    ui: { tag: "ngx-decaf-crud-field", type: "text", translatable: true },
    layout: { col: 1, row: 1, order: "", hideOn: [] },
    validators: {},
    expanded: false,
  };
}

/**
 * @description Resolves the UI decorator tag configured for a property.
 * @summary Returns the chosen tag, falling back to `input` when the caller
 * selected the `custom` tag without supplying a `customTag`.
 * @param {object} ui - The property's UI settings.
 * @returns {string} The tag passed to the `@uielement` decorator.
 * @memberOf module:for-react
 */
function resolveTag(ui: ModelBuilderProperty["ui"]): string {
  return ui.tag === "custom" ? ui.customTag || "input" : ui.tag;
}

/**
 * @description Resolves the input element type for a property.
 * @summary Honours an explicit non-`text` UI type and otherwise derives the
 * input type from the property's data type, mapping `boolean` to `checkbox`
 * and leaving other types as text.
 * @param {string} propType - The property's data type.
 * @param {string} [uiType] - The optional type selected in the UI controls.
 * @returns {string} The input type stored in the element props.
 * @memberOf module:for-react
 */
function resolveInputType(
  propType: ModelBuilderProperty["type"],
  uiType?: string
): string {
  if (uiType && uiType !== "text") return uiType;
  switch (propType) {
    case "number":
      return "number";
    case "date":
      return "date";
    case "boolean":
      return "checkbox";
    default:
      return "text";
  }
}

/**
 * @description Parses the builder's option text into decorator option entries.
 * @summary Splits the comma-separated list on commas and each entry on the
 * first colon, using the value as the label when no label part is supplied.
 * Blank input yields an empty list.
 * @param {string} [optionsStr] - The comma-separated `value:label` option text.
 * @returns {object[]} The parsed option entries, each with `value` and `label` strings.
 * @memberOf module:for-react
 */
function parseOptions(
  optionsStr?: string
): { value: string; label: string }[] {
  if (!optionsStr?.trim()) return [];
  return optionsStr.split(",").map((entry) => {
    const trimmed = entry.trim();
    const parts = trimmed.split(":");
    return { value: parts[0].trim(), label: (parts[1] || parts[0]).trim() };
  });
}

/**
 * @description Interactive editor for assembling a model definition from a
 * list of property descriptors.
 * @summary Lets the caller set the model name, add, reorder and remove
 * properties, and edit each property's UI, layout and validator settings. When
 * `definition` changes and can be parsed by the structured-output helper, the
 * model name and properties are rehydrated from it. Building is disabled until
 * the model name and every property name are non-empty.
 *
 * A successful build constructs a runtime `Model` through the for-react
 * `ModelBuilder` barrel, applying the selected validators and the UI/layout
 * decorators derived from each property, then exposes that instance through
 * `onModelBuild` and the `data-built-model` attribute (set to the model's
 * class name). The emitted definition payload uses the structured-output shape
 * when `structuredOutputMode` is set, otherwise a plain
 * `{ name, properties }` object, and is delivered to `structuredOutputChange`,
 * `onChange` and `onBuild`. When the build cannot complete, the component
 * records `buildError` and renders it as a `role="alert"` message instead of
 * throwing or invoking the callbacks.
 * @param {RgxModelBuilderProps} props - Values that seed the builder and
 * customise its options.
 * @returns {React.ReactElement} The rendered builder, optionally with a live
 * preview.
 * @memberOf module:for-react
 */
export const RgxModelBuilder: React.FC<RgxModelBuilderProps> = ({
  preview = false,
  structuredOutputMode = false,
  definition,
  modelConfig,
  locale = "component.model_builder",
  className = "",
  componentTags = [
    { label: "CRUD Field", value: "ngx-decaf-crud-field" },
    { label: "Custom", value: "custom" },
  ],
  inputTypes = ["text", "number", "email", "date", "select", "radio", "textarea", "checkbox"],
  hideOnOps = ["create", "read", "update", "delete"],
  structuredOutputChange,
  onChange,
  onBuild,
  onModelBuild,
  renderPreview,
}) => {
  const [name, setName] = useState(modelConfig?.name || "GeneratedModel");
  const [properties, setProperties] = useState<ModelBuilderProperty[]>(
    modelConfig?.properties || []
  );
  const [built, setBuilt] = useState<Record<string, unknown> | null>(null);
  const [builtModel, setBuiltModel] = useState<Model | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = modelBuilderStructuredDefinitionOf(definition);
    if (parsed) {
      setName(String(parsed.model || "GeneratedModel"));
      const props = parsed["properties"];
      if (Array.isArray(props)) {
        setProperties(props as ModelBuilderProperty[]);
      }
    }
  }, [definition]);

  const update = (next: ModelBuilderProperty[]) => setProperties(next);

  const patchProperty = (
    index: number,
    patch: Partial<ModelBuilderProperty>
  ) => {
    const next = properties.map((prop, propIndex) =>
      propIndex === index ? { ...prop, ...patch } : prop
    );
    update(next);
  };

  const patchUi = (index: number, patch: Partial<ModelBuilderProperty["ui"]>) => {
    const prop = properties[index];
    patchProperty(index, { ui: { ...prop.ui, ...patch } });
  };

  const patchLayout = (
    index: number,
    patch: Partial<ModelBuilderProperty["layout"]>
  ) => {
    const prop = properties[index];
    patchProperty(index, { layout: { ...prop.layout, ...patch } });
  };

  const patchValidators = (
    index: number,
    patch: Partial<ModelBuilderProperty["validators"]>
  ) => {
    const prop = properties[index];
    patchProperty(index, { validators: { ...prop.validators, ...patch } });
  };

  /**
   * @description Builds the runtime {@link Model} for the current editor state
   * and emits the definition payload.
   * @summary Creates a builder through the for-react `ModelBuilder` barrel,
   * adds one attribute per property with its data type, validators and
   * UI/layout decorators, builds the model class and instantiates it. The
   * instance is stored for rendering and passed to `onModelBuild`; the payload
   * is emitted to the change callbacks. Validation failures are recorded in
   * `buildError` (as a translation key) and suppress all callbacks.
   * @returns {Record<string, unknown> | null} The emitted definition payload,
   * or `null` when the build failed.
   * @memberOf module:for-react
   */
  const buildDefinition = (): Record<string, unknown> | null => {
    setBuildError(null);
    try {
      const modelName = name.trim();
      if (!modelName) {
        throw new Error("component.model_builder.model_name_required");
      }

      const builder = ModelBuilder.builder<Model & Record<string, unknown>>();
      builder.setName(modelName);

      for (const prop of properties) {
        const propName = prop.name.trim();
        if (!propName) {
          throw new Error("component.model_builder.property_name_required");
        }

        let attr;
        switch (prop.type) {
          case "number":
            attr = builder.number(propName as never);
            break;
          case "date":
            attr = builder.date(propName as never);
            break;
          case "boolean":
            attr = builder.instance(Boolean as never, propName as never);
            break;
          default:
            attr = builder.string(propName as never);
            break;
        }

        const validators = prop.validators;
        if (validators.required) attr.required();
        if (validators.min !== null && validators.min !== undefined) {
          attr.min(validators.min);
        }
        if (validators.max !== null && validators.max !== undefined) {
          attr.max(validators.max);
        }
        if (validators.minlength !== null && validators.minlength !== undefined) {
          attr.minlength(validators.minlength);
        }
        if (validators.maxlength !== null && validators.maxlength !== undefined) {
          attr.maxlength(validators.maxlength);
        }
        if (validators.pattern) attr.pattern(validators.pattern);
        if (validators.email) attr.email();
        if (validators.url) attr.url();

        const tag = resolveTag(prop.ui);
        const inputType = resolveInputType(prop.type, prop.ui.type);
        const elementProps: Record<string, unknown> = {
          label: prop.ui.label || propName,
          type: inputType,
        };
        if (prop.ui.placeholder) {
          elementProps["placeholder"] = prop.ui.placeholder;
        }
        if (prop.ui.readonly) elementProps["readonly"] = true;
        if (prop.ui.translatable !== undefined) {
          elementProps["translatable"] = prop.ui.translatable;
        }
        const options = parseOptions(prop.ui.options);
        if (options.length) elementProps["options"] = options;

        type DecoratorFn = (target: unknown, key?: string | symbol) => unknown;
        const decorators: DecoratorFn[] = [
          uielement(tag, elementProps) as DecoratorFn,
          uilayoutprop(
            (prop.layout.col ?? 1) as never,
            (prop.layout.row ?? 1) as never
          ) as DecoratorFn,
        ];

        if (prop.layout.order === "first") {
          decorators.push(uiorder("first" as never) as DecoratorFn);
        } else if (prop.layout.order === "last") {
          decorators.push(uiorder("last" as never) as DecoratorFn);
        } else if (
          prop.layout.orderNum !== null &&
          prop.layout.orderNum !== undefined
        ) {
          decorators.push(uiorder(prop.layout.orderNum as never) as DecoratorFn);
        }

        if (prop.layout.hideOn?.length) {
          const operations = prop.layout.hideOn.map((op) => {
            switch (op) {
              case "create":
                return OperationKeys.CREATE;
              case "read":
                return OperationKeys.READ;
              case "update":
                return OperationKeys.UPDATE;
              case "delete":
                return OperationKeys.DELETE;
              default:
                return op;
            }
          });
          decorators.push(hideOn(...(operations as never[])) as DecoratorFn);
        }

        attr.decorate(...(decorators as never[]));
      }

      const ModelClass = builder.build();
      const instance = new ModelClass() as Model;
      setBuiltModel(instance);
      onModelBuild?.(instance);

      const payload: Record<string, unknown> = structuredOutputMode
        ? {
            model: name,
            instructions: "",
            jsonPromptInjection: false,
            providerOptions: {},
            properties,
          }
        : { name, properties };
      setBuilt(payload);
      structuredOutputChange?.(payload);
      onChange?.(payload);
      onBuild?.(payload);
      return payload;
    } catch (error: unknown) {
      setBuildError(
        error instanceof Error &&
          error.message.startsWith("component.model_builder.")
          ? error.message
          : "component.model_builder.build_failed"
      );
      setBuiltModel(null);
      return null;
    }
  };

  const canBuild = useMemo(
    () => !!name?.trim() && properties.every((prop) => !!prop.name?.trim()),
    [name, properties]
  );

  return (
    <div
      className={["dcf-model-builder", className].filter(Boolean).join(" ")}
      data-built-model={builtModel ? builtModel.constructor.name : undefined}
    >
      <div className="dcf-model-builder__editor">
        <label>
          {translateKey(`${locale}.model_name`) || "Model name"}
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <div className="dcf-model-builder__toolbar">
          <button
            type="button"
            onClick={() => update([...properties, createProperty(properties.length)])}
          >
            {translateKey(`${locale}.add_property`) || "Add property"}
          </button>
        </div>

        {!properties.length ? (
          <div className="dcf-model-builder__empty">
            {translateKey(`${locale}.empty_properties`) || "No properties yet"}
          </div>
        ) : (
          <div className="dcf-model-builder__properties">
            {properties.map((prop, index) => (
              <div
                className="dcf-model-builder__property"
                key={`${prop.name}-${index}`}
              >
                <div className="dcf-model-builder__property-header">
                  <span>{index + 1}</span>
                  <button
                    type="button"
                    aria-expanded={!!prop.expanded}
                    onClick={() =>
                      patchProperty(index, { expanded: !prop.expanded })
                    }
                  >
                    {prop.expanded ? "▾" : "▸"}
                  </button>
                  <span>{prop.name || "(unnamed)"}</span>
                  <span>{prop.type}</span>
                  <span>{prop.ui.tag === "custom" ? prop.ui.customTag : prop.ui.tag}</span>
                  <div className="dcf-model-builder__property-actions">
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label="Move up"
                      onClick={() => {
                        const next = [...properties];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        update(next);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === properties.length - 1}
                      aria-label="Move down"
                      onClick={() => {
                        const next = [...properties];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        update(next);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label="Remove property"
                      onClick={() =>
                        update(properties.filter((_, propIndex) => propIndex !== index))
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="dcf-model-builder__property-basic">
                  <label>
                    Name
                    <input
                      value={prop.name}
                      onChange={(event) =>
                        patchProperty(index, { name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Data type
                    <select
                      value={prop.type}
                      onChange={(event) =>
                        patchProperty(index, {
                          type: event.target.value as ModelBuilderProperty["type"],
                        })
                      }
                    >
                      {["string", "number", "date", "boolean"].map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Component tag
                    <select
                      value={prop.ui.tag}
                      onChange={(event) =>
                        patchUi(index, { tag: event.target.value })
                      }
                    >
                      {componentTags.map((tag) => (
                        <option key={tag.value} value={tag.value}>
                          {tag.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {prop.expanded && (
                  <div className="dcf-model-builder__property-advanced">
                    {prop.ui.tag === "custom" && (
                      <label>
                        Custom tag
                        <input
                          value={prop.ui.customTag || ""}
                          onChange={(event) =>
                            patchUi(index, { customTag: event.target.value })
                          }
                        />
                      </label>
                    )}
                    <label>
                      Label
                      <input
                        value={prop.ui.label || ""}
                        onChange={(event) =>
                          patchUi(index, { label: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Placeholder
                      <input
                        value={prop.ui.placeholder || ""}
                        onChange={(event) =>
                          patchUi(index, { placeholder: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Input type
                      <select
                        value={prop.ui.type || "text"}
                        onChange={(event) =>
                          patchUi(index, { type: event.target.value })
                        }
                      >
                        {inputTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!prop.ui.readonly}
                        onChange={(event) =>
                          patchUi(index, { readonly: event.target.checked })
                        }
                      />{" "}
                      Readonly
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!prop.ui.translatable}
                        onChange={(event) =>
                          patchUi(index, { translatable: event.target.checked })
                        }
                      />{" "}
                      Translatable
                    </label>
                    {(prop.ui.type === "select" || prop.ui.type === "radio") && (
                      <label>
                        Options (comma separated)
                        <textarea
                          value={prop.ui.options || ""}
                          onChange={(event) =>
                            patchUi(index, { options: event.target.value })
                          }
                        />
                      </label>
                    )}
                    <label>
                      Column span
                      <select
                        value={String(prop.layout.col ?? 1)}
                        onChange={(event) =>
                          patchLayout(index, {
                            col:
                              event.target.value === "half" ||
                              event.target.value === "full"
                                ? event.target.value
                                : Number(event.target.value),
                          })
                        }
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="half">half</option>
                        <option value="full">full</option>
                      </select>
                    </label>
                    <label>
                      Row
                      <input
                        type="number"
                        value={prop.layout.row ?? 1}
                        onChange={(event) =>
                          patchLayout(index, { row: Number(event.target.value) || 1 })
                        }
                      />
                    </label>
                    <label>
                      Order
                      <select
                        value={prop.layout.order || ""}
                        onChange={(event) =>
                          patchLayout(index, { order: event.target.value })
                        }
                      >
                        <option value="">None</option>
                        <option value="first">first</option>
                        <option value="last">last</option>
                      </select>
                    </label>
                    <div className="dcf-model-builder__group">
                      <span>Hide on</span>
                      {hideOnOps.map((op) => (
                        <label key={op}>
                          <input
                            type="checkbox"
                            checked={prop.layout.hideOn.includes(op)}
                            onChange={(event) => {
                              const hideOn = event.target.checked
                                ? [...prop.layout.hideOn, op]
                                : prop.layout.hideOn.filter((item) => item !== op);
                              patchLayout(index, { hideOn });
                            }}
                          />{" "}
                          {op}
                        </label>
                      ))}
                    </div>
                    <div className="dcf-model-builder__group">
                      <span>Validators</span>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!prop.validators.required}
                          onChange={(event) =>
                            patchValidators(index, { required: event.target.checked })
                          }
                        />{" "}
                        required
                      </label>
                      {prop.type === "string" && (
                        <>
                          <label>
                            <input
                              type="checkbox"
                              checked={!!prop.validators.email}
                              onChange={(event) =>
                                patchValidators(index, { email: event.target.checked })
                              }
                            />{" "}
                            email
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={!!prop.validators.url}
                              onChange={(event) =>
                                patchValidators(index, { url: event.target.checked })
                              }
                            />{" "}
                            url
                          </label>
                          <label>
                            Min length
                            <input
                              type="number"
                              value={prop.validators.minlength ?? ""}
                              onChange={(event) =>
                                patchValidators(index, {
                                  minlength: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                })
                              }
                            />
                          </label>
                          <label>
                            Max length
                            <input
                              type="number"
                              value={prop.validators.maxlength ?? ""}
                              onChange={(event) =>
                                patchValidators(index, {
                                  maxlength: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                })
                              }
                            />
                          </label>
                          <label>
                            Pattern
                            <input
                              value={prop.validators.pattern || ""}
                              onChange={(event) =>
                                patchValidators(index, { pattern: event.target.value })
                              }
                            />
                          </label>
                        </>
                      )}
                      {prop.type === "number" && (
                        <>
                          <label>
                            Min
                            <input
                              type="number"
                              value={prop.validators.min ?? ""}
                              onChange={(event) =>
                                patchValidators(index, {
                                  min: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                })
                              }
                            />
                          </label>
                          <label>
                            Max
                            <input
                              type="number"
                              value={prop.validators.max ?? ""}
                              onChange={(event) =>
                                patchValidators(index, {
                                  max: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                })
                              }
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="dcf-model-builder__footer">
          <button type="button" disabled={!canBuild} onClick={() => buildDefinition()}>
            {translateKey(`${locale}.build_model`) || "Build model"}
          </button>
          {!canBuild && (
            <div className="dcf-model-builder__error">
              {translateKey(`${locale}.invalid`) || "Every property needs a name"}
            </div>
          )}
          {buildError && (
            <div className="dcf-model-builder__error" role="alert">
              {translateKey(buildError)}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="dcf-model-builder__preview">
          <h2>{translateKey(`${locale}.live_preview`) || "Preview"}</h2>
          {built ? (
            renderPreview ? (
              renderPreview(built)
            ) : (
              <pre>{JSON.stringify(built, null, 2)}</pre>
            )
          ) : (
            <div className="dcf-model-builder__empty">
              {translateKey(`${locale}.preview_empty`) || "Build a model to preview it"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
