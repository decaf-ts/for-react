/**
 * @module for-react/rgx-model-builder.spec
 * @summary SAA-2134 — unit coverage for the runtime `Model` build added to the
 * React `RgxModelBuilder`. The build button now constructs a
 * `@decaf-ts/decorator-validation` `Model` through the for-react `ModelBuilder`
 * barrel before emitting the unchanged definition payload.
 * @description Covers the four acceptance requirements:
 *
 * - happy path: the built instance is a real `Model` named after the configured
 *   model, exposed through `onModelBuild` and `data-built-model`, with the
 *   configured validators applied to its decoration metadata;
 * - per-type attribute selection: `string`/`number`/`date`/`boolean` map to the
 *   expected design types, with number ranges and string length/pattern rules;
 * - error path: a build that cannot complete surfaces a `role="alert"` error
 *   without throwing, leaving no built model and firing no callbacks;
 * - definition-payload emission: plain and structured-output modes produce
 *   exactly the same payloads on `structuredOutputChange`, `onChange` and
 *   `onBuild`.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Model } from "@decaf-ts/decorator-validation";
import { Metadata } from "@decaf-ts/decoration";
import {
  RgxModelBuilder,
  type ModelBuilderConfig,
  type ModelBuilderProperty,
} from "../../src/lib/components/model-builder/RgxModelBuilder";

type Validators = ModelBuilderProperty["validators"];
type ValidationBag = Record<string, Record<string, unknown>>;

function makeProperty(
  name: string,
  type: ModelBuilderProperty["type"],
  validators: Validators = {},
  ui: Partial<ModelBuilderProperty["ui"]> = {}
): ModelBuilderProperty {
  return {
    name,
    type,
    ui: {
      tag: "ngx-decaf-crud-field",
      type: "text",
      translatable: true,
      ...ui,
    },
    layout: { col: 1, row: 1, order: "", hideOn: [] },
    validators,
    expanded: false,
  };
}

function renderBuilder(props: React.ComponentProps<typeof RgxModelBuilder>) {
  return render(<RgxModelBuilder {...props} />);
}

function clickBuild() {
  fireEvent.click(screen.getByRole("button", { name: "Build model" }));
}

function validationsOf(model: Model): ValidationBag {
  const metadata = Metadata.get(model.constructor as never) as unknown as {
    validation?: ValidationBag;
  };
  return metadata?.validation ?? {};
}

function designTypeOf(model: Model, property: string): unknown {
  const { designType } = Metadata.getPropDesignTypes(
    model.constructor as never,
    property as never
  );
  return designType;
}

function attributesOf(model: Model): string[] {
  return Metadata.getAttributes(model.constructor as never);
}

describe("RgxModelBuilder runtime model build", () => {
  it("builds a runtime Model instance and exposes it via onModelBuild and data-built-model", () => {
    const config: ModelBuilderConfig = {
      name: "Article",
      properties: [
        makeProperty("title", "string", {
          required: true,
          minlength: 3,
          maxlength: 40,
          pattern: "^[A-Za-z0-9 ]+$",
        }),
        makeProperty("contactEmail", "string", { email: true }),
        makeProperty("website", "string", { url: true }),
        makeProperty("score", "number", { min: 1, max: 10 }),
      ],
    };
    const onModelBuild = jest.fn();

    const { container } = renderBuilder({
      modelConfig: config,
      onModelBuild,
    });
    clickBuild();

    expect(onModelBuild).toHaveBeenCalledTimes(1);
    const built = onModelBuild.mock.calls[0][0] as Model;

    expect(built).toBeInstanceOf(Model);
    expect(built.constructor.name).toBe("Article");
    expect(
      container.querySelector(".dcf-model-builder")
    ).toHaveAttribute("data-built-model", "Article");
    expect(attributesOf(built)).toEqual([
      "title",
      "contactEmail",
      "website",
      "score",
    ]);

    const validations = validationsOf(built);
    expect(Object.keys(validations.title)).toEqual(
      expect.arrayContaining([
        "required",
        "minlength",
        "maxlength",
        "pattern",
      ])
    );
    expect(validations.title.minlength).toMatchObject({ minlength: 3 });
    expect(validations.title.maxlength).toMatchObject({ maxlength: 40 });
    expect(validations.title.pattern).toMatchObject({
      pattern: "/^[A-Za-z0-9 ]+$/",
    });
    expect(validations.contactEmail).toHaveProperty("email");
    expect(validations.website).toHaveProperty("url");
    expect(validations.score.min).toMatchObject({ min: 1 });
    expect(validations.score.max).toMatchObject({ max: 10 });
  });

  it("maps each property type to the correct design type and validator metadata", () => {
    const config: ModelBuilderConfig = {
      name: "TypedRecord",
      properties: [
        makeProperty("title", "string", {
          minlength: 2,
          maxlength: 20,
          pattern: "^[A-Z].*$",
        }),
        makeProperty("score", "number", { min: 0, max: 100 }),
        makeProperty("publishedAt", "date"),
        makeProperty("active", "boolean"),
      ],
    };
    const onModelBuild = jest.fn();

    renderBuilder({ modelConfig: config, onModelBuild });
    clickBuild();

    const built = onModelBuild.mock.calls[0][0] as Model;
    expect(built.constructor.name).toBe("TypedRecord");

    expect(designTypeOf(built, "title")).toBe(String);
    expect(designTypeOf(built, "score")).toBe(Number);
    expect(designTypeOf(built, "publishedAt")).toBe(Date);
    expect(designTypeOf(built, "active")).toBe(Boolean);

    const validations = validationsOf(built);
    expect(validations.title.minlength).toMatchObject({ minlength: 2 });
    expect(validations.title.maxlength).toMatchObject({ maxlength: 20 });
    expect(validations.title.pattern).toMatchObject({
      pattern: "/^[A-Z].*$/",
    });
    expect(validations.score.min).toMatchObject({ min: 0 });
    expect(validations.score.max).toMatchObject({ max: 100 });
  });

  it("surfaces a build failure without throwing, emitting callbacks, or exposing a built model", () => {
    const config: ModelBuilderConfig = {
      name: "DuplicateModel",
      properties: [
        makeProperty("value", "string"),
        makeProperty("value", "number"),
      ],
    };
    const onModelBuild = jest.fn();
    const onBuild = jest.fn();
    const onChange = jest.fn();
    const structuredOutputChange = jest.fn();

    const { container } = renderBuilder({
      modelConfig: config,
      onModelBuild,
      onBuild,
      onChange,
      structuredOutputChange,
    });

    expect(() => clickBuild()).not.toThrow();

    expect(onModelBuild).not.toHaveBeenCalled();
    expect(onBuild).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(structuredOutputChange).not.toHaveBeenCalled();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("dcf-model-builder__error");
    expect(alert.textContent?.trim().length).toBeGreaterThan(0);

    expect(
      container.querySelector(".dcf-model-builder")
    ).not.toHaveAttribute("data-built-model");
    expect(container.querySelector("[data-built-model]")).toBeNull();
  });

  it("emits the plain definition payload unchanged to every callback", () => {
    const properties = [makeProperty("title", "string")];
    const config: ModelBuilderConfig = { name: "PlainArticle", properties };
    const onModelBuild = jest.fn();
    const onBuild = jest.fn();
    const onChange = jest.fn();
    const structuredOutputChange = jest.fn();

    const { container } = renderBuilder({
      modelConfig: config,
      onModelBuild,
      onBuild,
      onChange,
      structuredOutputChange,
    });
    clickBuild();

    const expected = { name: "PlainArticle", properties };

    expect(structuredOutputChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onBuild).toHaveBeenCalledTimes(1);
    expect(structuredOutputChange).toHaveBeenCalledWith(expected);
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(onBuild).toHaveBeenCalledWith(expected);

    const payload = onBuild.mock.calls[0][0];
    expect(payload).not.toHaveProperty("model");
    expect(payload).not.toHaveProperty("instructions");
    expect(onChange.mock.calls[0][0]).toBe(payload);
    expect(structuredOutputChange.mock.calls[0][0]).toBe(payload);

    expect(onModelBuild).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector(".dcf-model-builder")
    ).toHaveAttribute("data-built-model", "PlainArticle");
  });

  it("emits the structured-output definition payload unchanged to every callback", () => {
    const properties = [makeProperty("title", "string")];
    const config: ModelBuilderConfig = {
      name: "StructuredArticle",
      properties,
    };
    const onModelBuild = jest.fn();
    const onBuild = jest.fn();
    const onChange = jest.fn();
    const structuredOutputChange = jest.fn();

    renderBuilder({
      modelConfig: config,
      structuredOutputMode: true,
      onModelBuild,
      onBuild,
      onChange,
      structuredOutputChange,
    });
    clickBuild();

    const expected = {
      model: "StructuredArticle",
      instructions: "",
      jsonPromptInjection: false,
      providerOptions: {},
      properties,
    };

    expect(structuredOutputChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onBuild).toHaveBeenCalledTimes(1);
    expect(structuredOutputChange).toHaveBeenCalledWith(expected);
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(onBuild).toHaveBeenCalledWith(expected);

    const payload = onBuild.mock.calls[0][0];
    expect(payload).toMatchObject({
      model: "StructuredArticle",
      instructions: "",
      jsonPromptInjection: false,
      providerOptions: {},
    });
    expect(payload).not.toHaveProperty("name");
    expect(onChange.mock.calls[0][0]).toBe(payload);
    expect(structuredOutputChange.mock.calls[0][0]).toBe(payload);
  });
});
