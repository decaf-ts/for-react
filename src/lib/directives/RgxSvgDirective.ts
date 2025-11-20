import { RgxMediaService } from "../services/RgxMediaService";

/**
 * @description Lightweight directive replacement that injects SVG markup inside a host element.
 * @summary React does not have directives, so components can extend this abstract class to reuse the SVG loading helper.
 */
export abstract class RgxSvgDirective {
  constructor(private readonly mediaService: RgxMediaService = new RgxMediaService()) {}

  /**
   * @description Loads the SVG from `path` and places it inside `element`.
   */
  protected async injectSvg(element: HTMLElement, path: string): Promise<void> {
    if (!path || !element) return;
    await this.mediaService.loadSvg(path, element);
  }
}
