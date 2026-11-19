import { KeyValue } from "../engine/types.js";

/**
 * @description Static English translation fixture used by tests and stories.
 * @summary Provides a small, predictable dictionary covering labels,
 * placeholders and pagination strings so components can be exercised without
 * loading real remote translations.
 * @memberOf module:for-react
 */
export const MockedEnTranslations = {
  FIELD_LABEL: "Translated Label",
  FIELD_PLACEHOLDER: "Translated Placeholder",
  HELLO: "Hello",
  GOODBYE: "Goodbye",
  component: {
    pagination: {
      previous: "previous",
      next: "next",
      page: "Page {0}",
    },
  },
} as const;

/**
 * @description Loader stand-in that returns the mocked English dictionary.
 * @summary Drop-in replacement for {@link I18nLoader} in tests, always
 * resolving to the in-memory fixture from {@link MockedEnTranslations} without
 * performing any network I/O.
 * @memberOf module:for-react
 */
export class I18nFakeLoader {
  /**
   * @description Returns the mocked translation dictionary.
   * @summary Ignores any requested language and always resolves the static
   * fixture, so callers can assert against stable translation strings.
   * @returns {Promise<KeyValue>} The mocked English translations.
   * @memberOf module:for-react
   */
  async getTranslation(): Promise<KeyValue> {
    return MockedEnTranslations as unknown as KeyValue;
  }
}
