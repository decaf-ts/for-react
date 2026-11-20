/**
 * SAA-2140 F2 — sanitized HTML sinks regression (for-react).
 *
 * Parent SAA-2139 restored the for-angular DomSanitizer parity on the three
 * `dangerouslySetInnerHTML` sinks: benign markup survives, `<script>` elements
 * and every `on*` handler are stripped, and `javascript:` URLs lose their
 * scheme-bearing attribute.
 *
 * These specs exercise the real components so a future regression that
 * re-introduces a raw sink fails here.
 */
import React from "react";
import { render } from "@testing-library/react";
import { RgxCard } from "../../src/lib/components/card/RgxCard";
import { RgxModal } from "../../src/lib/components/modal/RgxModal";
import { RgxEmptyState } from "../../src/lib/components/empty-state/RgxEmptyState";

const PAYLOAD =
  '<b>bold</b><script>window.__f2Xss=true</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a>';

type WindowWithFlag = Window & { __f2Xss?: boolean };

/**
 * Asserts the post-fix sink contract for a rendered subtree: the benign
 * `<b>`/text is preserved, no script node or `on*` attribute exists, and no
 * anchor keeps a `javascript:` href.
 */
function expectSanitizedSink(scope: HTMLElement): void {
  expect(scope.querySelector("b")).not.toBeNull();
  expect(scope.querySelector("b")?.textContent).toBe("bold");
  expect(scope.textContent).toContain("bold");

  expect(scope.querySelector("script")).toBeNull();

  const inlineHandlers = Array.from(scope.querySelectorAll("*")).flatMap(
    (element) =>
      Array.from(element.attributes).filter((attribute) =>
        attribute.name.toLowerCase().startsWith("on")
      )
  );
  expect(inlineHandlers).toEqual([]);
  expect(scope.querySelector("[onerror]")).toBeNull();
  expect(scope.querySelector("[onload]")).toBeNull();

  expect(scope.querySelector('a[href^="javascript:"]')).toBeNull();
  for (const anchor of Array.from(scope.querySelectorAll("a"))) {
    expect((anchor.getAttribute("href") ?? "").toLowerCase()).not.toContain(
      "javascript:"
    );
  }

  expect((window as WindowWithFlag).__f2Xss).toBeFalsy();
}

describe("[SAA-2140 F2] RgxCard inlineContent sanitization", () => {
  beforeEach(() => {
    (window as WindowWithFlag).__f2Xss = false;
  });

  it.each(["top", "bottom"] as const)(
    "sanitizes string inlineContent at the %s position",
    (position) => {
      const { container } = render(
        <RgxCard
          title="Card"
          inlineContent={PAYLOAD}
          inlineContentPosition={position}
        >
          <span>body</span>
        </RgxCard>
      );

      const content = container.querySelector<HTMLElement>(
        ".dcf-card-content"
      );
      expect(content).not.toBeNull();
      expectSanitizedSink(content as HTMLElement);
      expect(content?.textContent).toContain("body");
    }
  );

  it("keeps ReactNode inlineContent as ordinary React output", () => {
    const { container } = render(
      <RgxCard inlineContent={<b>trusted</b>}>
        <span>body</span>
      </RgxCard>
    );
    expect(container.querySelector(".dcf-card-content b")?.textContent).toBe(
      "trusted"
    );
  });
});

describe("[SAA-2140 F2] RgxModal inlineContent sanitization", () => {
  beforeEach(() => {
    (window as WindowWithFlag).__f2Xss = false;
  });

  it("sanitizes string inlineContent inside the open portal", () => {
    render(<RgxModal isOpen title="Dialog" inlineContent={PAYLOAD} />);

    const content = document.querySelector<HTMLElement>(".dcf-modal-content");
    expect(content).not.toBeNull();
    expect(content?.closest('[role="dialog"]')).not.toBeNull();
    expectSanitizedSink(content as HTMLElement);
  });
});

