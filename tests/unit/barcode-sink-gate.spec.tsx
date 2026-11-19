/**
 * @module for-react/barcode-sink-gate.spec
 * @summary SAA-1915 AC #2 — the component's own validator gate, independently of
 * the encoder.
 * @description `renderBarcodeSvg` validates its own output, so the existing
 * `barcode.spec.tsx` coverage of the React `dangerouslySetInnerHTML` sink only
 * ever exercises failures raised *inside* the renderer. This suite spies
 * `renderBarcodeSvg` and forces it to return already-rendered hostile markup,
 * then proves `Barcode` still runs its explicit `validateBarcodeSvg` gate,
 * binds nothing, and never hands the hostile string to the DOM sink.
 */
import React from "react";
import { render } from "@testing-library/react";
import * as renderer from "../../src/barcode/components/barcode-renderer";
import { Barcode } from "../../src/barcode/components/Barcode";

const ExecutionFlag = "window.__barcodeSinkExecuted=true";

const HOSTILE_ONLOAD = `<svg xmlns="http://www.w3.org/2000/svg" onload="${ExecutionFlag}"><rect width="10" height="10"/></svg>`;
const HOSTILE_SCRIPT = `<svg xmlns="http://www.w3.org/2000/svg"><script>${ExecutionFlag}</script></svg>`;

interface InnerHtmlTracker {
  writes: string[];
  restore: () => void;
}

/**
 * Instruments the `innerHTML` accessor jsdom installs on the DOM prototype so
 * the test can observe every string React's `dangerouslySetInnerHTML` sink
 * assigns. Returns the recorded writes plus a restore callback.
 */
function trackInnerHtmlWrites(): InnerHtmlTracker {
  let proto: object | null = document.createElement("div");
  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, "innerHTML");
    if (descriptor?.get && descriptor.set) {
      const writes: string[] = [];
      const originalSet = descriptor.set;
      Object.defineProperty(proto, "innerHTML", {
        configurable: true,
        enumerable: descriptor.enumerable ?? true,
        get: descriptor.get,
        set(this: Element, value: string) {
          writes.push(String(value));
          originalSet.call(this, value);
        },
      });
      return {
        writes,
        restore: () =>
          Object.defineProperty(proto as object, "innerHTML", {
            configurable: true,
            enumerable: descriptor.enumerable ?? true,
            get: descriptor.get,
            set: originalSet,
          }),
      };
    }
    proto = Object.getPrototypeOf(proto);
  }
  throw new Error("jsdom did not expose an innerHTML accessor to instrument");
}

describe("[SAA-1915 AC #2] Barcode independent sink gate", () => {
  beforeEach(() => {
    (window as any)["__barcodeSinkExecuted"] = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ["an onload handler", HOSTILE_ONLOAD],
    ["an inline script", HOSTILE_SCRIPT],
  ])(
    "rejects encoder output containing %s before it reaches dangerouslySetInnerHTML",
    (_label, hostile) => {
      const renderSpy = jest
        .spyOn(renderer, "renderBarcodeSvg")
        .mockReturnValueOnce(hostile);
      const validateSpy = jest.spyOn(renderer, "validateBarcodeSvg");
      const tracker = trackInnerHtmlWrites();

      let container: HTMLElement;
      try {
        ({ container } = render(
          <Barcode text="SAFE" bcid={renderer.BarcodeTypes.datamatrix} />
        ));
      } finally {
        tracker.restore();
      }

      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith(hostile);
      expect(() => renderer.validateBarcodeSvg(hostile)).toThrow(
        /Invalid barcode output/
      );

      expect(container.innerHTML).toBe("");
      expect(container.querySelector("svg")).toBeNull();
      expect(document.querySelector("script")).toBeNull();
      expect(
        tracker.writes.some(
          (written) =>
            written.includes("onload") || written.includes("<script")
        )
      ).toBe(false);
      expect((window as any)["__barcodeSinkExecuted"]).toBeUndefined();
    }
  );

  it("still binds the exact validated markup when the encoder output passes the gate", () => {
    const clean = renderer.renderBarcodeSvg("SAFE", {
      bcid: renderer.BarcodeTypes.datamatrix,
    });
    jest.spyOn(renderer, "renderBarcodeSvg").mockReturnValueOnce(clean);
    const validateSpy = jest.spyOn(renderer, "validateBarcodeSvg");
    const tracker = trackInnerHtmlWrites();

    let container: HTMLElement;
    try {
      ({ container } = render(
        <Barcode text="SAFE" bcid={renderer.BarcodeTypes.datamatrix} />
      ));
    } finally {
      tracker.restore();
    }

    expect(validateSpy).toHaveBeenCalledWith(clean);
    expect(tracker.writes).toContain(clean);
    expect(container.querySelector("[role='img'] svg")).not.toBeNull();
  });
});
