/**
 * @module for-react/math.spec
 * @summary SAA-1938 — unit coverage for the React port of the MathLive
 * `<math-field>` wrapper (`/math` subpath, SAA-1937 / DECAF-895).
 * @description Ports the `for-angular` `MathInputComponent` assertions to React
 * and adds the guard/lazy-load/degradation coverage the port introduced:
 *
 * - the three public names are the same component reference;
 * - the custom element renders, input emits through both callbacks together,
 *   controlled writes reach `field.value`, placeholder/readOnly re-sync, and
 *   the virtual keyboard policy stays pinned to `manual`;
 * - the incoming-value no-op guard never reassigns `field.value` (cursor
 *   clobber guard);
 * - `mathlive` is imported lazily after mount, once per component lifetime;
 * - a rejected `mathlive` import degrades to an inert field without throwing;
 * - the public surface stays free of MathLive types.
 *
 * `mathlive` is mocked so no browser bundle is evaluated. Toggling the mock
 * mode from `ok` to `throw` is how the inert-degradation case is exercised.
 */
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, waitFor } from "@testing-library/react";
import {
  MathInput,
  MathInputComponent,
  RgxMathInput,
  type MathInputProps,
} from "../../src/math";
import * as mathPublic from "../../src/math";

type MathFieldElement = HTMLElement & {
  value: string;
  placeholder: string;
  readOnly: boolean;
  mathVirtualKeyboardPolicy?: string;
};

interface MathliveMock {
  evaluations: number;
  mode: "ok" | "throw";
}

const DECLARATION_FILES = [
  path.resolve(__dirname, "../../lib/types/math/public-api.d.mts"),
  path.resolve(__dirname, "../../lib/types/math/public-api.d.cts"),
  path.resolve(
    __dirname,
    "../../lib/types/math/components/math-input/MathInput.d.mts"
  ),
  path.resolve(
    __dirname,
    "../../lib/types/math/components/math-input/MathInput.d.cts"
  ),
];
const HAS_BUILT_TYPES = DECLARATION_FILES.some((file) => fs.existsSync(file));
const TYPES_SKIP_REASON =
  "lib/types/math is not built; run `npm run build:prod` before this declaration probe";

const mockMathlive: MathliveMock = { evaluations: 0, mode: "ok" };

function installMathliveMock(): void {
  jest.doMock("mathlive", () => {
    mockMathlive.evaluations += 1;
    if (mockMathlive.mode === "throw") {
      throw new Error("mathlive unavailable in this environment");
    }
    return {};
  });
}

function fieldOf(container: HTMLElement): MathFieldElement {
  const field = container.querySelector("math-field");
  expect(field).not.toBeNull();
  return field as MathFieldElement;
}

beforeEach(() => {
  jest.resetModules();
  mockMathlive.evaluations = 0;
  mockMathlive.mode = "ok";
  installMathliveMock();
});

