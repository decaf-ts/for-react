/**
 * @description Outcome reported when a toast settles.
 * @summary Resolves to `"dismiss"` on timeout or click by default, and allows
 * any custom string so richer toast flows can report their own result.
 * @memberOf module:for-react
 */
export type RgxToastRole = "cancel" | "confirm" | "dismiss" | string;

/**
 * @description Configuration for a {@link RgxToast} message.
 * @summary Controls auto-dismiss timing, screen position, animation, colour,
 * text and extra CSS classes.
 * @memberOf module:for-react
 */
export interface RgxToastOptions {
  duration?: number;
  position?: "top" | "bottom" | "middle";
  animated?: boolean;
  color?: string;
  message?: string;
  cssClass?: string;
}

const DefaultOptions: RgxToastOptions = {
  duration: 3000,
  position: "top",
  animated: true,
};

function getDocument(): Document | undefined {
  return (globalThis as Record<string, unknown>)["document"] as
    | Document
    | undefined;
}

function createToast(
  message: string,
  options: RgxToastOptions
): Promise<RgxToastRole> {
  const doc = getDocument();
  if (!doc?.body) {
    return Promise.resolve("dismiss");
  }
  return new Promise<RgxToastRole>((resolve) => {
    const element = doc.createElement("div");
    element.className = [
      "dcf-toast",
      `dcf-toast-${options.position || "top"}`,
      options.color ? `dcf-toast-${options.color}` : "",
      options.cssClass || "",
    ]
      .filter(Boolean)
      .join(" ");
    element.setAttribute("role", "status");
    element.textContent = message;
    doc.body.appendChild(element);
    let settled = false;
    const dismiss = (role: RgxToastRole) => {
      if (settled) return;
      settled = true;
      element.remove();
      resolve(role);
    };
    element.addEventListener("click", () => dismiss("dismiss"));
    const duration = options.duration ?? DefaultOptions.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => dismiss("dismiss"), duration);
    }
  });
}

/**
 * @description Imperative toast helper for transient notifications.
 * @summary Appends a `role="status"` element to `document.body` and resolves
 * when it is dismissed by click or timeout. Colour-specific helpers
 * ({@link error}, {@link success}, {@link warn}, {@link inform}) wrap
 * {@link show} with preset styling. Without a DOM body it resolves `"dismiss"`
 * immediately.
 * @memberOf module:for-react
 */
export class RgxToast {
  /**
   * @description Effective options applied to every toast from this instance.
   * @memberOf module:for-react
   */
  options: RgxToastOptions;

  /**
   * @description Creates a toast helper with merged default options.
   * @summary Combines the library defaults with the supplied overrides into the
   * instance-level {@link options}.
   * @param {Partial<RgxToastOptions>} [options={}] - Overrides for the default toast options.
   * @memberOf module:for-react
   */
  constructor(options: Partial<RgxToastOptions> = {}) {
    this.options = { ...DefaultOptions, ...options };
  }

  /**
   * @description Shows an error-styled toast.
   * @summary Renders the message with the `danger` colour and the instance's
   * default duration.
   * @param {string} message - Text to display.
   * @returns {Promise<RgxToastRole>} The dismissal role once the toast settles.
   * @memberOf module:for-react
   */
  async error(message: string): Promise<RgxToastRole> {
    return createToast(message, { ...this.options, color: "danger" });
  }

  /**
   * @description Shows a toast with the given message and options.
   * @summary Merges instance options with a 5-second default duration and any
   * per-call overrides, then renders the toast and waits for dismissal.
   * @param {string} message - Text to display.
   * @param {Partial<RgxToastOptions>} [options={}] - Per-toast overrides.
   * @returns {Promise<RgxToastRole>} The dismissal role once the toast settles.
   * @memberOf module:for-react
   */
  async show(
    message: string,
    options: Partial<RgxToastOptions> = {}
  ): Promise<RgxToastRole> {
    return createToast(message, {
      ...this.options,
      duration: 5000,
      ...options,
    });
  }

  /**
   * @description Shows an informational toast.
   * @summary Delegates to {@link show} with the `dark` colour applied.
   * @param {string} message - Text to display.
   * @param {Partial<RgxToastOptions>} [options={}] - Per-toast overrides.
   * @returns {Promise<RgxToastRole>} The dismissal role once the toast settles.
   * @memberOf module:for-react
   */
  async inform(
    message: string,
    options: Partial<RgxToastOptions> = {}
  ): Promise<RgxToastRole> {
    return this.show(message, { ...options, color: "dark" });
  }

  /**
   * @description Shows a success-styled toast.
   * @summary Delegates to {@link show} with the `success` colour applied.
   * @param {string} message - Text to display.
   * @returns {Promise<RgxToastRole>} The dismissal role once the toast settles.
   * @memberOf module:for-react
   */
  async success(message: string): Promise<RgxToastRole> {
    return this.show(message, { color: "success" });
  }

  /**
   * @description Shows a warning-styled toast.
   * @summary Renders the message with the `warning` colour using the instance's
   * default options.
   * @param {string} message - Text to display.
   * @returns {Promise<RgxToastRole>} The dismissal role once the toast settles.
   * @memberOf module:for-react
   */
  async warn(message: string): Promise<RgxToastRole> {
    return createToast(message, { ...this.options, color: "warning" });
  }
}

let instance: RgxToast | undefined;

/**
 * @description Returns the shared {@link RgxToast} singleton.
 * @summary Lazily creates the singleton with the supplied options on first use;
 * subsequent calls return the same instance so toast configuration is shared
 * application-wide.
 * @param {Partial<RgxToastOptions>} [options={}] - Options applied when the singleton is first created.
 * @returns {RgxToast} The shared toast instance.
 * @memberOf module:for-react
 */
export function getRgxToast(
  options: Partial<RgxToastOptions> = {}
): RgxToast {
  if (!instance) {
    instance = new RgxToast(options);
  }
  return instance;
}

/**
 * @description Backwards-compatible alias of {@link getRgxToast}.
 * @summary Retains the Angular-era `getNgxToast` name so migrated code keeps
 * resolving the same singleton.
 * @memberOf module:for-react
 */
export const getNgxToast = getRgxToast;
