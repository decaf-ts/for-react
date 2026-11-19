import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { RgxCrudField } from "../../src/lib/components/crud-field/RgxCrudField";
import { RgxCrudForm } from "../../src/lib/components/crud-form/RgxCrudForm";
import { RgxIcon } from "../../src/lib/components/icon/RgxIcon";
import { RgxLayout } from "../../src/lib/components/layout/RgxLayout";
import { RgxFileUpload } from "../../src/lib/components/file-upload/RgxFileUpload";
import { registerDefaultComponents } from "../../src/lib/components/register-defaults";
import { resolveTooltip, RgxTooltip } from "../../src/lib/directives/RgxTooltip";
import { RgxSvgDirective } from "../../src/lib/directives/RgxSvgDirective";
import { RgxFormService } from "../../src/lib/engine/RgxFormService";
import { RgxMediaService } from "../../src/lib/services/RgxMediaService";
import { I18nLoader } from "../../src/lib/i18n/Loader";

const formFor = (id: string) => RgxFormService.get(`behavior-${id}`);

const originalFetch = (globalThis as unknown as Record<string, unknown>).fetch;

function installFetch(implementation: (...args: unknown[]) => Promise<unknown>) {
  const mock = jest.fn(implementation);
  (globalThis as unknown as Record<string, unknown>).fetch = mock;
  return mock;
}

afterAll(() => {
  (globalThis as unknown as Record<string, unknown>).fetch = originalFetch;
});

describe("RgxCrudField", () => {
  it("binds text inputs to the form provider and reflects the typed value", () => {
    const form = formFor("text");
    render(
      <RgxCrudField
        name="first"
        label="First name"
        placeholder="Enter first name"
        required
        description="Given name"
        formProvider={form}
      />
    );
    const input = screen.getByLabelText(/First name/) as HTMLInputElement;
    expect(input).toHaveAttribute("placeholder", "Enter first name");
    fireEvent.change(input, { target: { value: "Jane" } });
    expect(input).toHaveValue("Jane");
    expect(form.getValues("first")).toBe("Jane");
    expect(screen.getByText("Given name")).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("renders a textarea and writes its value to the form provider", () => {
    const form = formFor("textarea");
    render(
      <RgxCrudField
        name="bio"
        type="textarea"
        label="Bio"
        formProvider={form}
      />
    );
    const textarea = screen.getByLabelText("Bio");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(form.getValues("bio")).toBe("Hello");
  });

  it("renders select options and stores the chosen option", () => {
    const form = formFor("select");
    render(
      <RgxCrudField
        name="role"
        type="select"
        label="Role"
        placeholder="Pick a role"
        formProvider={form}
        options={[
          { value: "admin", text: "Admin" },
          { value: "user", text: "User" },
        ]}
      />
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "user" } });
    expect(form.getValues("role")).toBe("user");
  });

  it("toggles checkbox groups into an array value", () => {
    const form = formFor("checkbox-group");
    render(
      <RgxCrudField
        name="permissions"
        type="checkbox"
        label="Permissions"
        formProvider={form}
        options={[
          { value: "read", text: "Read" },
          { value: "write", text: "Write" },
        ]}
      />
    );
    fireEvent.click(screen.getByText("Read"));
    expect(form.getValues("permissions")).toEqual(["read"]);
    fireEvent.click(screen.getByText("Write"));
    expect(form.getValues("permissions")).toEqual(["read", "write"]);
    fireEvent.click(screen.getByText("Read"));
    expect(form.getValues("permissions")).toEqual(["write"]);
  });

  it("supports a boolean checkbox when no options are supplied", () => {
    const form = formFor("checkbox-boolean");
    render(
      <RgxCrudField
        name="accepted"
        type="checkbox"
        label="Accept terms"
        formProvider={form}
      />
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(form.getValues("accepted")).toBe(true);
  });

  it("selects radio options", () => {
    const form = formFor("radio");
    render(
      <RgxCrudField
        name="plan"
        type="radio"
        label="Plan"
        formProvider={form}
        options={[
          { value: "free", text: "Free" },
          { value: "pro", text: "Pro" },
        ]}
      />
    );
    fireEvent.click(screen.getByText("Pro"));
    expect(form.getValues("plan")).toBe("pro");
    expect((screen.getByText("Pro").closest("label")?.querySelector("input") as HTMLInputElement).checked).toBe(true);
  });

  it("translates labels and placeholders through the loader cache", () => {
    I18nLoader.cache["en"]["FIELD_LABEL"] = "Translated Label";
    I18nLoader.cache["en"]["FIELD_PLACEHOLDER"] = "Translated Placeholder";
    try {
      const form = formFor("translated");
      render(
        <RgxCrudField
          name="translated"
          label="FIELD_LABEL"
          placeholder="FIELD_PLACEHOLDER"
          formProvider={form}
        />
      );
      expect(screen.getByLabelText("Translated Label")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Translated Placeholder")
      ).toBeInTheDocument();
    } finally {
      delete I18nLoader.cache["en"]["FIELD_LABEL"];
      delete I18nLoader.cache["en"]["FIELD_PLACEHOLDER"];
    }
  });

  it("warns and renders nothing without a form provider", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const { container } = render(<RgxCrudField name="orphan" label="Orphan" />);
      expect(container.querySelector(".dcf-form-field")).toBeNull();
      expect(warn).toHaveBeenCalledWith("RgxCrudField requires a formProvider");
    } finally {
      warn.mockRestore();
    }
  });
});

