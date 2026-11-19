import {
  DEFAULT_PATTERNS,
  Validation,
  ValidationKeys,
  Validator,
  Primitives,
} from "@decaf-ts/decorator-validation";
import {
  FieldProperties,
  HTML5InputTypes,
  parseValueByType,
} from "@decaf-ts/ui-decorators";

const patternValidators: Record<string, unknown> = {
  [ValidationKeys.PASSWORD]: DEFAULT_PATTERNS.PASSWORD.CHAR8_ONE_OF_EACH,
  [ValidationKeys.EMAIL]: DEFAULT_PATTERNS.EMAIL,
  [ValidationKeys.URL]: DEFAULT_PATTERNS.URL,
};

/**
 * @description Factory for building value validators from field metadata.
 * @summary Bridges decaf {@link Validation} validators with the field props
 * emitted by the ui-decorators package, resolving pattern-based validators and
 * composing multiple validators into a single function.
 * @memberOf module:for-react
 */
export class ValidatorFactory {
  /**
   * @description Creates a validator for a single validation key.
   * @summary Resolves the effective key from the field props, normalises the
   * input value by type, and returns a function yielding the validator's error
   * message or `undefined` when the value passes.
   * @param {Partial<FieldProperties>} fieldProps - Field metadata used to
   * resolve and configure the validator.
   * @param {string} key - Validation key to spawn.
   * @returns {Function} Validator that returns an error message or `undefined`.
   */
  static spawn(fieldProps: Partial<FieldProperties>, key: string) {
    if (!Validation.keys().includes(key)) {
      throw new Error(`Unsupported validator ${key}`);
    }

    return (value: unknown): string | undefined => {
      const validatorKey = ValidatorFactory.resolveKey(key, fieldProps);
      const validator = Validation.get(validatorKey) as Validator;
      const normalizedValue =
        typeof value !== "undefined"
          ? parseValueByType(
            fieldProps.type || Primitives.STRING,
            value as string | number,
            fieldProps as FieldProperties
          )
          : undefined;
      const props = ValidatorFactory.buildProps(validatorKey, fieldProps);
      const errors = validator.hasErrors(normalizedValue, props);
      return errors || undefined;
    };
  }

  private static resolveKey(key: string, fieldProps: Partial<FieldProperties>) {
    if (key !== ValidationKeys.TYPE) return key;
    const type = fieldProps.customTypes || fieldProps.type;
    if (typeof type === "string" && patternValidators[type]) {
      return type;
    }
    if (fieldProps.type === HTML5InputTypes.CHECKBOX && !fieldProps[key as keyof FieldProperties]) {
      return HTML5InputTypes.CHECKBOX;
    }
    return ValidationKeys.TYPE;
  }

  private static buildProps(
    key: string,
    fieldProps: Partial<FieldProperties>
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {
      [key]: fieldProps[key as keyof FieldProperties],
    };
    if (patternValidators[key]) {
      props[ValidationKeys.PATTERN] = patternValidators[key];
    }
    return props;
  }

  /**
   * @description Lists the validation keys supported by the factory.
   * @summary Proxies the keys registered on decaf {@link Validation}.
   * @returns {string[]} Supported validation keys.
   */
  static supportedKeys(): string[] {
    return Validation.keys();
  }

  /**
   * @description Builds a single validator from multiple validation keys.
   * @summary Spawns one validator per key and composes them so the first
   * reported error is returned.
   * @param {Partial<FieldProperties>} fieldProps - Field metadata shared by the
   * validators.
   * @param {string[]} keys - Validation keys to compose.
   * @returns {Function} Validator that returns the first error message or
   * `undefined` when all checks pass.
   */
  static validatorsFromProps(
    fieldProps: Partial<FieldProperties>,
    keys: string[]
  ): (value: unknown) => string | undefined {
    const validators = keys.map((key) => ValidatorFactory.spawn(fieldProps, key));
    return (value: unknown) => {
      for (const validator of validators) {
        const result = validator(value);
        if (result) return result;
      }
      return undefined;
    };
  }
}