describe("MathInput (React /math port)", () => {
  it("exports the same component through MathInput, MathInputComponent and RgxMathInput", () => {
    expect(typeof MathInput).toBe("function");
    expect(MathInputComponent).toBe(MathInput);
    expect(RgxMathInput).toBe(MathInput);
  });

  it("renders the MathLive custom element", async () => {
    const { container } = render(<MathInput placeholder="p" />);
    const field = fieldOf(container);

    await waitFor(() => expect(field.placeholder).toBe("p"));
    expect(field.classList.contains("decaf-math-input__field")).toBe(true);
  });

  it("emits the LaTeX value through onChange and onValueChange together", async () => {
    const calls: string[] = [];
    const { container } = render(
      <MathInput
        placeholder="p"
        onChange={(value) => calls.push(`change:${value}`)}
        onValueChange={(value) => calls.push(`valueChange:${value}`)}
      />
    );

    const field = fieldOf(container);
    await waitFor(() => expect(field.placeholder).toBe("p"));

    field.value = "\\frac{1}{2}";
    fireEvent.input(field);

    expect(calls).toEqual(["change:\\frac{1}{2}", "valueChange:\\frac{1}{2}"]);
  });

  it("syncs external controlled writes into field.value", async () => {
    const { container, rerender } = render(
      <MathInput value="x^{2}" placeholder="p" />
    );
    const field = fieldOf(container);

    await waitFor(() => expect(field.value).toBe("x^{2}"));

    rerender(<MathInput value={"\\frac{1}{2}"} placeholder="p" />);

    await waitFor(() => expect(field.value).toBe("\\frac{1}{2}"));
  });

  it("applies and re-syncs placeholder and disabled on prop changes", async () => {
    const { container, rerender } = render(
      <MathInput placeholder="Type here" disabled />
    );
    const field = fieldOf(container);

    await waitFor(() => expect(field.placeholder).toBe("Type here"));
    expect(field.readOnly).toBe(true);

    rerender(<MathInput placeholder="Type elsewhere" disabled={false} />);

    await waitFor(() => expect(field.placeholder).toBe("Type elsewhere"));
    expect(field.readOnly).toBe(false);
  });

  it("always pins mathVirtualKeyboardPolicy to manual", async () => {
    const { container, rerender } = render(<MathInput placeholder="p" />);
    const field = fieldOf(container);

    await waitFor(() => expect(field.mathVirtualKeyboardPolicy).toBe("manual"));

    rerender(<MathInput value="x" placeholder="p" disabled />);

    await waitFor(() => expect(field.value).toBe("x"));
    expect(field.mathVirtualKeyboardPolicy).toBe("manual");
  });

  it("does not reassign field.value when the incoming value already matches", async () => {
    const { container, rerender } = render(
      <MathInput value="same" placeholder="p" />
    );
    const field = fieldOf(container);

    let stored = "same";
    let writes = 0;
    Object.defineProperty(field, "value", {
      configurable: true,
      get: () => stored,
      set: (next: string) => {
        writes += 1;
        stored = next;
      },
    });

    await waitFor(() => expect(field.placeholder).toBe("p"));
    expect(writes).toBe(0);

    rerender(<MathInput value="different" placeholder="p" />);
    await waitFor(() => expect(stored).toBe("different"));
    expect(writes).toBe(1);

    stored = "same";
    rerender(<MathInput value="same" placeholder="p" />);
    expect(stored).toBe("same");
    expect(writes).toBe(1);
  });

  it("loads mathlive lazily after mount, once per component lifetime", async () => {
    expect(mockMathlive.evaluations).toBe(0);

    const { container, rerender, unmount } = render(
      <MathInput placeholder="p" />
    );
    const field = fieldOf(container);

    await waitFor(() => expect(mockMathlive.evaluations).toBe(1));
    await waitFor(() => expect(field.placeholder).toBe("p"));

    rerender(<MathInput value="x" placeholder="p" />);
    await waitFor(() => expect(field.value).toBe("x"));
    expect(mockMathlive.evaluations).toBe(1);

    unmount();
    jest.resetModules();
    installMathliveMock();
    render(<MathInput placeholder="p" />);

    await waitFor(() => expect(mockMathlive.evaluations).toBe(2));
  });

  it("degrades to an inert field when the mathlive import rejects", async () => {
    mockMathlive.mode = "throw";

    const { container } = render(
      <MathInput placeholder="still here" disabled />
    );
    const field = fieldOf(container);

    await waitFor(() => expect(field.placeholder).toBe("still here"));
    expect(field.readOnly).toBe(true);
    expect(mockMathlive.evaluations).toBe(1);
  });

  const declarationTest = HAS_BUILT_TYPES ? it : it.skip;
  declarationTest(
    HAS_BUILT_TYPES
      ? "exposes no MathLive types on the public surface"
      : `exposes no MathLive types on the public surface (skipped: ${TYPES_SKIP_REASON})`,
    () => {
      const runtimeExports = Object.keys(mathPublic).sort();
      expect(runtimeExports).toEqual([
        "MathInput",
        "MathInputComponent",
        "RgxMathInput",
      ]);

      const props: MathInputProps = {
        value: "x",
        placeholder: "y",
        disabled: false,
        onChange: (value: string) => value.length,
        onValueChange: (value: string) => value.length,
        className: "extra",
        style: { color: "red" },
      };
      expect(Object.keys(props).sort()).toEqual([
        "className",
        "disabled",
        "onChange",
        "onValueChange",
        "placeholder",
        "style",
        "value",
      ]);

      const declarations = DECLARATION_FILES.filter((file) =>
        fs.existsSync(file)
      );
      expect(declarations.length).toBeGreaterThan(0);

      for (const declaration of declarations) {
        const text = fs.readFileSync(declaration, "utf8");
        for (const name of [
          "MathInput",
          "MathInputComponent",
          "RgxMathInput",
          "MathInputProps",
        ]) {
          expect(text).toContain(name);
        }
        expect(text).not.toMatch(/from\s+["']mathlive["']/);
        expect(text).not.toMatch(/\bMathfieldElement\b(?!Like)/);
      }
    }
  );
});