describe("RgxCrudForm", () => {
  it("submits the parsed form data through a rendered field", () => {
    const form = formFor("submit");
    form.addFormControl({ name: "first", type: "text" });
    const submit = jest.spyOn(form, "submit");
    const onSubmit = jest.fn();
    const { container } = render(
      <RgxCrudForm formProvider={form} onSubmit={onSubmit}>
        <RgxCrudField name="first" label="First" formProvider={form} />
      </RgxCrudForm>
    );
    fireEvent.change(screen.getByLabelText("First"), {
      target: { value: "Jane" },
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(submit).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith({ first: "Jane" });
    submit.mockRestore();
  });

  it("renders a custom submit label and a working reset button", () => {
    const form = formFor("reset");
    const reset = jest.spyOn(form, "reset");
    const onCancel = jest.fn();
    render(
      <RgxCrudForm
        formProvider={form}
        action="Save"
        onCancel={onCancel}
        options={{ buttons: { submit: {}, clear: { text: "Reset" } } }}
      >
        <span>Body</span>
      </RgxCrudForm>
    );
    expect(screen.getByRole("button", { name: /Save/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reset/ }));
    expect(reset).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    reset.mockRestore();
  });

  it("deletes through the rendered delete operation", () => {
    const form = formFor("delete");
    const onDelete = jest.fn();
    const { container } = render(
      <RgxCrudForm operation={OperationKeys.DELETE} formProvider={form} onDelete={onDelete}>
        <span>Record</span>
      </RgxCrudForm>
    );
    expect(container.querySelector("form")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Delete/ }));
    expect(onDelete).toHaveBeenCalledWith({});
  });

  it("renders read operations without a submit control", () => {
    const form = formFor("read");
    const { container } = render(
      <RgxCrudForm operation={OperationKeys.READ} formProvider={form}>
        <span>Read only</span>
      </RgxCrudForm>
    );
    expect(container.querySelector("section.dcf-form-grid.read")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Submit/ })).toBeNull();
    expect(screen.getByText("Read only")).toBeInTheDocument();
  });
});

