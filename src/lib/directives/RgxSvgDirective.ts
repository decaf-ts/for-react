import { RgxMediaService } from "../services/RgxMediaService.js";

/**
 * @description Lightweight directive replacement that injects SVG markup inside a host element.
 * @summary React does not have directives, so components can extend this abstract class to reuse the SVG loading helper.
 * @memberOf module:for-react
 */
export abstract class RgxSvgDirective {
  /**
   * @description Creates the directive with the media service used for SVG loading.
   * @summary Defaults to a fresh {@link RgxMediaService} when none is supplied.
   * @param {RgxMediaService} [mediaService] - Service used to fetch and inject SVGs.
   * @memberOf module:for-react
   */
  constructor(private readonly mediaService: RgxMediaService = new RgxMediaService()) {}

  /**
   * @description Loads the SVG from `path` and places it inside `element`.
   * @summary No-ops when either argument is missing; otherwise delegates the
   * fetch and injection to the media service.
   * @param {HTMLElement} element - Target element that receives the SVG markup.
   * @param {string} path - URL of the SVG resource to load.
   * @returns {Promise<void>} Resolves once the SVG is injected.
   * @memberOf module:for-react
   */
  protected async injectSvg(element: HTMLElement, path: string): Promise<void> {
    if (!path || !element) return;
    await this.mediaService.loadSvg(path, element);
  }
}
