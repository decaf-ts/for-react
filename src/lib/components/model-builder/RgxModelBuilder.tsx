import React, { useEffect, useMemo, useState } from "react";
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
 * "hide on" flag, and the callbacks fired when a definition is built. An
 * optional preview and custom preview renderer are also accepted.
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
 * @description Interactive editor for assembling a model definition from a
 * list of property descriptors.
 * @summary Lets the caller set the model name, add, reorder and remove
 * properties, and edit each property's UI, layout and validator settings. When
 * `definition` changes and can be parsed by the structured-output helper, the
 * model name and properties are rehydrated from it. Building is disabled until
 * the model name and every property name are non-empty; a successful build
 * stores the payload and invokes `structuredOutputChange`, `onChange` and
 * `onBuild`. The returned payload uses the structured-output shape when
 * `structuredOutputMode` is set, otherwise a plain `{ name, properties }`
 * object.
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
  renderPreview,
}) => {
  const [name, setName] = useState(modelConfig?.name || "GeneratedModel");
  const [properties, setProperties] = useState<ModelBuilderProperty[]>(
    modelConfig?.properties || []
  );
  const [built, setBuilt] = useState<Record<string, unknown> | null>(null);

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

  const buildDefinition = (): Record<string, unknown> => {
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
  };

  const canBuild = useMemo(
    () => !!name?.trim() && properties.every((prop) => !!prop.name?.trim()),
    [name, properties]
  );

  return (
    <div className={["dcf-model-builder", className].filter(Boolean).join(" ")}>
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
