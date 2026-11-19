import { email, model, Model, required } from "@decaf-ts/decorator-validation";
import { uielement, uimodel } from "@decaf-ts/ui-decorators";
import { getRgxRenderingEngine } from "../../src/lib/engine/RgxRenderingEngine";
import { RgxComponentRegistry } from "../../src/lib/engine/ComponentRegistry";
import { RgxFormService } from "../../src/lib/engine/RgxFormService";
import { registerDefaultComponents } from "../../src/lib/components/register-defaults";
import { RgxModelRenderer } from "../../src/lib/components/model-renderer/RgxModelRenderer";
import { fireEvent, render, screen } from "@testing-library/react";

@uimodel("ngx-decaf-crud-form")
@model()
class TestUser extends Model {
  constructor(arg?: Record<string, unknown>) {
    super(arg as never);
  }

  @required()
  @uielement("ngx-decaf-crud-field", {
    label: "Name",
    placeholder: "Enter your name",
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

describe("dynamic model rendering", () => {
  beforeAll(() => {
    registerDefaultComponents();
  });

  it("converts ui-decorators metadata into a field definition", async () => {
    const engine = getRgxRenderingEngine();
    await engine.initialize();
    const def = (engine as any).toFieldDefinition(new TestUser(), {});
    expect(def.tag).toBe("ngx-decaf-crud-form");
    expect(def.children?.length).toBe(2);
    const tags = (def.children || []).map((child: any) => child.tag);
    expect(tags).toContain("ngx-decaf-crud-field");
  });

  it("renders a model through the engine and the component registry", async () => {
    const engine = getRgxRenderingEngine();
    const node = engine.render(new TestUser(), {});
    render(<div data-testid="host">{node}</div>);
    expect(screen.getByTestId("host")).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Name/) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email/) as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveValue("");
    expect(nameInput).toHaveAttribute("placeholder", "Enter your name");
    expect(nameInput).toHaveAttribute("type", "text");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
    expect(screen.getByPlaceholderText("Enter your name")).toBe(nameInput);

    fireEvent.change(nameInput, { target: { value: "Jane" } });
    expect(nameInput).toHaveValue("Jane");

    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
    expect(emailInput).toHaveValue("jane@example.com");

    expect(screen.getByRole("button", { name: /Submit/ })).toBeInTheDocument();
  });

  it("renders a model instance through RgxModelRenderer", () => {
    render(<RgxModelRenderer model={new TestUser()} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("registers every component selector exposed by for-angular", () => {
    const expected = [
      "ngx-decaf-card",
      "ngx-decaf-component-renderer",
      "ngx-decaf-container",
      "ngx-decaf-crud-field",
      "ngx-decaf-crud-form",
      "ngx-decaf-dashboard",
      "ngx-decaf-empty-state",
      "ngx-decaf-fieldset",
      "ngx-decaf-file-upload",
      "ngx-decaf-filter",
      "ngx-decaf-icon",
      "ngx-decaf-layout",
      "ngx-decaf-list",
      "ngx-decaf-list-item",
      "ngx-decaf-modal",
      "ngx-decaf-modal-confirm",
      "ngx-decaf-model-builder",
      "ngx-decaf-model-renderer",
      "ngx-decaf-pagination",
      "ngx-decaf-searchbar",
      "ngx-decaf-stepped-form",
      "ngx-decaf-table",
    ];
    expected.forEach((tag) => {
      expect(RgxComponentRegistry.get(tag)).toBeDefined();
    });
  });

  it("keeps form state in the shared form service", () => {
    const form = RgxFormService.get("metadata-form");
    form.addFormControl({ name: "name", type: "text", value: "John" });
    form.setValue("name", "Jane");
    expect(form.getParsedData().name).toBe("Jane");
  });
});
