import "@testing-library/jest-dom";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";

// jsdom does not expose the Encoding API; browser-styled render caps measure
// UTF-8 bytes with it, so polyfill it for the diagram I/O viewer tests.
if (typeof globalThis.TextEncoder === "undefined") {
  Object.defineProperty(globalThis, "TextEncoder", { value: NodeTextEncoder, configurable: true, writable: true });
}
if (typeof globalThis.TextDecoder === "undefined") {
  Object.defineProperty(globalThis, "TextDecoder", { value: NodeTextDecoder, configurable: true, writable: true });
}
import { I18nLoader } from "../src/lib/i18n/Loader";

if (typeof Range !== "undefined") {
  const emptyRect = () => new DOMRect(0, 0, 0, 0);
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = function () {
      return {
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* () {},
      } as unknown as DOMRectList;
    };
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = emptyRect;
  }
}

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

class NoopObserver {
  root = null;
  rootMargin = "";
  thresholds: number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

for (const name of ["IntersectionObserver", "ResizeObserver"] as const) {
  if (typeof globalThis[name] === "undefined") {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: NoopObserver,
    });
  }
}

// Ionic's <ion-datetime-button> resolves its target <ion-datetime> by id during
// hydration. In jsdom the modal contents mount through a portal after the
// button's first hydration pass, so the lookup logs a spurious error even
// though the datetime element exists (asserted by the cron picker tests).
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("[ion-datetime-button] - No ion-datetime instance found")
  ) {
    return;
  }
  originalConsoleError(...args);
};

I18nLoader.cache["en"] = {
  HELLO: "Hello",
  "component.loading": "Loading...",
  "component.list.empty.title": "No data",
  "component.list.empty.subtitle": "Nothing to show",
  "component.list.search.title": "No results found",
  "component.list.search.subtitle": "No results for {0}",
  "component.model_builder.add_property": "Add property",
  "component.model_builder.build_model": "Build model",
  "component.model_builder.empty_properties": "No properties yet",
  "component.model_builder.live_preview": "Preview",
  "component.model_builder.preview_empty": "Build a model to preview it",
  "component.model_builder.model_name": "Model name",
  "component.model_builder.invalid": "Every property needs a name",
  "steppedForm.next": "Next",
  "steppedForm.previous": "Previous",
  "steppedForm.submit": "Submit",
  "steppedForm.cancel": "Cancel",
  "steppedForm.step_of": "Step {current} of {total}",
  "dashboard.save": "Save",
  "dashboard.delete": "Delete",
  "dashboard.remove": "Remove",
  "dashboard.confirm_remove": "Remove this component?",
  "dashboard.confirm": "Confirm",
  "dashboard.cancel": "Cancel",
  "dashboard.empty": "Empty dashboard",
  "list.search": "Search",
  "list.create": "Create",
  "list.refresh": "Refresh",
  "list.load_more": "Load more",
  "table.search": "Search",
  "table.actions.label": "Actions",
  "table.operations.update": "Update",
  "table.operations.delete": "Delete",
  "table.operations.read": "Read",
  "table.name.label": "Name",
  "fileUpload.empty": "No files",
  "fieldset.add": "Add",
  "fieldset.add_first": "Add first",
  "fieldset.show_form": "Show form",
  "fieldset.clear_items": "Clear items",
  "fieldset.hidden_form": "Show",
  "fieldset.edit_item": "Edit",
  "fieldset.remove_item": "Remove",
  "fieldset.create_item": "Add item",
  "fieldset.cancel": "Cancel",
  "filter.attribute": "Attribute",
  "filter.value": "Value",
  "filter.condition": "Condition",
  "filter.search": "Search",
  "filter.add": "Add filter",
  "filter.remove": "Remove",
  "filter.clear": "Clear",
  "modal.close": "Close",
  "modal.cancel": "Cancel",
  "modal.confirm": "Confirm",
};
