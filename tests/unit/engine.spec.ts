import React from "react";
import { RgxEventEmitter } from "../../src/lib/engine/RgxEventHandler";
import { RgxComponentRegistry } from "../../src/lib/engine/ComponentRegistry";
import { RgxFormService } from "../../src/lib/engine/RgxFormService";
import { ValidatorFactory } from "../../src/lib/engine/ValidatorFactory";
import { ControlFieldProps, KeyValue } from "../../src/lib/engine/types";
import { HTML5InputTypes } from "@decaf-ts/ui-decorators";
import { RgxRenderingEngine } from "../../src/lib/engine/RgxRenderingEngine";

describe("RgxEventEmitter", () => {
  it("emits payloads to subscribers", () => {
    const emitter = new RgxEventEmitter<string>();
    const received: string[] = [];
    const unsubscribe = emitter.subscribe((value) => received.push(value));

    emitter.emit("hello");
    emitter.emit("world");
    unsubscribe();
    emitter.emit("ignored");

    expect(received).toEqual(["hello", "world"]);
  });
});

describe("RgxComponentRegistry", () => {
  it("registers and retrieves components by tag", () => {
    const Comp = () => null;
    RgxComponentRegistry.register("test-comp", Comp);
    expect(RgxComponentRegistry.get("test-comp")).toBe(Comp);
  });
});

describe("RgxRenderingEngine", () => {
  it("renders a field definition using the registry", () => {
    const Tag = ({ children }: { children?: React.ReactNode }) => <div data-testid="rendered">{children}</div>;
    RgxComponentRegistry.register("demo", Tag);
    const engine = new RgxRenderingEngine();
    engine.initialize();

    const def = {
      tag: "demo",
      props: { name: "demoField" },
      children: [],
    } as unknown as KeyValue;

    const node = (engine as any).fromFieldDefinition(def);
    expect(React.isValidElement(node)).toBe(true);
  });
});

describe("RgxFormService", () => {
  it("stores and parses control values", () => {
    const form = RgxFormService.get("test");
    const control: ControlFieldProps = {
      name: "age",
      type: HTML5InputTypes.NUMBER,
      defaultValue: "42",
    };
    form.addFormControl(control);
    form.setValue("age", "10");

    const parsed = form.getParsedData();
    expect(parsed.age).toBe(10);
  });

  it("supports nested child forms via childOf", () => {
    const root = RgxFormService.get("root");
    const child = root.addChild("address");
    child.addFormControl({ name: "city", type: HTML5InputTypes.TEXT, defaultValue: "Paris" });

    const values = root.getParsedData();
    expect((values as any).address.city).toBe("Paris");
  });

  it("attaches validateFn when validation keys are present", () => {
    const form = RgxFormService.get("validator");
    const control = form.addFormControl({ name: "email", type: HTML5InputTypes.EMAIL, required: true });
    expect(control.validateFn).toBeDefined();
    expect(control.validateFn?.("john@example.com")).toBeUndefined();
    expect(control.validateFn?.("")).toBeDefined();
  });
});

describe("ValidatorFactory", () => {
  it("returns a validator that reports errors for required fields", () => {
    const props: ControlFieldProps = {
      name: "firstName",
      type: HTML5InputTypes.TEXT,
      required: true,
      // validator factory uses fieldProps to inspect validations
      rendererId: "x",
    };
    const validator = ValidatorFactory.spawn(props, "required");
    expect(validator("John")).toBeUndefined();
    expect(validator("")).toBeDefined();
  });
});
