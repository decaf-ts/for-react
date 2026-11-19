import { email, model, Model, required } from "@decaf-ts/decorator-validation";
import { uielement, uimodel } from "@decaf-ts/ui-decorators";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getRgxRenderingEngine } from "../../src/lib/engine/RgxRenderingEngine";
import { RgxFormService } from "../../src/lib/engine/RgxFormService";
import { registerDefaultComponents } from "../../src/lib/components/register-defaults";
import { RgxCrudField } from "../../src/lib/components/crud-field/RgxCrudField";
import { RgxCrudForm } from "../../src/lib/components/crud-form/RgxCrudForm";
import { RgxModelRenderer } from "../../src/lib/components/model-renderer/RgxModelRenderer";

@uimodel("ngx-decaf-crud-form")
@model()
class ValidationParityModel extends Model {
  constructor(arg?: Record<string, unknown>) {
    super(arg as never);
  }

  @required()
  @uielement("ngx-decaf-crud-field", {
    label: "Name",
    type: "text",
  })
  name = "";

  @required()
  @email()
  @uielement("ngx-decaf-crud-field", {
    label: "Email",
    type: "email",
  })
  email = "";
}

describe("metadata-driven form validation parity", () => {
  beforeAll(async () => {
    registerDefaultComponents();
    await getRgxRenderingEngine().initialize();
  });

  it("blocks invalid submits and annotates fields, then allows a valid submit", async () => {
    const onSubmit = jest.fn();
    render(
      <RgxModelRenderer
        model={new ValidationParityModel()}
        globals={{ onSubmit }}
      />
    );

    const nameInput = screen.getByLabelText(/Name/) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email/) as HTMLInputElement;
    const submit = screen.getByRole("button", { name: /Submit/ });

    fireEvent.click(submit);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAttribute("aria-describedby");
    const requiredAlerts = screen.getAllByRole("alert");
    expect(requiredAlerts.length).toBeGreaterThan(0);
    expect(requiredAlerts.some((alert) => /required/i.test(alert.textContent || ""))).toBe(true);
    expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);

    fireEvent.change(nameInput, { target: { value: "Jane" } });
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    fireEvent.click(submit);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => {
      expect(
        screen.getAllByRole("alert").some((alert) =>
          /valid email/i.test(alert.textContent || "")
        )
      ).toBe(true);
    });

    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Jane",
      email: "jane@example.com",
    });
    expect(emailInput).not.toHaveAttribute("aria-invalid");
  });

  it("blocks empty submits through directly rendered demo-style CRUD fields", () => {
    const form = RgxFormService.get(`demo-parity-${Date.now()}`);
    const onSubmit = jest.fn();
    const { container } = render(
      <RgxCrudForm formProvider={form} onSubmit={onSubmit}>
        <RgxCrudField
          name="email"
          path="email"
          type="email"
          label="Email"
          required
          formProvider={form}
        />
      </RgxCrudForm>
    );

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(input, { target: { value: "jane@example.com" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledWith({ email: "jane@example.com" });
  });
});
