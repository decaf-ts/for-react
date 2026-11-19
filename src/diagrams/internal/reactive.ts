/**
 * @module for-react/diagrams/internal/reactive
 * @summary Minimal signal runtime for the React diagrams port.
 * @description The original graph editor was built on a signal runtime. To keep
 * the framework-agnostic ports 1:1 in the React port, this module provides the same callable signal
 * contract (`signal`/`computed`/`effect`) with dependency tracking, plus React
 * bindings (`useSignalValue`) implemented through `useSyncExternalStore`.
 */
import { useEffect, useSyncExternalStore } from "react";

type Subscriber = () => void;

let activeObserver: Subscriber | null = null;
let activeCollector: Array<() => void> | null = null;
let batchDepth = 0;
const pendingNotifications = new Set<Subscriber>();

function notify(subscriber: Subscriber): void {
  if (batchDepth > 0) {
    pendingNotifications.add(subscriber);
    return;
  }
  subscriber();
}

function flushBatch(): void {
  if (batchDepth > 0) return;
  const targets = [...pendingNotifications];
  pendingNotifications.clear();
  for (const target of targets) target();
}

function registerDependency(unsubscribe: () => void): void {
  activeCollector?.push(unsubscribe);
}

function withObserver<T>(observer: Subscriber | null, fn: () => T): T {
  const previous = activeObserver;
  activeObserver = observer;
  try {
    return fn();
  } finally {
    activeObserver = previous;
  }
}

/** Groups multiple writes into a single notification pass. */
export function batch<T>(fn: () => T): T {
  batchDepth += 1;
  try {
    return fn();
  } finally {
    batchDepth -= 1;
    flushBatch();
  }
}

/** Reads signals inside `fn` without subscribing the active observer. */
export function untracked<T>(fn: () => T): T {
  const previous = activeObserver;
  const previousCollector = activeCollector;
  activeObserver = null;
  activeCollector = null;
  try {
    return fn();
  } finally {
    activeObserver = previous;
    activeCollector = previousCollector;
  }
}

/** Read-only reactive signal, callable for its current value. */
export interface Signal<T> {
  (): T;
  readonly value: T;
  subscribe(subscriber: Subscriber): () => void;
}

/** Mutable reactive signal (writable signal shape). */
export interface WritableSignal<T> extends Signal<T> {
  set(value: T): void;
  update(updater: (current: T) => T): void;
  asReadonly(): Signal<T>;
}

function toSignal<T>(read: () => T, subscribe: (subscriber: Subscriber) => () => void): Signal<T> {
  const signalReader = read as Signal<T>;
  Object.defineProperty(signalReader, "value", { get: read, enumerable: true });
  signalReader.subscribe = subscribe;
  return signalReader;
}

/** Creates a mutable reactive signal. */
export function signal<T>(initial: T): WritableSignal<T> {
  let current = initial;
  const subscribers = new Set<Subscriber>();
  const read = (): T => {
    if (activeObserver) {
      const observer = activeObserver;
      subscribers.add(observer);
      registerDependency(() => subscribers.delete(observer));
    }
    return current;
  };
  const subscribe = (subscriber: Subscriber): (() => void) => {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  };
  const writer = toSignal(read, subscribe) as WritableSignal<T>;
  writer.set = (value: T) => {
    if (Object.is(value, current)) return;
    current = value;
    for (const subscriber of [...subscribers]) notify(subscriber);
  };
  writer.update = (updater: (value: T) => T) => writer.set(updater(current));
  writer.asReadonly = () => toSignal(read, subscribe);
  return writer;
}

/** Creates a lazily evaluated, dependency-tracked computed signal. */
export function computed<T>(compute: () => T): Signal<T> {
  const subscribers = new Set<Subscriber>();
  const dependencies: Array<() => void> = [];
  let cached!: T;
  let dirty = true;
  const invalidate = (): void => {
    if (!dirty) {
      dirty = true;
      for (const subscriber of [...subscribers]) notify(subscriber);
    }
  };
  const evaluate = (): T => {
    if (!dirty) return cached;
    for (const unsubscribe of dependencies.splice(0)) unsubscribe();
    const previousCollector = activeCollector;
    activeCollector = dependencies;
    try {
      cached = withObserver(invalidate, compute);
    } finally {
      activeCollector = previousCollector;
    }
    dirty = false;
    return cached;
  };
  const read = (): T => {
    if (activeObserver) {
      const observer = activeObserver;
      subscribers.add(observer);
      registerDependency(() => subscribers.delete(observer));
    }
    return evaluate();
  };
  return toSignal(read, (subscriber) => {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  });
}

/** Registers a reactive effect that reruns when its dependencies change. */
export function effect(fn: () => void | (() => void)): () => void {
  let cleanup: (() => void) | undefined;
  let disposed = false;
  const dependencies: Array<() => void> = [];
  const run = (): void => {
    if (disposed) return;
    for (const unsubscribe of dependencies.splice(0)) unsubscribe();
    cleanup?.();
    cleanup = undefined;
    const previousCollector = activeCollector;
    activeCollector = dependencies;
    try {
      const result = withObserver(run, fn);
      if (typeof result === "function") cleanup = result;
    } finally {
      activeCollector = previousCollector;
    }
  };
  run();
  return () => {
    disposed = true;
    for (const unsubscribe of dependencies.splice(0)) unsubscribe();
    cleanup?.();
    cleanup = undefined;
  };
}

/** Subscribes a React component to a signal and returns its current value. */
export function useSignalValue<T>(source: Signal<T>): T {
  return useSyncExternalStore(
    (onStoreChange) => source.subscribe(onStoreChange),
    () => source(),
    () => source()
  );
}

/**
 * @description Runs an effect callback for the lifetime of a React component.
 * @summary Creates a reactive effect inside {@link useEffect} and disposes it on
 * unmount, so signal reads inside `fn` re-run the callback without leaking the
 * effect into later renders.
 * @param {Function} fn - Effect callback; may return a cleanup function.
 * @param {unknown[]} [deps=[]] - React dependency list controlling re-subscription.
 * @returns {void}
 * @memberOf module:for-react.diagrams
 */
export function useSignalEffect(fn: () => void | (() => void), deps: readonly unknown[] = []): void {
  useEffect(() => {
    const dispose = effect(fn);
    return dispose;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Development-mode probe. */
export function isDevMode(): boolean {
  return false;
}

export type { Subscriber };

/**
 * Minimal `EventEmitter`-style observable (emit/subscribe) used by the
 * parameter renderer contract.
 */
export class EventEmitter<T> {
  private readonly listeners = new Set<(value: T) => void>();

  emit(value: T): void {
    for (const listener of [...this.listeners]) listener(value);
  }

  subscribe(listener: (value: T) => void): { unsubscribe(): void } {
    this.listeners.add(listener);
    return { unsubscribe: () => this.listeners.delete(listener) };
  }

  asObservable(): { subscribe(listener: (value: T) => void): { unsubscribe(): void } } {
    return { subscribe: (listener) => this.subscribe(listener) };
  }
}
