import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { BarcodePage } from "../../demo/pages/BarcodePage";
import { I18nLoader } from "../../src/lib/i18n/Loader";

const BARCODE_TRANSLATIONS = {
  title: "Barcode",
  intro:
    "Render GS1 DataMatrix, DataMatrix and QR payloads to validated SVG.",
  payload_label: "Payload",
  payload_placeholder: "Enter the barcode payload",
  symbology_label: "Symbology",
  scale_label: "Scale",
  reset: "Reset",
  preview_aria: "Rendered barcode preview",
  char_count: "{count} characters",
  error: "This payload cannot be rendered with the selected symbology.",
  empty: "Enter a payload to render a barcode.",
};

beforeAll(() => {
  I18nLoader.cache["en"] = {
    ...(I18nLoader.cache["en"] || {}),
    barcode: BARCODE_TRANSLATIONS,
    menu: { ...(I18nLoader.cache["en"]?.menu || {}), barcode: "Barcode" },
  };
});

function preview(): HTMLElement | null {
  return document.querySelector(".barcode-page__canvas");
}

function previewMarkup(): string {
  const host = preview();
  return host ? host.innerHTML : "";
}

describe("Barcode demo page — end to end", () => {
  it("renders the default DataMatrix payload as validated SVG", () => {
    render(<BarcodePage />);

    expect(preview()).not.toBeNull();
    expect(previewMarkup()).toMatch(/^<svg[\s\S]*<\/svg>$/);
    expect(preview()?.getAttribute("aria-label")).toBe(
      "Rendered barcode preview"
    );
    expect(screen.getByTestId("barcode-chars").textContent).toContain(
      "15 characters"
    );
  });

  it("re-renders the SVG when the payload changes", () => {
    render(<BarcodePage />);
    const initial = previewMarkup();

    fireEvent.change(screen.getByTestId("barcode-payload"), {
      target: { value: "NEW-PAYLOAD-0001" },
    });

    expect(previewMarkup()).toContain("<svg");
    expect(previewMarkup()).not.toBe(initial);
    expect(screen.getByTestId("barcode-chars").textContent).toContain(
      "16 characters"
    );
  });

  it("re-renders the SVG when the symbology changes", () => {
    render(<BarcodePage />);
    const dataMatrix = previewMarkup();

    fireEvent.change(screen.getByTestId("barcode-symbology"), {
      target: { value: "qrcode" },
    });

    expect(previewMarkup()).toContain("<svg");
    expect(previewMarkup()).not.toBe(dataMatrix);
  });

  it("clears the preview for an empty payload", () => {
    render(<BarcodePage />);

    fireEvent.change(screen.getByTestId("barcode-payload"), {
      target: { value: "   " },
    });

    expect(preview()).toBeNull();
    expect(screen.getByTestId("barcode-empty")).toBeInTheDocument();
  });

  it("shows the error state when the payload cannot be encoded", () => {
    render(<BarcodePage />);

    fireEvent.change(screen.getByTestId("barcode-symbology"), {
      target: { value: "gs1datamatrix" },
    });
    fireEvent.change(screen.getByTestId("barcode-payload"), {
      target: { value: "NOT-A-GS1-PAYLOAD" },
    });

    expect(preview()).toBeNull();
    expect(screen.getByTestId("barcode-error")).toBeInTheDocument();
  });

  it("reflects the requested scale and restores the defaults on reset", () => {
    render(<BarcodePage />);
    const initial = previewMarkup();

    fireEvent.change(screen.getByTestId("barcode-scale"), {
      target: { value: "8" },
    });
    expect(previewMarkup()).not.toBe(initial);

    fireEvent.change(screen.getByTestId("barcode-payload"), {
      target: { value: "CHANGED" },
    });
    fireEvent.change(screen.getByTestId("barcode-symbology"), {
      target: { value: "gs1datamatrix" },
    });
    fireEvent.click(screen.getByTestId("barcode-reset"));

    expect(
      (screen.getByTestId("barcode-payload") as HTMLTextAreaElement).value
    ).toBe("DECAF-1234-5678");
    expect(
      (screen.getByTestId("barcode-symbology") as HTMLSelectElement).value
    ).toBe("datamatrix");
    expect(
      (screen.getByTestId("barcode-scale") as HTMLInputElement).value
    ).toBe("4");
    expect(previewMarkup()).toContain("<svg");
  });
});
