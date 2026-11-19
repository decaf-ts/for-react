import { ReactEngineKeys, WindowColorSchemes } from "../engine/constants.js";
import { IWindowResizeEvent } from "../engine/interfaces.js";

type Unsubscribe = () => void;

/**
 * @description Handles media related helpers for the React runtime.
 * @summary Provides resize listeners, color scheme detection and SVG loading helpers that mimic the Angular service behaviour.
 * @memberOf module:for-react
 */
export class RgxMediaService {
  private resizeListeners = new Set<(event: IWindowResizeEvent) => void>();
  private colorSchemeListeners = new Set<(scheme: string) => void>();
  private resizeHandler = () => {
    const payload = this.snapshotSize();
    this.resizeListeners.forEach((listener) => listener(payload));
  };

  private mediaQuery = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : undefined;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.resizeHandler);
      this.mediaQuery?.addEventListener("change", this.handleColorScheme);
    }
  }

  /**
   * @description Releases all media listeners held by the service.
   * @summary Removes window resize and colour-scheme listeners and clears any
   * registered callbacks. Call this when the owning component unmounts.
   * @returns {void}
   * @memberOf module:for-react
   */
  dispose(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.resizeHandler);
    }
    this.mediaQuery?.removeEventListener("change", this.handleColorScheme);
    this.resizeListeners.clear();
    this.colorSchemeListeners.clear();
  }

  /**
   * @description Registers a callback for window resize events.
   * @summary Invokes the listener immediately with the current size, then on every
   * subsequent resize, and returns an unsubscribe function.
   * @param {Function} listener - Callback receiving the current window size.
   * @returns {Function} A function that removes the listener.
   * @memberOf module:for-react
   */
  onResize(listener: (event: IWindowResizeEvent) => void): Unsubscribe {
    this.resizeListeners.add(listener);
    listener(this.snapshotSize());
    return () => this.resizeListeners.delete(listener);
  }

  /**
   * @description Registers a callback for colour-scheme changes.
   * @summary Invokes the listener immediately with the current scheme, then whenever
   * the preference or dark palette class changes, and returns an unsubscribe function.
   * @param {Function} listener - Callback receiving the active colour scheme.
   * @returns {Function} A function that removes the listener.
   * @memberOf module:for-react
   */
  onColorSchemeChange(listener: (scheme: string) => void): Unsubscribe {
    this.colorSchemeListeners.add(listener);
    listener(this.currentScheme());
    return () => this.colorSchemeListeners.delete(listener);
  }

  /**
   * @description Reports whether dark mode is currently active.
   * @summary Resolves the active scheme from the dark palette class or the
   * `prefers-color-scheme` media query.
   * @returns {boolean} True when the resolved scheme is dark.
   * @memberOf module:for-react
   */
  isDarkMode(): boolean {
    return this.currentScheme() === WindowColorSchemes.dark;
  }

  /**
   * @description Toggles the dark palette class on an element.
   * @summary Adds or removes the engine dark-palette class on the supplied element.
   * @param {HTMLElement} element - The element whose palette class should change.
   * @param {boolean} shouldEnable - True to enable the dark palette, false to disable it.
   * @returns {void}
   * @memberOf module:for-react
   */
  toggleDarkPalette(element: HTMLElement, shouldEnable: boolean): void {
    element.classList.toggle(ReactEngineKeys.DARK_PALETTE_CLASS, shouldEnable);
  }

  /**
   * @description Loads an SVG file into a target element.
   * @summary Fetches the SVG at the given path, sanitizes it with an allow-list
   * content policy and injects the resulting markup as the element's inner HTML.
   * Only same-origin (or relative) paths are fetched; cross-origin paths are
   * rejected before any network request is made. No-op when either argument is
   * missing. The allow-list removes `<script>`, `foreignObject`, animation/HTML
   * breakout elements, every `on*` event handler and any non-`#` `href`
   * reference, so hostile SVG (whether a cross-origin payload or a compromised
   * same-origin asset) can never execute in the app origin.
   * @param {string} path - The same-origin URL of the SVG to load.
   * @param {HTMLElement} target - The element that should receive the SVG markup.
   * @returns {Promise<void>} Resolves when the SVG has been injected.
   * @memberOf module:for-react
   */
  async loadSvg(path: string, target: HTMLElement): Promise<void> {
    if (!path || !target) return;
    if (!this.isSameOrigin(path)) return;
    const response = await fetch(path);
    const svg = await response.text();
    target.innerHTML = this.sanitizeSvg(svg);
  }

  private isSameOrigin(path: string): boolean {
    if (typeof window === "undefined" || !window.location) return true;
    try {
      const resolved = new URL(path, window.location.href);
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
        return false;
      }
      return resolved.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes SVG string content with an ALLOWLIST policy.
   * Denylists age badly: anything not remembered gets through, and elements like
   * `<iframe>`, `<embed>`, `<object>`, `<meta>` or `<style>` survive XML
   * serialization only to break out of the SVG namespace when the string is
   * later re-parsed by the HTML parser via innerHTML (namespace breakout). An
   * allowlist removes by default: only elements and attributes that legitimate
   * SVG sprites use are kept; everything else is dropped, except inert `data-*`
   * and `aria-*` attributes which carry no execution semantics.
   * Always dropped: `on*` handlers; `href`/`xlink:href` with `javascript:`,
   * `data:` or `vbscript:` schemes (including obfuscated variants with
   * whitespace, ASCII control chars or percent encoding); any `href`/`xlink:href`
   * that is not an in-document reference (starting with `#`).
   * Returns an empty string if parsing fails or the root is not `<svg>`. When
   * nothing had to be removed the original text is returned unchanged so benign
   * sprites keep their exact formatting.
   *
   * @param {string} svgText - The SVG text content to sanitize.
   * @returns {string} The sanitized SVG string.
   */
  private sanitizeSvg(svgText: string): string {
    if (!svgText || typeof svgText !== "string") return "";
    if (typeof DOMParser === "undefined") return "";
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      if (doc.querySelector("parsererror")) return "";
      const root = doc.documentElement;
      if (!root || root.tagName.toLowerCase() !== "svg") return "";

      const ALLOWED_TAGS = new Set([
        "svg",
        "g",
        "defs",
        "symbol",
        "use",
        "path",
        "circle",
        "ellipse",
        "rect",
        "line",
        "polyline",
        "polygon",
        "text",
        "tspan",
        "title",
        "desc",
        "lineargradient",
        "radialgradient",
        "stop",
        "clippath",
        "mask",
        "pattern",
        "marker",
        "a",
      ]);
      const ALLOWED_ATTRS = new Set([
        "id",
        "class",
        "width",
        "height",
        "x",
        "y",
        "x1",
        "x2",
        "y1",
        "y2",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "d",
        "points",
        "transform",
        "fill",
        "fill-opacity",
        "fill-rule",
        "stroke",
        "stroke-width",
        "stroke-opacity",
        "stroke-linecap",
        "stroke-linejoin",
        "stroke-dasharray",
        "stroke-dashoffset",
        "opacity",
        "offset",
        "stop-color",
        "stop-opacity",
        "viewbox",
        "preserveaspectratio",
        "version",
        "xmlns",
        "xmlns:xlink",
        "clip-path",
        "clip-rule",
        "clippathunits",
        "maskunits",
        "maskcontentunits",
        "patternunits",
        "patterncontentunits",
        "patterntransform",
        "markerwidth",
        "markerheight",
        "refx",
        "refy",
        "orient",
        "markerunits",
        "gradientunits",
        "gradienttransform",
        "spreadmethod",
        "fx",
        "fy",
        "text-anchor",
        "dominant-baseline",
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "xml:space",
        "xml:lang",
        "aria-hidden",
        "focusable",
        "href",
        "xlink:href",
      ]);

      let removed = false;
      const elements = [root, ...Array.from(root.querySelectorAll("*"))];
      for (const el of elements) {
        const localTag = (el.localName || el.tagName || "").toLowerCase();
        if (!ALLOWED_TAGS.has(localTag)) {
          el.remove();
          removed = true;
          continue;
        }

        const attrNames = Array.from(el.attributes).map((attr) => attr.name);
        for (const name of attrNames) {
          const lowerName = name.toLowerCase();
          const val = el.getAttribute(name) || "";

          if (
            !ALLOWED_ATTRS.has(lowerName) &&
            !lowerName.startsWith("data-") &&
            !lowerName.startsWith("aria-")
          ) {
            el.removeAttribute(name);
            removed = true;
            continue;
          }

          if (lowerName === "href" || lowerName.endsWith(":href")) {
            // eslint-disable-next-line no-control-regex
            let cleanVal = val.replace(/[\u0000- ]/g, "");
            try {
              cleanVal = decodeURIComponent(cleanVal);
            } catch {
              // ignore malformed URI percent-encoding
            }
            // eslint-disable-next-line no-control-regex
            cleanVal = cleanVal.replace(/[\u0000- ]/g, "").toLowerCase();

            if (
              cleanVal.startsWith("javascript:") ||
              cleanVal.startsWith("data:") ||
              cleanVal.startsWith("vbscript:")
            ) {
              el.removeAttribute(name);
              removed = true;
            } else if (!cleanVal.startsWith("#")) {
              // only in-document references are allowed: external hrefs enable
              // phishing links and tracking
              el.removeAttribute(name);
              removed = true;
            }
          }
        }
      }

      if (!removed) return svgText;
      if (typeof XMLSerializer === "undefined") return "";
      return new XMLSerializer().serializeToString(root);
    } catch {
      return "";
    }
  }

  private handleColorScheme = () => {
    const scheme = this.currentScheme();
    this.colorSchemeListeners.forEach((listener) => listener(scheme));
  };

  private currentScheme(): string {
    if (typeof document === "undefined") return WindowColorSchemes.light;
    if (document.documentElement.classList.contains(ReactEngineKeys.DARK_PALETTE_CLASS)) {
      return WindowColorSchemes.dark;
    }
    return this.mediaQuery?.matches ? WindowColorSchemes.dark : WindowColorSchemes.light;
  }

  private snapshotSize(): IWindowResizeEvent {
    if (typeof window === "undefined") {
      return { width: 0, height: 0 };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }
}
