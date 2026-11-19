import { act, fireEvent, render, screen } from "@testing-library/react";
import { DemoForm } from "../../demo/components/DemoForm";
import { RgxCrudField } from "../../src/lib/components/crud-field/RgxCrudField";
import { RgxCrudForm } from "../../src/lib/components/crud-form/RgxCrudForm";
import { RgxFormService } from "../../src/lib/engine/RgxFormService";

let sequence = 0;
const nextFormId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`;

describe("RgxCrudField provider value sync", () => {
  it("reflects a value set on RgxFormService after the field mounts", () => {
    const form = RgxFormService.get(nextFormId("crud-field-after-mount"));
    render(
      <RgxCrudForm formProvider={form}>
        <RgxCrudField name="name" path="name" label="Name" formProvider={form} />
      </RgxCrudForm>
    );

    const input = screen.getByLabelText(/Name/) as HTMLInputElement;
    expect(input.value).toBe("");

    act(() => {
      form.setValue("name", "Demerson Carvalho");
    });

    expect(input.value).toBe("Demerson Carvalho");

    let submitted: Record<string, unknown> | null = null;
    act(() => {
      submitted = form.submit();
    });
    expect(submitted).toEqual({ name: "Demerson Carvalho" });
  });

  it("reflects a value already present on RgxFormService before the field mounts", () => {
    const form = RgxFormService.get(nextFormId("crud-field-before-mount"));
    form.setValue("name", "Pre Mounted");

    render(
      <RgxCrudForm formProvider={form}>
        <RgxCrudField name="name" path="name" label="Name" formProvider={form} />
      </RgxCrudForm>
    );

    const input = screen.getByLabelText(/Name/) as HTMLInputElement;
    expect(input.value).toBe("Pre Mounted");

    let submitted: Record<string, unknown> | null = null;
    act(() => {
      submitted = form.submit();
    });
    expect(submitted).toEqual({ name: "Pre Mounted" });
  });

  it("displays DemoForm initialValues loaded through RgxFormService and submits them unchanged", () => {
    const onSubmit = jest.fn();
    const formId = nextFormId("demo-form-initial-values");

    render(
      <DemoForm
        id={formId}
        fields={[
          { name: "id", label: "ID", type: "number" },
          { name: "name", label: "Name" },
        ]}
        initialValues={{ id: 1, name: "Demerson Carvalho" }}
        submitLabel="Submit"
        onSubmit={onSubmit}
      />
    );

    const idInput = screen.getByLabelText(/ID/) as HTMLInputElement;
    const nameInput = screen.getByLabelText(/Name/) as HTMLInputElement;
    expect(idInput.value).toBe("1");
    expect(nameInput.value).toBe("Demerson Carvalho");

    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));

    expect(onSubmit).toHaveBeenCalledWith({ id: 1, name: "Demerson Carvalho" });
  });
});
