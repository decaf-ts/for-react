/**
 * @module for-react/cron-selector-field.spec
 * @summary SAA-1957 — unit coverage for the React `CronSelectorField` CRUD
 * adapter port of the Angular cron selector field (SAA-1955 / DECAF-895).
 * @description Ports the Angular `CronSelectorFieldComponent` spec:
 *
 * - the `allowEmpty` checkbox clears the provider value to `''` for an
 *   optional field and restores the cron value for a required field;
 * - `required && !allowEmpty` forces the builder open with no toggle;
 * - the default cron is `0 9 * * *`;
 * - `describeCron`/`hide*`/`multiple` are forwarded to the real child builder;
 * - `multiple` defaults to `true`;
 * - read-only operations suppress every provider write;
 * - the field seeds from and stays in sync with the bound form provider.
 */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { OperationKeys } from "@decaf-ts/db-decorators";

jest.mock("../../src/cron/CronBuilder", () => {
  const actual = jest.requireActual("../../src/cron/CronBuilder");
  const actualReact = jest.requireActual("react");
  const props: Record<string, unknown>[] = [];
  (globalThis as Record<string, unknown>).__cronBuilderProps = props;
  return {
    ...actual,
    CronBuilder: (received: Record<string, unknown>) => {
      props.push(received);
      return actualReact.createElement(actual.CronBuilder, received);
    },
  };
});

function builderProps(): Record<string, unknown>[] {
  return ((globalThis as Record<string, unknown>).__cronBuilderProps ??
    []) as Record<string, unknown>[];
}

import {
  CronSelectorField,
  CronSelectorFieldComponent,
  RgxCronSelectorField,
} from "../../src/cron/CronSelectorField";

interface FakeFormProvider {
  values: Record<string, unknown>;
  listeners: Set<() => void>;
  setValue: jest.Mock;
  getValues: jest.Mock;
  getParsedData: jest.Mock;
  reset: jest.Mock;
  submit: jest.Mock;
  addFormControl: jest.Mock;
  getControl: jest.Mock;
  validateField: jest.Mock;
  markAsDirty: jest.Mock;
  getFieldError: jest.Mock;
  subscribe: jest.Mock;
}

