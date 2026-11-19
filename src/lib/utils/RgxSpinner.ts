/**
 * @description Configuration for the {@link RgxSpinner} overlay.
 * @summary Controls the overlay's class, label, spinner glyph, backdrop
 * behaviour and optional auto-dismiss duration.
 * @memberOf module:for-react
 */
export interface RgxSpinnerOptions {
  cssClass?: string;
  message?: string;
  spinner?: string;
  backdropDismiss?: boolean;
  showBackdrop?: boolean;
  animated?: boolean;
  duration?: number;
}

const defaultOptions: RgxSpinnerOptions = {
  cssClass: "dcf-loading",
  duration: undefined,
  message: "Loading...",
  spinner: "crescent",
  backdropDismiss: false,
  showBackdrop: true,
  animated: true,
};

function getDocument(): Document | undefined {
  return (globalThis as Record<string, unknown>)["document"] as
    | Document
    | undefined;
}

/**
 * @description Imperative loading overlay with optional progress updates.
 * @summary Appends a `role="status"` element to `document.body` on {@link show},
 * updates its label or percentage on {@link update}, and removes it on
 * {@link remove}. In non-DOM environments the element is simulated so calls
 * remain safe without a document.
 * @memberOf module:for-react
 */
export class RgxSpinner {
  private element?: HTMLElement;
  private message = "";
  private progress = 0;
  private options: RgxSpinnerOptions = { ...defaultOptions };

  /**
   * @description Reports whether a spinner overlay is currently mounted.
   * @returns {boolean} `true` when an element is present.
   * @memberOf module:for-react
   */
  isVisible(): boolean {
    return !!this.element;
  }

  /**
   * @description Shows the overlay, or updates it if already visible.
   * @summary Accepts either a message string plus options or a single options
   * object. Creates and mounts the overlay markup when absent; otherwise
   * forwards to {@link update}. Without a DOM body it records a stub element so
   * visibility stays consistent.
   * @param {string | RgxSpinnerOptions} message - Message text or a full options object.
   * @param {RgxSpinnerOptions} [options] - Options used when `message` is a string.
   * @returns {Promise<void>} Resolves once the overlay is shown or updated.
   * @memberOf module:for-react
   */
  async show(
    message: string | RgxSpinnerOptions,
    options?: RgxSpinnerOptions
  ): Promise<void> {
    if (typeof message === "object") {
      options = message;
      message = (options.message as string) || defaultOptions.message!;
    }
    if (this.isVisible()) return this.update(message);
    this.message = message;
    const doc = getDocument();
    if (!doc?.body) {
      this.element = {} as HTMLElement;
      return;
    }
    const element = doc.createElement("div");
    element.className = [
      this.options.cssClass,
      options?.cssClass,
      "dcf-spinner-overlay",
    ]
      .filter(Boolean)
      .join(" ");
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    const spinner = doc.createElement("div");
    spinner.className = "dcf-spinner";
    spinner.textContent = String((options?.spinner || this.options.spinner) as string);
    const label = doc.createElement("div");
    label.className = "dcf-spinner-message";
    label.textContent = message;
    element.appendChild(spinner);
    element.appendChild(label);
    doc.body.appendChild(element);
    this.element = element;
  }

  /**
   * @description Updates the overlay message or progress.
   * @summary When `isProgressUpdate` is a number it advances the progress
   * percentage (clamped to 99 until removal) and renders `message (n%)`;
   * otherwise the label is replaced with the new message. If no overlay is
   * mounted, {@link show} is called instead.
   * @param {string} message - New message or progress label.
   * @param {boolean | number} [isProgressUpdate=false] - `true`/number to render progress, `false` for a plain message.
   * @returns {Promise<void>} Resolves once the overlay is updated.
   * @memberOf module:for-react
   */
  async update(
    message: string,
    isProgressUpdate: boolean | number = false
  ): Promise<void> {
    if (!this.element) return this.show(message, { duration: 5000 });
    const label = this.element.querySelector?.(".dcf-spinner-message");
    if (isProgressUpdate) {
      if (typeof isProgressUpdate === "number" && Number(isProgressUpdate)) {
        if (isProgressUpdate <= this.progress) isProgressUpdate = this.progress + 10;
        this.progress = isProgressUpdate;
        if (this.progress > 100) this.progress = 99;
        if (label) label.textContent = `${message} (${this.progress}%)`;
      } else if (label) {
        label.textContent = `${this.message} (${message}%)`;
      }
    } else {
      this.message = message;
      if (label) label.textContent = message;
    }
  }

  /**
   * @description Removes the overlay from the DOM and resets progress.
   * @summary Detaches the mounted element (when present) and clears the current
   * progress so the next {@link show} starts fresh.
   * @returns {Promise<void>} Resolves once the overlay is removed.
   * @memberOf module:for-react
   */
  async remove(): Promise<void> {
    const element = this.element;
    this.element = undefined;
    this.progress = 0;
    if (element?.remove) element.remove();
  }

  /**
   * @description Merges caller options over the current spinner options.
   * @summary Returns a new options object combining the instance defaults, the
   * supplied overrides and an optional message, without mutating the instance.
   * @param {RgxSpinnerOptions} [options={}] - Overrides to apply.
   * @param {string} [message] - Optional message to set on the result.
   * @returns {Promise<RgxSpinnerOptions>} The effective options.
   * @memberOf module:for-react
   */
  async getOptions(
    options: RgxSpinnerOptions = {},
    message?: string
  ): Promise<RgxSpinnerOptions> {
    return Object.assign({}, this.options, options, {
      message: message || this.options.message,
    });
  }

  /**
   * @description Returns the message currently held by the spinner.
   * @returns {Promise<string>} The current message text.
   * @memberOf module:for-react
   */
  async getMessage(): Promise<string> {
    return this.message;
  }
}

let instance: RgxSpinner | undefined;

/**
 * @description Returns the shared {@link RgxSpinner} singleton.
 * @summary Lazily creates the singleton on first use and applies the supplied
 * options to it. Later calls return the same instance, so spinner state is
 * shared application-wide.
 * @param {Partial<RgxSpinnerOptions>} [options={}] - Options applied when the singleton is first created.
 * @returns {RgxSpinner} The shared spinner instance.
 * @memberOf module:for-react
 */
export function getRgxSpinner(
  options: Partial<RgxSpinnerOptions> = {}
): RgxSpinner {
  if (!instance) {
    instance = new RgxSpinner();
    instance.getOptions(options);
  }
  return instance;
}

/**
 * @description Backwards-compatible alias of {@link getRgxSpinner}.
 * @summary Retains the Angular-era `getNgxSpinner` name so migrated code keeps
 * resolving the same singleton.
 * @memberOf module:for-react
 */
export const getNgxSpinner = getRgxSpinner;
