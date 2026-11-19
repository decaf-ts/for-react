import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { KeyValue } from "../../engine/types.js";
import { ComponentEventNames } from "../../engine/constants.js";
import { RgxComponentRenderer } from "../component-renderer/RgxComponentRenderer.js";
import { translateKey } from "../../services/RgxTranslateService.js";

/**
 * @description Detail object supplied to modal dismissal callbacks.
 * @summary Carries the role that triggered the dismissal (`"cancel"` or
 * `"confirm"` when produced by the built-in buttons) together with any data the
 * presenter attached to the event.
 * @memberOf module:for-react
 */
export interface RgxModalDismissDetail {
  role?: string;
  data?: unknown;
}

/**
 * @description Public props accepted by the {@link RgxModal} component.
 * @summary Controls the open state, header and body presentation, optional
 * inline content, the tag-driven renderer used in place of children, and the
 * confirm/cancel affordances. Labels fall back to translated defaults provided
 * by the locale key prefix.
 * @memberOf module:for-react
 */
export interface RgxModalProps {
  title?: string;
  isOpen?: boolean;
  tag?: string;
  options?: KeyValue;
  globals?: KeyValue;
  inlineContent?: string | React.ReactNode;
  inlineContentPosition?: "top" | "bottom";
  fullscreen?: boolean;
  expandable?: boolean;
  borders?: boolean;
  lightBox?: boolean;
  headerTransparent?: boolean;
  headerBackground?: string;
  showHeader?: boolean;
  showCloseButton?: boolean;
  className?: string;
  locale?: string;
  children?: React.ReactNode;
  onWillDismiss?: (detail: RgxModalDismissDetail) => void;
  onDismiss?: (detail: RgxModalDismissDetail) => void;
  onConfirm?: (data?: unknown) => void;
  confirmText?: string;
  cancelText?: string;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
}

/**
 * @description Portal-rendered dialog with a configurable header, content area
 * and optional confirm/cancel actions.
 * @summary Renders nothing when closed or when no DOM document is available.
 * While open it listens for the Escape key and dismisses with the `"cancel"`
 * role. Content is either the `tag`-driven {@link RgxComponentRenderer} or the
 * supplied children, optionally wrapped by inline content positioned above or
 * below. Dismissal invokes `onWillDismiss` then `onDismiss`, while the confirm
 * button invokes `onConfirm` before dismissing with the `"confirm"` role.
 * @param {RgxModalProps} props - Values that control visibility and layout.
 * @returns {React.ReactPortal | null} The portal into `document.body`, or
 * `null` when the modal is not rendered.
 * @memberOf module:for-react
 */
