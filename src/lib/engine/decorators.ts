/**
 * React implementations do not rely on Angular's Dynamic decorator.
 * Export a no-op function to keep the API compatible.
 */
export function Dynamic(): ClassDecorator {
  return () => undefined;
}
