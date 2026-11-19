import React, { useMemo, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { KeyValue } from "../../engine/types.js";
import { translateKey } from "../../services/RgxTranslateService.js";

/**
 * @description One entry managed by {@link RgxFieldset}.
 * @summary Extends a loose key/value bag with an optional index and the title,
 * description and informational strings used for display.
 * @memberOf module:for-react
 */
export interface RgxFieldsetItem extends KeyValue {
  index?: number;
  title?: string;
  description?: string;
  info?: string;
  subinfo?: string;
}

/**
 * @description Public props accepted by {@link RgxFieldset}.
 * @summary Configures the fieldset heading, operation, multiplicity and item
 * limit, together with the item list, change callback and custom renderers.
 * @memberOf module:for-react
 */
export interface RgxFieldsetProps {
  name?: string;
  title?: string;
  description?: string;
  operation?: OperationKeys;
  multiple?: boolean;
  value?: RgxFieldsetItem[];
  borders?: boolean;
  max?: number;
  required?: boolean;
  ordenable?: boolean;
  editable?: boolean;
  className?: string;
  locale?: string;
  onChange?: (items: RgxFieldsetItem[]) => void;
  renderItem?: (item: RgxFieldsetItem, index: number) => React.ReactNode;
  renderForm?: () => React.ReactNode;
  children?: React.ReactNode;
}

/**
 * @description Repeatable (or single) fieldset for editing item collections.
 * @summary Displays a titled group of {@link RgxFieldsetItem}s with add, edit,
 * remove and, when `ordenable`, move up/down controls. Editing is enabled for
 * `CREATE`/`UPDATE`; outside those operations, a non-multiple fieldset renders
 * a simple read-only list. Items are rendered from `renderItem` when supplied,
 * and the form area shows `renderForm`, `children`, or nothing when closed.
 * When `value` is non-empty or `onChange` is provided, rendering follows
 * `value` and mutations are reported through `onChange`; otherwise the
 * component manages items internally. Additions stop at `max`, a `max` of `1`
 * forces single mode, and headings, buttons and messages are translated via the
 * `locale` namespace.
 * @param {RgxFieldsetProps} props - Fieldset configuration and renderers.
 * @returns {React.ReactElement} The rendered fieldset.
 * @memberOf module:for-react
 * @example
 * <RgxFieldset
 *   name="contacts"
 *   title="Contacts"
 *   operation={OperationKeys.CREATE}
 *   value={contacts}
 *   onChange={setContacts}
 *   renderForm={() => <ContactForm />}
 * />
 */
export const RgxFieldset: React.FC<RgxFieldsetProps> = ({
  name = "fieldset",
  title,
  description,
  operation = OperationKeys.CREATE,
  multiple = true,
  value = [],
  borders = true,
  max,
  required = false,
  ordenable = true,
  editable = true,
  className = "",
  locale = "fieldset",
  onChange,
  renderItem,
  renderForm,
  children,
}) => {
  const [items, setItems] = useState<RgxFieldsetItem[]>(value);
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);

  const current = value.length || onChange ? value : items;
  const canEdit =
    operation === OperationKeys.CREATE || operation === OperationKeys.UPDATE;
  const canAdd = !max || current.length < max;
  const isMultiple = max === 1 ? false : multiple;

  const update = (next: RgxFieldsetItem[]) => {
    setItems(next);
    onChange?.(next);
  };

  const header = useMemo(
    () => translateKey(title || name) || name,
    [title, name]
  );

  if (!canEdit && !isMultiple) {
    return (
      <div className={`dcf-fieldset-component read ${className}`}>
        <span className="dcf-title">{header}</span>
        {!current.length ? (
          <div className="dcf-padding-xsmall">
            {translateKey(`${locale}.empty`) || "No items"}
          </div>
        ) : (
          current.map((item, index) => (
            <div className="dcf-fieldset-read-item" key={index}>
              {renderItem ? renderItem(item, index) : <span>{item.title}</span>}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div
      id={`${name.toLowerCase()}-fieldset`}
      role={canEdit ? "group" : "region"}
      aria-labelledby={`${name.toLowerCase()}-fieldset-title`}
      className={[
        "dcf-fieldset-component",
        operation,
        borders ? "" : "dcf-blank",
        !current.length ? "dcf-empty" : "",
        isOpen ? "dcf-open" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="dcf-width-1-1">
        <div className="dcf-grid dcf-grid-collapse dcf-flex dcf-flex-middle dcf-width-1-1">
          <div className="dcf-width-expand">
            <span
              className="dcf-title"
              id={`${name.toLowerCase()}-fieldset-title`}
            >
              {header}
            </span>
            {description && <div className="dcf-description">{description}</div>}
          </div>
          {!required && canEdit && isMultiple && (
            <div className="dcf-width-auto dcf-delete">
              <button
                type="button"
                className="dcf-button clear"
                onClick={() => {
                  update([]);
                  setIsOpen(false);
                }}
                aria-label={
                  current.length
                    ? translateKey(`${locale}.clear_items`)
                    : translateKey(`${locale}.hidden_form`)
                }
              >
                {current.length ? "Clear" : "Show"}
              </button>
            </div>
          )}
        </div>

        <div className="dcf-fieldset-content">
          {isMultiple &&
            current.map((item, index) => (
              <div
                key={index}
                className="dcf-fieldset-item"
                title={String(item.title || item["pk"] || "")}
              >
                <span className="dcf-title">
                  {index + 1}. {item.title}
                </span>
                {item.description && (
                  <div className="dcf-subtitle">{item.description}</div>
                )}
                <div className="dcf-fieldset-actions">
                  {ordenable && index > 0 && (
                    <button
                      type="button"
                      aria-label="Move up"
                      onClick={() => {
                        const next = [...current];
                        [next[index - 1], next[index]] = [
                          next[index],
                          next[index - 1],
                        ];
                        update(next);
                      }}
                    >
                      ↑
                    </button>
                  )}
                  {ordenable && index < current.length - 1 && (
                    <button
                      type="button"
                      aria-label="Move down"
                      onClick={() => {
                        const next = [...current];
                        [next[index + 1], next[index]] = [
                          next[index],
                          next[index + 1],
                        ];
                        update(next);
                      }}
                    >
                      ↓
                    </button>
                  )}
                  {editable && (
                    <button
                      type="button"
                      aria-label={translateKey(`${locale}.edit_item`)}
                      onClick={() => {
                        setUpdating(index);
                        setIsOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={translateKey(`${locale}.remove_item`)}
                    onClick={() =>
                      update(current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

          {isOpen || !isMultiple
            ? renderForm
              ? renderForm()
              : children
            : null}

          {isMultiple && (
            <div className="dcf-buttons-container">
              {canAdd && (
                <button
                  type="button"
                  className="dcf-button clear"
                  aria-label={translateKey(`${locale}.create_item`)}
                  onClick={() => {
                    setIsOpen(true);
                    setUpdating(null);
                  }}
                >
                  +{" "}
                  {translateKey(
                    `${locale}.${
                      required
                        ? current.length
                          ? "add"
                          : "add_first"
                        : current.length
                        ? "add"
                        : isOpen
                        ? "add_first"
                        : "show_form"
                    }`
                  ) || "Add"}
                </button>
              )}
              {updating !== null && (
                <button
                  type="button"
                  className="dcf-button clear"
                  onClick={() => {
                    setUpdating(null);
                    setIsOpen(false);
                  }}
                >
                  {translateKey(`${locale}.cancel`) || "Cancel"}
                </button>
              )}
            </div>
          )}
          {max && (
            <div className="dcf-max-message-container">
              {current.length === max
                ? (translateKey(`${locale}.max_items_reached`, { "0": max }) ||
                  `Max ${max} items reached`)
                : translateKey(`${locale}.max_items`, { "0": max }) ||
                  `Up to ${max} items`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
