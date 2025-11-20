import { KeyValue } from "../engine/types";

export class I18nFakeLoader {
  async getTranslation(): Promise<KeyValue> {
    return { HELLO: "Hello", GOODBYE: "Goodbye" };
  }
}
