/**
 * @description Strips HTML tags and trims surrounding whitespace.
 * @summary Removes anything that looks like a tag via a non-greedy tag regex,
 * leaving the remaining text content, then trims both ends. This is a display
 * helper, not a general-purpose HTML sanitiser.
 * @param {string} value - The string that may contain HTML markup.
 * @returns {string} The tag-free, trimmed text.
 * @memberOf module:for-react
 */
export function sanitizeHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

/**
 * @description Shortens text to a maximum length, appending a trail.
 * @summary Sanitises the input with {@link sanitizeHtml} first, then truncates
 * to `limit` characters and appends `trail` when the cleaned text is longer.
 * Returns an empty string for falsy input.
 * @param {string} value - The text to shorten.
 * @param {number} [limit=30] - Maximum number of characters to keep.
 * @param {string} [trail="..."] - Suffix appended when truncation occurs.
 * @returns {string} The truncated, tag-free text.
 * @memberOf module:for-react
 * @example
 * truncate("<b>Hello world</b>", 5); // "Hello..."
 */
export function truncate(value: string, limit = 30, trail = "..."): string {
  if (!value) return "";
  const sanitized = sanitizeHtml(value);
  return sanitized.length > limit
    ? `${sanitized.substring(0, limit)}${trail}`
    : sanitized;
}
