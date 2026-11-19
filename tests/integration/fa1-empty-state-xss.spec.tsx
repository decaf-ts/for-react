/**
 * Security regression probe — FA-1 (SAA-1803 F1, remediation bar for SAA-1722).
 *
 * Ports `for-angular/src/lib/security-probes/fa1-empty-state-xss.probe.spec.ts`
 * to the React main-lib surface. The React port dropped the SAA-1630 escape,
 * so a reflected XSS reached the empty-state subtitle through raw
 * `dangerouslySetInnerHTML`.
 *
 * These probes assert the POST-FIX behaviour required by SAA-1811:
 *   - `RgxList` subtitle interpolation  (`RgxList.tsx` search branch)
 *   - `RgxTable` subtitle interpolation (`RgxTable.tsx` search branch)
 *   - `RgxEmptyState` highlight span    (`RgxEmptyState.tsx` searchSubtitle path)
 *
 * The assertion is behavioural: no executable node/attribute may exist in the
 * rendered empty state, and the user value must appear as inert text.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RgxEmptyState } from "../../src/lib/components/empty-state/RgxEmptyState";
import { RgxList } from "../../src/lib/components/list/RgxList";
import { RgxTable } from "../../src/lib/components/table/RgxTable";

const PAYLOAD = `<img src=x onerror=alert(document.domain)>`;
const SVG_PAYLOAD = `<svg onload=alert(document.domain)></svg>`;
const BREAKOUT_PAYLOAD = `"><img src=x onerror=alert(document.domain)>`;

type WindowWithFlag = Window & { __fa1Executed?: boolean };

function expectInertEmptyState(container: HTMLElement, payload: string): void {
  const root = container.querySelector(".decaf-empty-state-component");
  expect(root).toBeTruthy();
  const scope = root as HTMLElement;

  // The trusted icon SVG lives outside the subtitle; only the subtitle must be
  // free of executable markup.
  expect(scope.querySelector("script")).toBeNull();
  expect(scope.querySelector("[onerror]")).toBeNull();
  expect(scope.querySelector("[onload]")).toBeNull();

  const subtitle = scope.querySelector("p");
  expect(subtitle).toBeTruthy();
  const sink = subtitle as HTMLElement;
  expect(sink.querySelector("img")).toBeNull();
  expect(sink.querySelector("script")).toBeNull();
  expect(sink.querySelector("svg")).toBeNull();
  expect(sink.querySelector("[onerror]")).toBeNull();
  expect(sink.querySelector("[onload]")).toBeNull();

  for (const element of Array.from(sink.querySelectorAll("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      expect(attribute.name.toLowerCase().startsWith("on")).toBe(false);
    }
  }

  // Escaped value is displayed verbatim as text, never promoted to markup.
  expect(sink.textContent).toContain(payload);
  expect((window as WindowWithFlag).__fa1Executed).toBeFalsy();
}

function typeSearch(value: string): void {
  fireEvent.change(screen.getByPlaceholderText("Search"), {
    target: { value },
  });
  act(() => {
    jest.advanceTimersByTime(600);
  });
}

describe("[SAA-1803 F1] FA-1 empty-state search subtitle XSS regression (for-react)", () => {
  beforeEach(() => {
    (window as WindowWithFlag).__fa1Executed = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("RgxList renders the search value in the empty-state subtitle as inert text", () => {
    jest.useFakeTimers();
    const { container } = render(
      <RgxList data={[]} enableFilter={false} />
    );

    typeSearch(PAYLOAD);

    expectInertEmptyState(container, PAYLOAD);
  });

  it("RgxTable renders the search value in the empty-state subtitle as inert text", () => {
    jest.useFakeTimers();
    const { container } = render(<RgxTable data={[]} />);

    typeSearch(PAYLOAD);

    expectInertEmptyState(container, PAYLOAD);
  });

  it("RgxEmptyState highlight span escapes searchValue before embedding", () => {
    const { container } = render(
      <RgxEmptyState searchValue={PAYLOAD} searchSubtitle="No results for {0}" />
    );

    expectInertEmptyState(container, PAYLOAD);
    // The trusted template markup (highlight span) still renders.
    expect(container.querySelector(".dcf-highlight")).toBeTruthy();
  });

  it.each([
    ["attribute breakout", BREAKOUT_PAYLOAD],
    ["svg onload", SVG_PAYLOAD],
    [
      "script tag",
      `<script>window.__fa1Executed=true</script>`,
    ],
    [
      "svg use data url",
      `<svg><use href="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+#x"/></svg>`,
    ],
  ])(
    "RgxEmptyState keeps %s payload inert",
    (_name: string, payload: string) => {
      const { container } = render(
        <RgxEmptyState searchValue={payload} searchSubtitle="No results for {0}" />
      );

      expectInertEmptyState(container, payload);
    }
  );
});
