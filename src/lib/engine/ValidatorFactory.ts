import {
  DEFAULT_PATTERNS,
  Validation,
  ValidationKeys,
  Validator,
  Primitives,
} from "@decaf-ts/decorator-validation";
import { FieldProperties, HTML5InputTypes, parseValueByType } from "@decaf-ts/ui-decorators";

const patternValidators: Record<string, unknown> = {
  [ValidationKeys.PASSWORD]: DEFAULT_PATTERNS.PASSWORD.CHAR8_ONE_OF_EACH,
  [ValidationKeys.EMAIL]: DEFAULT_PATTERNS.EMAIL,
  [ValidationKeys.URL]: DEFAULT_PATTERNS.URL,
};

export class ValidatorFactory {
  static spawn(fieldProps: FieldProperties, key: string) {
    if (!Validation.keys().includes(key)) {
      throw new Error(`Unsupported validator ${key}`);
    }

    return (value: unknown): string | undefined => {
      const validatorKey = ValidatorFactory.resolveKey(key, fieldProps);
      const validator = Validation.get(validatorKey) as Validator;
      const normalizedValue =
        typeof value !== "undefined"
          ? parseValueByType(fieldProps.type || Primitives.STRING, value, fieldProps)
          : undefined;
      const props = ValidatorFactory.buildProps(validatorKey, fieldProps);
      const errors = validator.hasErrors(normalizedValue, props);
      return errors || undefined;
    };
  }

  private static resolveKey(key: string, fieldProps: FieldProperties) {
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

  private static buildProps(key: string, fieldProps: FieldProperties): Record<string, unknown> {
    const props: Record<string, unknown> = {
      [key]: fieldProps[key as keyof FieldProperties],
    };
    if (patternValidators[key]) {
      props[ValidationKeys.PATTERN] = patternValidators[key];
    }
    return props;
  }

  static supportedKeys(): string[] {
    return Validation.keys();
  }

  static validatorsFromProps(fieldProps: FieldProperties, keys: string[]): (value: unknown) => string | undefined {
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