function makeProvider(
  initial: Record<string, unknown> = {}
): FakeFormProvider {
  const values = { ...initial };
  const listeners = new Set<() => void>();
  const provider: FakeFormProvider = {
    values,
    listeners,
    setValue: jest.fn((path: string, value: unknown) => {
      values[path] = value;
    }),
    getValues: jest.fn((path?: string) =>
      path ? values[path] : values
    ),
    getParsedData: jest.fn(() => ({ ...values })),
    reset: jest.fn(),
    submit: jest.fn(() => null),
    addFormControl: jest.fn((props: Record<string, unknown>) => props),
    getControl: jest.fn(() => ({ path: "cron" })),
    validateField: jest.fn(() => undefined),
    markAsDirty: jest.fn(),
    getFieldError: jest.fn(() => undefined),
    subscribe: jest.fn((listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  };
  return provider;
}

function renderField(
  props: Partial<React.ComponentProps<typeof CronSelectorField>> = {}
) {
  const provider = makeProvider();
  const result = render(
    <CronSelectorField
      name="cron"
      path="cron"
      label="Schedule"
      operation={OperationKeys.CREATE}
      formProvider={provider as never}
      {...props}
    />
  );
  return { ...result, provider };
}

function toggleCheckbox(container: HTMLElement): void {
  const checkbox = container.querySelector("ion-checkbox") as Element;
  expect(checkbox).not.toBeNull();
  fireEvent(
    checkbox,
    new CustomEvent("ionChange", {
      detail: { checked: true },
      bubbles: true,
      cancelable: true,
    })
  );
}

function closeButton(container: HTMLElement): void {
  const button = container.querySelector(
    ".dcf-cron-selector-close"
  ) as Element;
  expect(button).not.toBeNull();
  fireEvent.click(button);
}

describe("CronSelectorField (React CRUD adapter)", () => {
  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  beforeEach(() => {
    builderProps().length = 0;
  });

  it("exports the same component through all public aliases", () => {
    expect(CronSelectorFieldComponent).toBe(CronSelectorField);
    expect(RgxCronSelectorField).toBe(CronSelectorField);
  });

  it("shows the empty checkbox and hides the builder when there is no value", () => {
    const { container } = renderField({ allowEmpty: true });

    expect(container.querySelector("ion-checkbox")).not.toBeNull();
    expect(container.querySelector(".dcf-cron-builder")).toBeNull();
  });

  it("reveals the default builder when the empty checkbox is toggled on", () => {
    const { container } = renderField({ allowEmpty: true });

    act(() => toggleCheckbox(container));

    expect(container.querySelector(".dcf-cron-builder")).not.toBeNull();
    expect(
      container.querySelector(".dcf-cron-builder-expression")?.textContent
    ).toBe("0 9 * * *");
    expect(
      container.querySelector(".dcf-cron-selector-close")
    ).not.toBeNull();
  });

  it("clears the provider value when toggled off on an optional field", () => {
    const { container, provider } = renderField({
      allowEmpty: true,
      required: false,
    });

    act(() => toggleCheckbox(container));

    const minute = container.querySelector(
      "#cron-builder-minute"
    ) as HTMLInputElement;
    fireEvent.change(minute, { target: { value: "15" } });
    expect(provider.values.cron).toBe("15 9 * * *");

    act(() => closeButton(container));

    expect(provider.values.cron).toBe("");
    expect(container.querySelector(".dcf-cron-builder")).toBeNull();
  });

  it("restores the cron value when toggled off on a required field", () => {
    const { container, provider } = renderField({
      allowEmpty: true,
      required: true,
    });

    act(() => toggleCheckbox(container));
    expect(container.querySelector(".dcf-cron-builder")).not.toBeNull();

    act(() => closeButton(container));

    expect(provider.values.cron).toBe("0 9 * * *");
    expect(container.querySelector(".dcf-cron-builder")).toBeNull();
  });

  it("forces the builder open when required and not allowEmpty", () => {
    const { container } = renderField({
      allowEmpty: false,
      required: true,
    });

    expect(container.querySelector("ion-checkbox")).toBeNull();
    expect(container.querySelector(".dcf-cron-builder")).not.toBeNull();
    expect(
      container.querySelector(".dcf-cron-builder-expression")?.textContent
    ).toBe("0 9 * * *");
  });

  it("forwards describeCron, hide flags and multiple to the child builder", async () => {
    renderField({
      allowEmpty: false,
      required: true,
      describeCron: true,
      hideDaily: true,
      hideInterval: true,
      hideWeekly: true,
    });

    const forwarded = builderProps()[builderProps().length - 1];
    expect(forwarded.describeCron).toBe(true);
    expect(forwarded.hideDaily).toBe(true);
    expect(forwarded.hideInterval).toBe(true);
    expect(forwarded.hideWeekly).toBe(true);
    expect(forwarded.multiple).toBe(true);
    expect(forwarded.value).toBe("0 9 * * *");
    expect(forwarded.label).toBe("Schedule");
    await act(async () => {
      await Promise.resolve();
    });
  });

  it("defaults multiple to true while allowing an explicit override", () => {
    const { rerender } = renderField({
      allowEmpty: false,
      required: true,
    });
    expect(
      builderProps()[builderProps().length - 1].multiple
    ).toBe(true);

    rerender(
      <CronSelectorField
        name="cron"
        path="cron"
        operation={OperationKeys.CREATE}
        allowEmpty={false}
        required
        multiple={false}
      />
    );
    expect(
      builderProps()[builderProps().length - 1].multiple
    ).toBe(false);
  });

  it("suppresses every write for read-only operations", () => {
    const provider = makeProvider({ cron: "0 7 * * *" });
    const { container } = render(
      <CronSelectorField
        name="cron"
        path="cron"
        label="Schedule"
        operation={OperationKeys.READ}
        allowEmpty={false}
        required
        formProvider={provider as never}
      />
    );

    expect(provider.setValue).not.toHaveBeenCalled();
    expect(container.querySelector("ion-checkbox")).toBeNull();
    expect(
      container.querySelector(".dcf-cron-selector-close")
    ).toBeNull();
    expect(container.querySelector(".dcf-input-item.read")).not.toBeNull();
    expect(container.querySelector("code")?.textContent).toBe("0 7 * * *");
  });

  it("seeds from the bound provider value", () => {
    const provider = makeProvider({ cron: "0 8 * * *" });
    const { container } = render(
      <CronSelectorField
        name="cron"
        path="cron"
        label="Schedule"
        operation={OperationKeys.CREATE}
        allowEmpty={false}
        required
        formProvider={provider as never}
      />
    );

    expect(
      container.querySelector(".dcf-cron-builder-expression")?.textContent
    ).toBe("0 8 * * *");
  });

  it("marks the provider dirty and validates the field on a builder change", () => {
    const { container, provider } = renderField({
      allowEmpty: false,
      required: true,
    });

    const hour = container.querySelector(
      "#cron-builder-hour"
    ) as HTMLInputElement;
    fireEvent.change(hour, { target: { value: "8" } });

    expect(provider.values.cron).toBe("0 8 * * *");
    expect(provider.markAsDirty).toHaveBeenLastCalledWith("cron");
    expect(provider.validateField).toHaveBeenLastCalledWith("cron");
  });
});
