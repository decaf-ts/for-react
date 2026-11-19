/**
 * SAA-2140 F3 — URL scheme allowlist regression (for-react).
 *
 * Parent SAA-2139 routed navigation/image inputs through `safeHref` /
 * `safeImageSrc`: `http:`/`https:` and relative URLs pass unchanged, while
 * `javascript:`, non-image `data:` and other schemes are dropped before they
 * reach `window.open`, an anchor `href`, or an image `src`.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RgxEmptyState } from "../../src/lib/components/empty-state/RgxEmptyState";
import { RgxIcon } from "../../src/lib/components/icon/RgxIcon";

describe("[SAA-2140 F3] RgxEmptyState buttonLink allowlist", () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  function clickButton(buttonLink: string): void {
    render(
      <RgxEmptyState title="Empty" buttonText="Go" buttonLink={buttonLink} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
  }

  it.each(["https://example.test/next", "/relative-path", "docs/page"])(
    "opens the allowed target %s unchanged",
    (buttonLink) => {
      clickButton(buttonLink);
      expect(openSpy).toHaveBeenCalledWith(buttonLink, "_self");
    }
  );

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ])("does not open the blocked target %s", (buttonLink) => {
    clickButton(buttonLink);
    expect(openSpy).not.toHaveBeenCalled();
  });
});

describe("[SAA-2140 F3] RgxIcon image name allowlist", () => {
  it.each([
    "logo.png",
    "assets/logo.png",
    "https://cdn.example.test/logo.png",
    "http://cdn.example.test/logo.png",
  ])("binds the allowed image source %s verbatim", async (name) => {
    const { container } = render(<RgxIcon name={name} width="24px" />);

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(name);
  });

  it.each([
    ["javascript:alert(document.domain)"],
    ["vbscript:alert(document.domain)"],
    ["data:text/html,<script>alert(document.domain)</script>"],
  ])("does not bind a dangerous image source for %s", (name) => {
    const { container } = render(<RgxIcon name={name} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('[src^="vbscript:"]')).toBeNull();
    expect(container.querySelector('[src^="data:text/html"]')).toBeNull();
    expect(container.innerHTML.toLowerCase()).not.toContain("javascript:");
    expect(container.innerHTML.toLowerCase()).not.toContain("vbscript:");
    expect(container.innerHTML.toLowerCase()).not.toContain("data:text/html");
  });
});
