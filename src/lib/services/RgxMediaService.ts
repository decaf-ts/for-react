import { ReactEngineKeys, WindowColorSchemes } from "../engine/constants";
import { IWindowResizeEvent } from "../engine/interfaces";

type Unsubscribe = () => void;

/**
 * @description Handles media related helpers for the React runtime.
 * @summary Provides resize listeners, color scheme detection and SVG loading helpers that mimic the Angular service behaviour.
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

  dispose(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.resizeHandler);
    }
    this.mediaQuery?.removeEventListener("change", this.handleColorScheme);
    this.resizeListeners.clear();
    this.colorSchemeListeners.clear();
  }

  onResize(listener: (event: IWindowResizeEvent) => void): Unsubscribe {
    this.resizeListeners.add(listener);
    listener(this.snapshotSize());
    return () => this.resizeListeners.delete(listener);
  }

  onColorSchemeChange(listener: (scheme: string) => void): Unsubscribe {
    this.colorSchemeListeners.add(listener);
    listener(this.currentScheme());
    return () => this.colorSchemeListeners.delete(listener);
  }

  isDarkMode(): boolean {
    return this.currentScheme() === WindowColorSchemes.dark;
  }

  toggleDarkPalette(element: HTMLElement, shouldEnable: boolean): void {
    element.classList.toggle(ReactEngineKeys.DARK_PALETTE_CLASS, shouldEnable);
  }

  async loadSvg(path: string, target: HTMLElement): Promise<void> {
    if (!path || !target) return;
    const response = await fetch(path);
    const svg = await response.text();
    target.innerHTML = svg;
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