export const RgxModal: React.FC<RgxModalProps> = ({
  title,
  isOpen = false,
  tag,
  options,
  globals = {},
  inlineContent,
  inlineContentPosition = "bottom",
  fullscreen = false,
  expandable = false,
  borders = true,
  lightBox = false,
  headerTransparent = false,
  headerBackground = "transparent",
  showHeader = true,
  showCloseButton = true,
  className = "",
  locale = "modal",
  children,
  onWillDismiss,
  onDismiss,
  onConfirm,
  confirmText,
  cancelText,
  showConfirmButton = false,
  showCancelButton = true,
}) => {
  const dismiss = useCallback(
    (detail: RgxModalDismissDetail) => {
      onWillDismiss?.(detail);
      onDismiss?.(detail);
    },
    [onWillDismiss, onDismiss]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss({ role: "cancel" });
    };
    if (typeof document !== "undefined") {
      document.addEventListener("keydown", handler);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("keydown", handler);
      }
    };
  }, [isOpen, dismiss]);

  const content = useMemo(() => {
    const top = inlineContentPosition === "top" ? inlineContent : undefined;
    const bottom = inlineContentPosition === "bottom" ? inlineContent : undefined;
    const renderInline = (value: string | React.ReactNode | undefined) => {
      if (!value) return null;
      if (typeof value === "string") {
        return <div dangerouslySetInnerHTML={{ __html: value }} />;
      }
      return <div>{value}</div>;
    };
    return (
      <>
        {renderInline(top)}
        {tag ? (
          <RgxComponentRenderer tag={tag} globals={{ ...globals, ...(options || {}) }} />
        ) : (
          children
        )}
        {renderInline(bottom)}
      </>
    );
  }, [inlineContent, inlineContentPosition, tag, globals, options, children]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const classes = [
    "dcf-modal",
    fullscreen ? "dcf-modal-fullscreen" : "",
    expandable ? "dcf-modal-expandable" : "",
    borders ? "dcf-modal-bordered" : "",
    lightBox ? "dcf-modal-lightbox" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className="dcf-modal-overlay" role="presentation">
      <div
        className={classes}
        role="dialog"
        aria-modal="true"
        aria-label={title || translateKey(`${locale}.title`) || "Dialog"}
        onClick={(event) => event.stopPropagation()}
      >
        {showHeader && (
          <div
            className={[
              "dcf-modal-header",
              headerTransparent ? "dcf-transparent" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ background: headerBackground }}
          >
            {title && <h2 className="dcf-modal-title">{title}</h2>}
            {showCloseButton && (
              <button
                type="button"
                className="dcf-modal-close"
                aria-label={translateKey(`${locale}.close`) || "Close"}
                onClick={() => dismiss({ role: "cancel" })}
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="dcf-modal-content">{content}</div>
        {(showConfirmButton || showCancelButton) && (
          <div className="dcf-modal-actions">
            {showCancelButton && (
              <button
                type="button"
                className="dcf-button light"
                onClick={() => dismiss({ role: "cancel" })}
              >
                {cancelText || translateKey(`${locale}.cancel`) || "Cancel"}
              </button>
            )}
            {showConfirmButton && (
              <button
                type="button"
                className="dcf-button primary"
                onClick={() => {
                  onConfirm?.();
                  dismiss({ role: "confirm" });
                }}
              >
                {confirmText || translateKey(`${locale}.confirm`) || "Confirm"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/**
 * @description Props accepted by the {@link RgxModalConfirm} convenience modal.
 * @summary Extends {@link RgxModalProps} with message, role and confirmation
 * code options so the same dialog can act as a confirmation, alert or protected
 * action prompt.
 * @memberOf module:for-react
 */
export interface RgxModalConfirmProps extends RgxModalProps {
  data?: KeyValue;
  role?: string;
  message?: string;
  alert?: boolean;
  requireConfirmCode?: boolean;
  confirmCode?: string;
  onCancel?: () => void;
}

/**
 * @description Confirmation-flavoured {@link RgxModal} that adds a message,
 * an optional role label and an optional confirmation-code input.
 * @summary Always renders the confirm button and, unless overridden, the cancel
 * button. When `requireConfirmCode` is set, confirming is suppressed until the
 * typed code matches `confirmCode` (or the `code` value on `data`). A cancel
 * dismissal invokes `onCancel`, and confirming passes `data` to `onConfirm`.
 * @param {RgxModalConfirmProps} props - Values that control the prompt content
 * and confirmation behaviour.
 * @returns {React.ReactElement} The rendered confirmation modal.
 * @memberOf module:for-react
 */
export const RgxModalConfirm: React.FC<RgxModalConfirmProps> = ({
  data,
  role,
  message,
  requireConfirmCode = false,
  confirmCode,
  onCancel,
  onConfirm,
  ...props
}) => {
  const [code, setCode] = useState("");
  const disabled =
    requireConfirmCode && code !== (confirmCode ?? String(data?.["code"] ?? ""));
  return (
    <RgxModal
      {...props}
      showConfirmButton
      showCancelButton={props.showCancelButton ?? true}
      onConfirm={() => {
        if (disabled) return;
        onConfirm?.(data);
      }}
      onDismiss={(detail) => {
        if (detail.role === "cancel") onCancel?.();
        props.onDismiss?.(detail);
      }}
    >
      {message && <p className="dcf-modal-message">{message}</p>}
      {role && <span className="dcf-modal-role">{role}</span>}
      {requireConfirmCode && (
        <input
          aria-label="Confirmation code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      )}
      {props.children}
    </RgxModal>
  );
};

/**
 * @description Handle returned by the imperative modal presenters.
 * @summary Exposes a `dismiss` function for closing the presented modal
 * programmatically and the host element that was appended to the document.
 * @memberOf module:for-react
 */
export interface PresentedModal {
  dismiss: (role?: string, data?: unknown) => void;
  element?: HTMLElement;
}

/**
 * @description Imperatively mounts a {@link RgxModal} into a fresh host element
 * appended to `document.body`.
 * @summary Returns immediately with a {@link PresentedModal} handle while the
 * React root is created asynchronously via `react-dom/client`. Dismissing the
 * modal, either through the handle or the component, invokes the supplied
 * `onDismiss` callback, the modal's own `onDismiss`, emits a window click event
 * and removes the host element.
 * @param {RgxModalProps} props - Props used to render the modal; it is forced
 * open.
 * @param {Function} [onDismiss] - Optional
 * callback invoked when the modal is dismissed.
 * @returns {PresentedModal | undefined} A handle for dismissing the modal, or
 * `undefined` when no DOM document is available.
 * @memberOf module:for-react
 */
export function presentRgxModal(
  props: RgxModalProps,
  onDismiss?: (detail: RgxModalDismissDetail) => void
): PresentedModal | undefined {
  if (typeof document === "undefined") return undefined;
  const host = document.createElement("div");
  host.className = "dcf-modal-host";
  document.body.appendChild(host);
  let disposed = false;
  let root: { render: (node: React.ReactNode) => void; unmount: () => void } | undefined;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    root?.unmount();
    host.remove();
  };

  const dismiss = (role?: string, data?: unknown) => {
    const detail = { role, data };
    onDismiss?.(detail);
    props.onDismiss?.(detail);
    windowEventEmitter(ComponentEventNames.CLICK, detail);
    cleanup();
  };

  const render = () =>
    root?.render(
      <RgxModal
        {...props}
        isOpen
        onDismiss={(detail) => {
          props.onDismiss?.(detail);
          onDismiss?.(detail);
          cleanup();
        }}
      />
    );

  import("react-dom/client").then(({ createRoot }) => {
    if (disposed) return;
    root = createRoot(host);
    render();
  });

  return { dismiss, element: host };
}

function windowEventEmitter(name: string, detail: unknown) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }
}

/**
 * @description Imperatively presents a confirmation modal by delegating to
 * {@link presentRgxModal} with the confirm button enabled.
 * @summary Convenience wrapper around {@link presentRgxModal} for
 * {@link RgxModalConfirm} props.
 * @param {RgxModalConfirmProps} props - Props for the confirmation modal.
 * @param {Function} [onDismiss] - Optional
 * callback invoked when the modal is dismissed.
 * @returns {PresentedModal | undefined} A dismissal handle, or `undefined` when
 * no DOM document is available.
 * @memberOf module:for-react
 */
export function presentModalConfirm(
  props: RgxModalConfirmProps,
  onDismiss?: (detail: RgxModalDismissDetail) => void
): PresentedModal | undefined {
  return presentRgxModal(
    { ...props, showConfirmButton: true } as RgxModalProps,
    onDismiss
  );
}

/**
 * @description Imperatively presents an alert modal by delegating to
 * {@link presentModalConfirm} with the cancel button hidden and `alert` set.
 * @summary Convenience wrapper for single-action alerts built on the
 * confirmation modal.
 * @param {RgxModalConfirmProps} props - Props for the alert modal.
 * @param {Function} [onDismiss] - Optional
 * callback invoked when the modal is dismissed.
 * @returns {PresentedModal | undefined} A dismissal handle, or `undefined` when
 * no DOM document is available.
 * @memberOf module:for-react
 */
export function presentModalAlert(
  props: RgxModalConfirmProps,
  onDismiss?: (detail: RgxModalDismissDetail) => void
): PresentedModal | undefined {
  return presentModalConfirm(
    { ...props, showCancelButton: false, alert: true },
    onDismiss
  );
}
