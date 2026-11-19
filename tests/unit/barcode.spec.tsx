import React from "react";
import { render } from "@testing-library/react";
import {
  Barcode,
  BarcodeComponent,
  BarcodeTypes,
  createBarcodeContainer,
  renderBarcodeSvg,
  validateBarcodeSvg,
} from "../../src/barcode";

const XSS = "window.__barcodeExecuted=true";

function hostMarkup(container: HTMLElement): string {
  const host = container.querySelector("[role='img']") as HTMLElement;
  return host ? host.innerHTML : "";
}

describe("[SAA-1630] barcode user payload → dangerouslySetInnerHTML chain", () => {
  beforeAll(() => {
    (window as any)["__barcodeExecuted"] = false;
  });

  afterEach(() => {
    (window as any)["__barcodeExecuted"] = false;
  });

  it("exports BarcodeComponent as an alias of Barcode", () => {
    expect(BarcodeComponent).toBe(Barcode);
  });

  it("renders validated SVG through the React sink", () => {
    const { container } = render(
      <Barcode
        text="DECAF-1234-5678"
        bcid={BarcodeTypes.datamatrix}
        className="barcode-host"
        ariaLabel="Demo barcode"
      />
    );

    const host = container.querySelector("[role='img']") as HTMLElement;
    expect(host).not.toBeNull();
    expect(host.classList.contains("barcode-host")).toBe(true);
    expect(host.getAttribute("aria-label")).toBe("Demo barcode");
    expect(host.innerHTML).toMatch(/^<svg[\s\S]*<\/svg>$/);
    expect(() => validateBarcodeSvg(host.innerHTML)).not.toThrow();
  });

  it("qr payload containing an img-onerror vector yields no img/handler markup", () => {
    const { container } = render(
      <Barcode text={`<img src=x onerror="${XSS}">`} bcid={BarcodeTypes.qrcode} />
    );
    const markup = hostMarkup(container).toLowerCase();

    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("onerror");
    expect(markup).not.toContain("<script");
    expect(markup).not.toContain("<text");
    expect(container.querySelector("img")).toBeNull();
    expect((window as any)["__barcodeExecuted"]).toBe(false);
  });

  it("datamatrix payload with angle-bracket script markup is encoded, never emitted as markup", () => {
    const { container } = render(
      <Barcode
        text={`<script>${XSS}</script>`}
        bcid={BarcodeTypes.datamatrix}
      />
    );
    const markup = hostMarkup(container).toLowerCase();

    expect(markup).not.toContain("<script");
    expect(container.querySelector("script")).toBeNull();
    expect((window as any)["__barcodeExecuted"]).toBe(false);
  });

  it("alttext option cannot smuggle markup into the React sink", () => {
    const { container } = render(
      <Barcode
        text="ALT"
        bcid={BarcodeTypes.qrcode}
        options={{ alttext: `" onload="${XSS}` }}
      />
    );
    const markup = hostMarkup(container).toLowerCase();

    expect(markup).not.toContain("onload");
    expect(markup).not.toContain("<text");
    expect((window as any)["__barcodeExecuted"]).toBe(false);
  });

  it("hostile payload still yields a validated svg-only container", () => {
    const container = createBarcodeContainer(
      `<svg onload="${XSS}"><rect/></svg>`,
      { bcid: BarcodeTypes.datamatrix }
    );

    if (container) {
      const markup = container.innerHTML.toLowerCase();
      expect(markup).not.toContain("onload");
      expect(markup.startsWith("<svg")).toBe(true);
      expect(container.getAttribute("style")).toMatch(
        /^width: \d+px; height: \d+px;$/
      );
    }
    expect((window as any)["__barcodeExecuted"]).toBe(false);
  });

  it("outerHTML round-trip (DatamatrixModalHandler path) serializes without injecting attacker markup", () => {
    const container = createBarcodeContainer("(01)09501101530003", {
      bcid: BarcodeTypes.datamatrix,
    });
    expect(container).toBeTruthy();
    const outer = container!.outerHTML;
    expect(outer.toLowerCase()).not.toContain("onerror");
    expect(outer.toLowerCase()).not.toContain("<script");
  });

  it("gates the React sink on validation: malicious output is never bound", () => {
    const { container } = render(
      <Barcode
        text="SAFE"
        bcid={BarcodeTypes.datamatrix}
        options={{ backgroundcolor: '#ffffff" onload="alert(1)' as never }}
      />
    );

    expect(container.innerHTML).toBe("");
    expect((window as any)["__barcodeExecuted"]).toBe(false);
  });

  it("produces only allowlisted elements and attributes in the React sink", () => {
    const { container } = render(
      <Barcode text="https://example.test/barcode?batch=42" />
    );
    const host = container.querySelector("[role='img']") as HTMLElement;
    const elements = [host.firstElementChild, ...Array.from(host.querySelectorAll("*"))];

    for (const element of elements) {
      if (!element) continue;
      expect(element.namespaceURI).toBe("http://www.w3.org/2000/svg");
      for (const attribute of Array.from(element.attributes)) {
        expect(attribute.localName.toLowerCase().startsWith("on")).toBe(false);
      }
    }
  });

  it("keeps renderBarcodeSvg output equivalent to the markup the component binds", () => {
    const expected = renderBarcodeSvg("DECAF-1234-5678", {
      bcid: BarcodeTypes.datamatrix,
    });
    const { container } = render(<Barcode text="DECAF-1234-5678" />);
    const bound = hostMarkup(container);
    const viewBox = expected.match(/viewBox="[^"]+"/)?.[0] ?? "";

    expect(viewBox).not.toBe("");
    expect(bound).toContain(viewBox);
    expect(validateBarcodeSvg(bound)).toBe(bound);
  });
});