describe("RgxIcon", () => {
  it("renders nothing without a name", () => {
    const { container } = render(<RgxIcon />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a known icon as an inline svg with a resolved color", () => {
    const { container } = render(<RgxIcon name="ti-user" color="primary" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    const slot = container.querySelector("[data-slot='icon-only']");
    expect(slot).toBeTruthy();
    expect((slot as HTMLElement).style.color).toBe("var(--app-accent, #1f6feb)");
  });

  it("renders image icons when the name looks like a path", async () => {
    const { container } = render(<RgxIcon name="logo.png" width="24px" />);
    await waitFor(() => expect(container.querySelector("img")).toBeTruthy());
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("logo.png");
    expect(img.style.width).toBe("24px");
  });

  it("renders a clickable button variant with an aria label", () => {
    const onClick = jest.fn();
    render(
      <RgxIcon
        name="ti-trash"
        button
        buttonFill="outline"
        ariaLabel="Delete row"
        onClick={onClick}
      />
    );
    const button = screen.getByRole("button", { name: "Delete row" });
    expect(button.className).toContain("dcf-icon-button");
    expect(button.className).toContain("outline");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});

describe("RgxLayout", () => {
  beforeAll(() => registerDefaultComponents());

  it("renders nothing when there are no rows", () => {
    const { container } = render(<RgxLayout />);
    expect(container.firstChild).toBeNull();
  });

  it("renders titled rows and column classes", () => {
    const { container } = render(
      <RgxLayout
        cols={2}
        rows={[
          {
            title: "Identity",
            cols: [
              { tag: "ngx-decaf-card", col: "full", props: { title: "Full" } },
            ],
          },
        ]}
      />
    );
    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(container.querySelector(".dcf-grid-col-full")).toBeTruthy();
  });

  it("groups children definitions into rows and computes width classes", () => {
    const { container } = render(
      <RgxLayout
        cols={2}
        rows={["First", "Second"]}
        childrenDefinitions={[
          { tag: "ngx-decaf-card", props: { row: 1, title: "A" } },
          { tag: "ngx-decaf-card", props: { row: 2, col: 1, title: "B" } },
        ]}
      />
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(container.querySelector(".dcf-width-1-2")).toBeTruthy();
  });

  it("wraps crud form columns in a card", () => {
    const { container } = render(
      <RgxLayout
        rows={[
          {
            cols: [{ tag: "ngx-decaf-crud-form", props: {} }],
          },
        ]}
      />
    );
    expect(container.querySelector(".dcf-card")).toBeTruthy();
  });
});

describe("RgxTooltip", () => {
  it("resolves long tooltip text, strips html and exposes a stable id prefix", () => {
    const resolved = resolveTooltip("<b>Hello</b> this text is definitely long");
    expect(resolved.active).toBe(true);
    expect(resolved.text).toBe("Hello this text is definitely long");
    expect(resolved.visible).toBe("Hello this text is definitely long");
    expect(resolved.id).toMatch(/^dcf-tooltip-/);
    expect(resolved.position).toBe("bottom");
  });

  it("keeps short tooltips inactive", () => {
    const { container } = render(<RgxTooltip options="Short" />);
    expect(container.querySelector("[role='tooltip']")).toBeNull();
    expect(container.querySelector("[aria-describedby]")).toBeNull();
    expect(screen.getByText("Short")).toBeInTheDocument();
  });

  it("renders an active tooltip with the full text", () => {
    const text = "A very long tooltip body that goes past the default limit";
    const { container } = render(<RgxTooltip options={text} />);
    const tooltip = container.querySelector("[role='tooltip']");
    expect(tooltip).toBeTruthy();
    expect(tooltip?.textContent).toBe(text);
    expect(container.querySelector("[aria-describedby]")?.getAttribute("aria-describedby")).toBe(
      tooltip?.id
    );
  });

  it("truncates the visible content when requested and keeps the full tooltip", () => {
    const { container } = render(
      <RgxTooltip
        options={{ text: "abcdefghij", limit: 4, truncate: true, trail: "…", position: "bottom" }}
      />
    );
    expect(screen.getByText("abcd…")).toBeInTheDocument();
    const tooltip = container.querySelector("[role='tooltip']");
    expect(tooltip?.textContent).toBe("abcdefghij");
    expect(tooltip?.className).toContain("dcf-tooltip-bottom");
  });

  it("prefers explicit children for the visible content", () => {
    render(
      <RgxTooltip options="A very long tooltip body that goes past the default limit">
        <button type="button">Details</button>
      </RgxTooltip>
    );
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
  });
});

class ExposedSvgDirective extends RgxSvgDirective {
  constructor(media: RgxMediaService) {
    super(media);
  }

  async run(element: HTMLElement, path: string) {
    return this.injectSvg(element, path);
  }
}

describe("RgxSvgDirective", () => {
  it("delegates svg loading to the media service", async () => {
    const loadSvg = jest.fn().mockResolvedValue(undefined);
    const directive = new ExposedSvgDirective({
      loadSvg,
    } as unknown as RgxMediaService);
    const element = document.createElement("div");
    await directive.run(element, "/icons/logo.svg");
    expect(loadSvg).toHaveBeenCalledWith("/icons/logo.svg", element);
    await directive.run(element, "");
    expect(loadSvg).toHaveBeenCalledTimes(1);
  });

  it("writes fetched svg markup into the host element", async () => {
    const fetch = installFetch(async () => ({
      text: async () => "<svg id='injected'></svg>",
    }));
    const directive = new ExposedSvgDirective(new RgxMediaService());
    const element = document.createElement("div");
    await directive.run(element, "/icons/logo.svg");
    expect(fetch).toHaveBeenCalledWith("/icons/logo.svg");
    expect(element.querySelector("#injected")).toBeTruthy();
  });
});

describe("RgxFileUpload", () => {
  const uploadFiles = (input: HTMLInputElement, files: File[]) => {
    fireEvent.change(input, { target: { files } });
  };

  it("uploads a valid file, exposes preview/remove controls and clears", async () => {
    const onChange = jest.fn();
    const onPreview = jest.fn();
    const { container } = render(
      <RgxFileUpload multiple onChange={onChange} onPreview={onPreview} />
    );
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File([new Uint8Array(8)], "a.png", { type: "image/png" });
    uploadFiles(input, [file]);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(JSON.parse(onChange.mock.calls[0][0])[0]).toMatch(/^data:image\/png/);
    expect(screen.getByText("a.png")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Preview"));
    await waitFor(() => expect(onPreview).toHaveBeenCalled());
    expect(onPreview.mock.calls[0][0]).toMatch(/^data:image\/png/);

    fireEvent.click(screen.getByText("Remove"));
    expect(screen.queryByText("a.png")).toBeNull();
    expect(onChange.mock.lastCall?.[0]).toBe("[]");
  });

  it("reports rejected files by type and keeps accepted ones", async () => {
    const onChange = jest.fn();
    const { container } = render(
      <RgxFileUpload multiple onChange={onChange} accept={["image/*"]} />
    );
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    uploadFiles(input, [new File([new Uint8Array(8)], "a.png", { type: "image/png" })]);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    uploadFiles(input, [new File([new Uint8Array(8)], "a.txt", { type: "text/plain" })]);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toContain("a.txt: not_allowed");
    expect(screen.getByText("a.png")).toBeInTheDocument();
  });

  it("rejects files above the configured size limit", async () => {
    const onChange = jest.fn();
    const { container } = render(
      <RgxFileUpload multiple maxFileSize={0.001} onChange={onChange} />
    );
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    uploadFiles(input, [new File([new Uint8Array(8)], "small.png", { type: "image/png" })]);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    uploadFiles(input, [
      new File([new Uint8Array(4096)], "big.png", { type: "image/png" }),
    ]);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toContain("big.png: max_size");
  });

  it("clears the selection", async () => {
    const onChange = jest.fn();
    const { container } = render(<RgxFileUpload onChange={onChange} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    uploadFiles(input, [new File([new Uint8Array(8)], "a.png", { type: "image/png" })]);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText("fileUpload.buttons.clear"));
    expect(screen.queryByText("a.png")).toBeNull();
    expect(onChange.mock.lastCall?.[0]).toBe("");
  });

  it("parses object payloads in read mode", () => {
    render(
      <RgxFileUpload
        operation={OperationKeys.READ}
        value={JSON.stringify([
          { name: "photo.png", size: 10, type: "image/png", source: "data:image/png;base64,AAA" },
        ])}
      />
    );
    expect(screen.getByText("photo.png")).toBeInTheDocument();
  });
});
