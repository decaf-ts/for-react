/**
 * @description Normalises a model-builder structured definition.
 * @summary Accepts either a JSON string or an object and returns it only when it
 * is a non-array object carrying a non-empty string `model` field. Invalid JSON,
 * primitives, arrays and definitions without a `model` name yield `null`.
 * @param {unknown} value - Candidate definition, as a JSON string or object.
 * @returns {Record<string, unknown> | null} The validated definition, or `null` when invalid.
 * @memberOf module:for-react
 */
export function modelBuilderStructuredDefinitionOf(
  value: unknown
): Record<string, unknown> | null {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  const record = candidate as Record<string, unknown>;
  if (typeof record["model"] !== "string" || !record["model"].trim()) {
    return null;
  }
  return record;
}
