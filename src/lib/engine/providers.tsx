import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Adapter } from "@decaf-ts/core";
import { Constructor } from "@decaf-ts/decoration";
import { getWindowDocument, setOnWindow } from "../utils/helpers.js";
import { DB_ADAPTER_PROVIDER } from "../for-react-common.js";
import { ReactEngineKeys } from "./constants.js";
import { KeyValue } from "./types.js";

/**
 * @description Registers dynamically provided components with the React engine.
 * @summary Marks the engine as loaded on the window and returns the components
 * unchanged for consumption by the renderer.
 * @param {...T} components - Components to expose to the engine.
 * @returns {T[]} The same components that were provided.
 * @memberOf module:for-react
 */
export function provideDecafDynamicComponents<T>(
  ...components: T[]
): T[] {
  setOnWindow(ReactEngineKeys.LOADED, true);
  return components;
}

/**
 * @description Registers and instantiates a database adapter for the React engine.
 * @summary Constructs the adapter, tolerating an already-registered adapter by
 * reusing the current one, then records its flavour on the window.
 * @param {Constructor<DbAdapter>} clazz - Adapter constructor to instantiate.
 * @param {KeyValue} [options] - Constructor options passed to the adapter.
 * @param {string} [flavour] - Optional flavour override; defaults to the adapter's own flavour.
 * @returns {DbAdapter} The active adapter instance.
 * @memberOf module:for-react
 */
export function provideDecafDbAdapter<DbAdapter extends { flavour: string }>(
  clazz: Constructor<DbAdapter>,
  options: KeyValue = {},
  flavour?: string
): DbAdapter {
  let adapter: DbAdapter;
  try {
    adapter = new clazz(options);
  } catch (e: unknown) {
    if (e instanceof Error && /already registered/.test(e.message) && Adapter.current) {
      adapter = Adapter.current as unknown as DbAdapter;
    } else {
      throw e;
    }
  }
  const resolvedFlavour = flavour || adapter.flavour;
  setOnWindow(DB_ADAPTER_PROVIDER, resolvedFlavour);
  return adapter;
}

/**
 * @description Enables the dark-mode styling hook on the host document.
 * @summary Adds the `has-dark-mode` class to the document element when a
 * document is available.
 * @returns {void}
 * @memberOf module:for-react
 */
export function provideDecafDarkMode(): void {
  const doc = getWindowDocument();
  doc?.documentElement?.classList?.add("has-dark-mode");
}

const RgxDbAdapterContext = createContext<{ flavour?: string }>({});

/**
 * @description Props for {@link RgxDbAdapterProvider}.
 * @summary Carries the adapter flavour to publish and the wrapped children.
 * @memberOf module:for-react
 */
export interface RgxDbAdapterProviderProps {
  flavour?: string;
  children?: React.ReactNode;
}

/**
 * @description React context provider that publishes the active database adapter flavour.
 * @summary Stores the supplied flavour on the window and exposes it through
 * {@link useDbAdapterFlavour} to descendant components.
 * @param {RgxDbAdapterProviderProps} props - Provider props.
 * @returns {React.ReactElement} The provider wrapping its children.
 * @memberOf module:for-react
 */
export const RgxDbAdapterProvider: React.FC<RgxDbAdapterProviderProps> = ({
  flavour,
  children,
}) => {
  useEffect(() => {
    if (flavour) setOnWindow(DB_ADAPTER_PROVIDER, flavour);
  }, [flavour]);
  const value = useMemo(() => ({ flavour }), [flavour]);
  return (
    <RgxDbAdapterContext.Provider value={value}>
      {children}
    </RgxDbAdapterContext.Provider>
  );
};

/**
 * @description Reads the database adapter flavour from the surrounding provider.
 * @summary Returns the flavour supplied to the nearest {@link RgxDbAdapterProvider}.
 * @returns {string | undefined} The active adapter flavour, if any.
 * @memberOf module:for-react
 */
export function useDbAdapterFlavour(): string | undefined {
  return useContext(RgxDbAdapterContext).flavour;
}
