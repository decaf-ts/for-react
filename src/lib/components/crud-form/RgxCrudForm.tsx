import React from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { ICrudFormOptions } from "../../engine/interfaces.js";
import { DefaultFormReactiveOptions } from "../../engine/constants.js";
import { RgxFormService } from "../../engine/RgxFormService.js";

/**
 * @description Public props accepted by {@link RgxCrudForm}.
 * @summary Configures the form operation, the backing {@link RgxFormService},
 * button options and the submit/delete/cancel callbacks.
 * @memberOf module:for-react
 */
export interface RgxCrudFormProps {
  operation?: OperationKeys;
  formProvider?: RgxFormService;
  rendererId?: string;
  options?: ICrudFormOptions;
  action?: string;
  className?: string;
  children?: React.ReactNode;
  onSubmit?: (data: Record<string, unknown>) => void;
  onDelete?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}

const isReadOnlyOperation = (operation?: OperationKeys) =>
  operation === OperationKeys.READ || operation === OperationKeys.DELETE;

/**
 * @description CRUD form shell that wires a form provider to action buttons.
 * @summary Defaults to the `CREATE` operation and renders a `<form>` for
 * editable operations, or a read-only `<section>` for `READ`/`DELETE`. Submit
 * prevents the default event and forwards the data returned by
 * `formProvider.submit()` to `onSubmit`; a `null` result (failed validation)
 * skips the callback. The clear button calls `formProvider.reset()` and
 * `onCancel`, while delete forwards `formProvider.getParsedData()` to
 * `onDelete`. Submit is shown for `CREATE`/`UPDATE`, delete for `DELETE`, and
 * clear only when configured in `options.buttons.clear`; button labels and
 * icons are merged with {@link DefaultFormReactiveOptions}.
 * @param {RgxCrudFormProps} props - Form configuration, callbacks and children.
 * @returns {React.ReactElement} The rendered form or read-only section.
 * @memberOf module:for-react
 * @example
 * <RgxCrudForm operation={OperationKeys.CREATE} formProvider={form} onSubmit={save}>
 *   <RgxCrudField name="title" formProvider={form} />
 * </RgxCrudForm>
 */
export const RgxCrudForm: React.FC<RgxCrudFormProps> = ({
  operation = OperationKeys.CREATE,
  formProvider,
  rendererId,
  options,
  action,
  className,
  children,
  onSubmit,
  onDelete,
  onCancel,
}) => {
  const mergedOptions: ICrudFormOptions = {
    buttons: {
      submit: {
        ...DefaultFormReactiveOptions.buttons.submit,
        ...(options?.buttons?.submit || {}),
      },
      clear: options?.buttons?.clear,
    },
  };

  const getFormData = () => {
    return formProvider ? formProvider.getParsedData() : {};
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formProvider) {
      onSubmit?.({});
      return;
    }
    const data = formProvider.submit();
    if (data === null) return;
    onSubmit?.(data);
  };

  const handleReset = () => {
    formProvider?.reset();
    onCancel?.();
  };

  const handleDelete = () => {
    const data = getFormData();
    onDelete?.(data);
  };

  const renderButtons = () => {
    const submitLabel = action || mergedOptions.buttons.submit.text || "Submit";
    const clearLabel = mergedOptions.buttons.clear?.text || "Back";
    const showSubmit = operation === OperationKeys.CREATE || operation === OperationKeys.UPDATE;
    const showDelete = operation === OperationKeys.DELETE;

    return (
      <div className={`dcf-buttons-grid dcf-grid-small dcf-flex ${className || ""}`}>
        {showDelete && (
          <button type="button" className="dcf-button danger" onClick={handleDelete}>
            {mergedOptions.buttons.submit.icon ? (
              <span className={`icon ${mergedOptions.buttons.submit.iconSlot || "start"}`}>
                {mergedOptions.buttons.submit.icon}
              </span>
            ) : null}
            Delete
          </button>
        )}
        {showSubmit && (
          <button type="submit" className="dcf-button primary">
            {mergedOptions.buttons.submit.icon ? (
              <span className={`icon ${mergedOptions.buttons.submit.iconSlot || "start"}`}>
                {mergedOptions.buttons.submit.icon}
              </span>
            ) : null}
            {submitLabel}
          </button>
        )}
        {mergedOptions.buttons.clear && (
          <button type="button" className="dcf-button link" onClick={handleReset}>
            {mergedOptions.buttons.clear.icon ? (
              <span className={`icon ${mergedOptions.buttons.clear.iconSlot || "start"}`}>
                {mergedOptions.buttons.clear.icon}
              </span>
            ) : null}
            {clearLabel}
          </button>
        )}
      </div>
    );
  };

  if (isReadOnlyOperation(operation)) {
    return (
      <section className={`dcf-form-grid ${operation}`}>
        <div className="dcf-form-content">{children}</div>
        {renderButtons()}
      </section>
    );
  }

  return (
    <form
      id={rendererId}
      className={`dcf-form-grid ${operation} ${className || ""}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="dcf-form-content">{children}</div>
      {renderButtons()}
    </form>
  );
};