describe("[SAA-2140 F2] RgxEmptyState title/subtitle sanitization", () => {
  beforeEach(() => {
    (window as WindowWithFlag).__f2Xss = false;
  });

  it("sanitizes a hostile title while preserving benign markup", () => {
    const { container } = render(
      <RgxEmptyState title={PAYLOAD} subtitle="Subtitle" />
    );

    const title = container.querySelector<HTMLElement>("h4.dcf-ititle");
    expect(title).not.toBeNull();
    expectSanitizedSink(title as HTMLElement);
  });

  it("sanitizes a hostile subtitle while preserving benign markup", () => {
    const { container } = render(
      <RgxEmptyState title="Title" subtitle={PAYLOAD} />
    );

    const subtitle = container.querySelector<HTMLElement>("p.dcf-subtitle");
    expect(subtitle).not.toBeNull();
    expectSanitizedSink(subtitle as HTMLElement);
  });
});

const SMIL_TAGS = new Set([
  "animate",
  "animatecolor",
  "animatemotion",
  "animatetransform",
  "discard",
  "set",
]);

const SMIL_PAYLOAD =
  '<svg><a><set attributeName="href" to="javascript:alert(1)"/></a></svg>';

const SMIL_ELEMENT_PAYLOAD =
  "<svg>" +
  '<animate attributeName="href" values="javascript:alert(1)"/>' +
  '<animateColor attributeName="href" to="javascript:alert(1)"/>' +
  '<set attributeName="href" to="javascript:alert(1)"/>' +
  '<animateMotion dur="1s" repeatCount="indefinite"/>' +
  '<animateTransform attributeName="transform" type="rotate" values="0;360"/>' +
  '<discard begin="1s"/>' +
  "</svg>";

const ANIMATE_COLOR_PAYLOAD =
  '<svg><a><animateColor attributeName="href" to="javascript:alert(1)"/></a></svg>';

/**
 * SAA-2138 reproduction (F8): SMIL animation elements mutate another element's
 * attribute at runtime, so a `javascript:` URL in `to`/`values` never has to
 * survive as a scheme-bearing URL attribute. After sanitization no SMIL element
 * and no `javascript:` payload may remain.
 */
function expectNoSmilMutation(scope: HTMLElement): void {
  for (const element of Array.from(scope.querySelectorAll("*"))) {
    expect(SMIL_TAGS.has(element.tagName.toLowerCase())).toBe(false);
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      expect(name).not.toBe("to");
      expect(name).not.toBe("values");
      expect(attribute.value.toLowerCase()).not.toContain("javascript:");
    }
  }
  expect(scope.querySelector("set")).toBeNull();
  expect(scope.innerHTML.toLowerCase()).not.toContain("javascript:");
}

describe("[SAA-2144 F8] SMIL animation-element bypass sanitization", () => {
  it("strips the <set> href-mutation payload from RgxCard inlineContent", () => {
    const { container } = render(
      <RgxCard inlineContent={SMIL_PAYLOAD}>
        <span>body</span>
      </RgxCard>
    );

    const content = container.querySelector<HTMLElement>(".dcf-card-content");
    expect(content).not.toBeNull();
    expectNoSmilMutation(content as HTMLElement);
  });

  it("strips every SMIL animation element from RgxEmptyState title", () => {
    const { container } = render(
      <RgxEmptyState title={SMIL_ELEMENT_PAYLOAD} subtitle="Subtitle" />
    );

    const title = container.querySelector<HTMLElement>("h4.dcf-ititle");
    expect(title).not.toBeNull();
    expectNoSmilMutation(title as HTMLElement);
  });

  it("strips the legacy <animateColor> href-mutation payload from RgxCard inlineContent", () => {
    const { container } = render(
      <RgxCard inlineContent={ANIMATE_COLOR_PAYLOAD}>
        <span>body</span>
      </RgxCard>
    );

    const content = container.querySelector<HTMLElement>(".dcf-card-content");
    expect(content).not.toBeNull();
    expectNoSmilMutation(content as HTMLElement);
    expect(content?.querySelector("animatecolor")).toBeNull();
    expect(content?.innerHTML.toLowerCase()).not.toContain("animatecolor");
  });
});
