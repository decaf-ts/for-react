type Listener<T> = (payload: T) => void;

/**
 * Lightweight event emitter used by the React engine abstractions.
 * Provides subscribe/unsubscribe helpers without relying on Angular EventEmitter.
 */
export class RgxEventEmitter<T> {
  private listeners = new Set<Listener<T>>();

  emit(payload: T): void {
    this.listeners.forEach((listener) => listener(payload));
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.listeners.clear();
  }
}
