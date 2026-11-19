/**
 * @description Minimal translation contract a host can provide for graph editor strings.
 * @summary Minimal translation contract a host can provide for graph editor strings.
 * @memberOf module:for-react.diagrams
 */
export interface GraphTranslateContract {
  instant(key: string): string;
}

/**
 * @description Locale access for the graph editor surfaces: resolves graph editor i18n keys through the host translator, falling back to the supplied default when the translator is absent or the key is not loaded.
 * @summary Locale access for the graph editor surfaces: resolves graph editor i18n keys through the host translator, falling back to the supplied default when the translator is absent or the key is not loaded.
 * @memberOf module:for-react.diagrams
 */
export class GraphTranslateService {
  constructor(private readonly translate: GraphTranslateContract | undefined = undefined) {}

  /** Resolves one graph-editor locale key, or the fallback. */
  key(key: string, fallback: string): string {
    if (!this.translate) return fallback;
    const translated = this.translate.instant(key);
    return translated === key ? fallback : translated;
  }
}
