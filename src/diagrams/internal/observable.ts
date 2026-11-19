/**
 * @module for-react/diagrams/internal/observable
 * @summary Tiny multicast event stream replacing the RxJS `Subject` in the port.
 * @description The graph execution service exposes execution events as an
 * RxJS observable. React hosts only need a hot multicast stream, so this module
 * provides the same `next`/`error`/`subscribe` surface without pulling RxJS into
 * the `./diagrams` subpath.
 */

/** Observer accepted by a {@link GraphEventStream}. */
export interface GraphObserver<T> {
  next(value: T): void;
  error?(error: unknown): void;
  complete?(): void;
}

/** Hot multicast event stream. */
export interface GraphEventStream<T> {
  subscribe(observer: GraphObserver<T> | ((value: T) => void)): { unsubscribe(): void };
}

/** Default multicast subject used by the execution and run event clients. */
export class GraphSubject<T> implements GraphEventStream<T> {
  private readonly observers = new Set<GraphObserver<T>>();

  next(value: T): void {
    for (const observer of [...this.observers]) observer.next(value);
  }

  error(error: unknown): void {
    for (const observer of [...this.observers]) observer.error?.(error);
  }

  complete(): void {
    for (const observer of [...this.observers]) observer.complete?.();
    this.observers.clear();
  }

  asObservable(): GraphEventStream<T> {
    return { subscribe: (observer) => this.subscribe(observer) };
  }

  subscribe(observer: GraphObserver<T> | ((value: T) => void)): { unsubscribe(): void } {
    const normalized: GraphObserver<T> =
      typeof observer === "function" ? { next: observer } : observer;
    this.observers.add(normalized);
    return { unsubscribe: () => this.observers.delete(normalized) };
  }
}
