/**
 * @jest-environment node
 *
 * SAA-1938 — server-render coverage for the `/math` subpath.
 *
 * `MathInput` only imports MathLive inside a `useEffect`, which never runs on
 * the server. This suite proves the non-browser inert-degradation contract:
 * `react-dom/server` renders the bare `<math-field>` host with the
 * `decaf-math-input__field` class and never evaluates MathLive. `mathlive` is
 * mocked with a throwing factory, so any evaluation at import or render time
 * would fail this suite.
 */
import React from "react";
import { renderToString } from "react-dom/server";
import { MathInput } from "../../src/math";

jest.mock("mathlive", () => {
  throw new Error("mathlive must never be evaluated during SSR");
});

describe("MathInput — SSR", () => {
  it("renders an empty inert math-field host without evaluating mathlive", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const html = renderToString(
      <MathInput value="x" placeholder="y" disabled />
    );

    expect(html).toContain("<math-field");
    expect(html).toContain("decaf-math-input__field");
    expect(html).toMatch(/<math-field[^>]*><\/math-field>/);
    expect(html).not.toContain("mathlive");
  });

  it("does not throw or pin attributes during SSR (effects never run)", () => {
    const html = renderToString(<MathInput />);

    expect(html).toContain("<math-field");
    expect(html).not.toContain("readonly");
    expect(html).not.toContain("placeholder=");
  });
});
