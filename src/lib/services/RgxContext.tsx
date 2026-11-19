import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { KeyValue } from "../engine/types.js";
import { I18nLoader } from "../i18n/Loader.js";
import type { I18nResourceConfig } from "../engine/interfaces.js";
import {
  defaultTranslateService,
  RgxTranslateService,
  TranslateParams,
} from "./RgxTranslateService.js";
import { defaultRouterService, RgxRouterService } from "./RgxRouterService.js";

/**
 * @description Services distributed by the React services context.
 * @summary Bundles the translation and routing services consumed by the
 * rendering engine and UI components.
 * @memberOf module:for-react
 */
export interface RgxServices {
  translate: RgxTranslateService;
  router: RgxRouterService;
}

const defaultServices: RgxServices = {
  translate: defaultTranslateService,
  router: defaultRouterService,
};

const RgxServicesContext = createContext<RgxServices>(defaultServices);

/**
 * @description Props accepted by {@link RgxServicesProvider}.
 * @summary Allows callers to override the default translation and router
 * services, or to inherit the built-in singletons.
 * @memberOf module:for-react
 */
export interface RgxServicesProviderProps {
  translateService?: RgxTranslateService;
  routerService?: RgxRouterService;
  children?: React.ReactNode;
}

/**
 * @description Provides the shared React services to the component tree.
 * @summary Places {@link RgxTranslateService} and {@link RgxRouterService}
 * instances on the services context, falling back to the default singletons
 * when overrides are not supplied.
 * @param {RgxServicesProviderProps} props - The provider props containing optional service overrides and children.
 * @returns {React.ReactElement} The context provider wrapping the given children.
 * @memberOf module:for-react
 */
export const RgxServicesProvider: React.FC<RgxServicesProviderProps> = ({
  translateService,
  routerService,
  children,
}) => {
  const value = useMemo<RgxServices>(
    () => ({
      translate: translateService || defaultTranslateService,
      router: routerService || defaultRouterService,
    }),
    [translateService, routerService]
  );
  return (
    <RgxServicesContext.Provider value={value}>
      {children}
    </RgxServicesContext.Provider>
  );
};

/**
 * @description Returns the shared services from the current context.
 * @summary Reads the nearest {@link RgxServicesProvider} value, or the default
 * services when no provider is present.
 * @returns {RgxServices} The translation and router services in scope.
 * @memberOf module:for-react
 */
export function useRgxServices(): RgxServices {
  return useContext(RgxServicesContext);
}

/**
 * @description Returns the translate service from the current context.
 * @summary Convenience hook that selects the translation service from
 * {@link useRgxServices}.
 * @returns {RgxTranslateService} The active translation service.
 * @memberOf module:for-react
 */
export function useRgxTranslateService(): RgxTranslateService {
  return useRgxServices().translate;
}

/**
 * @description Returns the router service from the current context.
 * @summary Convenience hook that selects the routing service from
 * {@link useRgxServices}.
 * @returns {RgxRouterService} The active router service.
 * @memberOf module:for-react
 */
export function useRgxRouterService(): RgxRouterService {
  return useRgxServices().router;
}

/**
 * @description Signature of the translation function returned by {@link useTranslate}.
 * @summary Resolves a translation key to a localized string, interpolating any
 * supplied parameters.
 * @memberOf module:for-react
 */
export type TranslateFn = (key: string, params?: TranslateParams) => string;

/**
 * @description Returns a reactive translation function.
 * @summary Subscribes the calling component to translation changes and returns a
 * memoized function that resolves keys against the current language.
 * @returns {TranslateFn} A function that translates a key with optional parameters.
 * @memberOf module:for-react
 */
export function useTranslate(): TranslateFn {
  const service = useRgxTranslateService();
  useSyncExternalStore(
    (listener) => service.subscribe(listener),
    () => service.getSnapshot(),
    () => service.getSnapshot()
  );
  return useMemo<TranslateFn>(
    () => (key: string, params?: TranslateParams) => service.instant(key, params),
    [service, service.getCurrentLang()]
  );
}

/**
 * @description Returns the currently active translation language.
 * @summary Subscribes the calling component to translation changes and yields the
 * active language code.
 * @returns {string} The current language code.
 * @memberOf module:for-react
 */
export function useCurrentLang(): string {
  const service = useRgxTranslateService();
  useSyncExternalStore(
    (listener) => service.subscribe(listener),
    () => service.getSnapshot(),
    () => service.getSnapshot()
  );
  return service.getCurrentLang();
}

/**
 * @description Props accepted by {@link RgxI18nProvider}.
 * @summary Configures language, fallback language, translation resources and the
 * optional loader or translate service used during initialisation.
 * @memberOf module:for-react
 */
export interface RgxI18nProviderProps {
  lang?: string;
  fallbackLang?: string;
  enabled?: boolean;
  resources?: I18nResourceConfig[];
  versionedSuffix?: boolean;
  loader?: I18nLoader;
  service?: RgxTranslateService;
  children?: React.ReactNode;
}

/**
 * @description Initialises translations and exposes them to the component tree.
 * @summary Loads the requested language through the configured loader, seeds the
 * translate service cache and provides both the services and the loaded flag to
 * descendants.
 * @param {RgxI18nProviderProps} props - The provider props controlling language, resources and loading.
 * @returns {React.ReactElement} The services and i18n-loaded context providers wrapping the children.
 * @memberOf module:for-react
 */
export const RgxI18nProvider: React.FC<RgxI18nProviderProps> = ({
  lang = "en",
  fallbackLang = "en",
  enabled = true,
  resources = [],
  versionedSuffix = false,
  loader,
  service,
  children,
}) => {
  const [loaded, setLoaded] = useState(false);
  const translateService = service || defaultTranslateService;

  useEffect(() => {
    I18nLoader.enabled = enabled;
    translateService.setFallbackLang(fallbackLang);
    const activeLoader =
      loader || new I18nLoader(resources, versionedSuffix);
    let cancelled = false;
    activeLoader
      .getTranslation(lang)
      .then((translations: KeyValue) => {
        if (cancelled) return;
        translateService.setCache(lang, translations);
        translateService.use(lang);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lang, enabled, resources, versionedSuffix, loader, translateService]);

  const value = useMemo<RgxServices>(
    () => ({ translate: translateService, router: defaultRouterService }),
    [translateService]
  );

  return (
    <RgxServicesContext.Provider value={value}>
      <RgxI18nLoadedContext.Provider value={loaded}>
        {children}
      </RgxI18nLoadedContext.Provider>
    </RgxServicesContext.Provider>
  );
};

const RgxI18nLoadedContext = createContext(false);

/**
 * @description Reports whether translations have finished loading.
 * @summary Reads the loaded flag published by {@link RgxI18nProvider}.
 * @returns {boolean} True once the active language has finished loading.
 * @memberOf module:for-react
 */
export function useI18nLoaded(): boolean {
  return useContext(RgxI18nLoadedContext);
}
