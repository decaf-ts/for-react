import { HTML5InputTypes } from "@decaf-ts/ui-decorators";
import { ValidatorFactory } from "../../src/lib/engine/ValidatorFactory";
import { RgxFormService } from "../../src/lib/engine/RgxFormService";

describe("form validation", () => {
  it("validates required fields", () => {
    const validator = ValidatorFactory.spawn(
      { name: "name", path: "name", type: HTML5InputTypes.TEXT, required: true },
      "required"
    );
    expect(validator("")).toBeDefined();
    expect(validator("Jane")).toBeUndefined();
  });

  it("validates email fields", () => {
    const validator = ValidatorFactory.spawn(
      { name: "email", path: "email", type: HTML5InputTypes.EMAIL, email: true } as never,
      "email"
    );
    expect(validator("not-an-email")).toBeDefined();
    expect(validator("jane@example.com")).toBeUndefined();
  });

  it("attaches composed validators to controls created from metadata props", () => {
    const form = RgxFormService.get("validation-form");
    const control = form.addFormControl({
      name: "email",
      type: HTML5InputTypes.EMAIL,
      required: true,
      email: true,
    });
    expect(control.validateFn).toBeDefined();
    expect(control.validateFn?.("")).toBeDefined();
    expect(control.validateFn?.("bad")).toBeDefined();
    expect(control.validateFn?.("jane@example.com")).toBeUndefined();
  });

  it("reports the first failing validator", () => {
    const validator = ValidatorFactory.validatorsFromProps(
      { name: "code", path: "code", type: HTML5InputTypes.TEXT, required: true },
      ["required"]
    );
    expect(validator("")).toBeDefined();
    expect(validator("ok")).toBeUndefined();
  });
});
