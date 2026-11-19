/**
 * Security regression probe — FA-2 equivalent (SAA-1803 F3, remediation bar
 * for SAA-1722).
 *
 * `RgxMediaService.loadSvg` fetched arbitrary content and assigned it straight
 * to `target.innerHTML`, so an attacker-influenced path (or a hostile
 * same-origin asset) could execute `<script>` / event handlers. SAA-1803 F3
 * requires either DOMPurify-class sanitization or same-origin restriction plus
 * strict content validation.
 *
 * The probes below are remediation-agnostic: they assert the security
 * property (dangerous markup never reaches the live DOM, benign SVG still
 * loads) rather than a particular implementation.
 */
import { RgxMediaService } from "../../src/lib/services/RgxMediaService";
import { RgxSvgDirective } from "../../src/lib/directives/RgxSvgDirective";

const XSS = "window.__fa2Executed=true";

type WindowWithFlag = Window & { __fa2Executed?: boolean };

function mockSvg(svg: string): jest.Mock {
  const response = {
    ok: true,
    status: 200,
    text: async () => svg,
    headers: { get: () => null },
  };
  const fetchMock = jest.fn(async () => response);
  (globalThis as unknown as { fetch: typeof fetch }).fetch =
    fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function expectNoExecutableSvg(target: HTMLElement): void {
  expect(target.querySelector("script")).toBeNull();
  expect(target.querySelector("foreignObject")).toBeNull();
  expect(target.querySelector("iframe")).toBeNull();
  expect(target.querySelector("embed")).toBeNull();
  expect(target.querySelector("object")).toBeNull();

  for (const element of Array.from(target.querySelectorAll("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = (attribute.value || "").trim().toLowerCase();
      expect(name.startsWith("on")).toBe(false);
      if (name === "href" || name.endsWith(":href")) {
        expect(/^(javascript|vbscript|data):/.test(value)).toBe(false);
      }
    }
  }

  // SVG animation primitives are a script/event-handler vector.
  for (const element of Array.from(
    target.querySelectorAll("animate, animateTransform, animateMotion, set")
  )) {
    for (const attribute of Array.from(element.attributes)) {
      expect((attribute.value || "").toLowerCase()).not.toContain("javascript:");
      expect((attribute.value || "").toLowerCase()).not.toContain("__fa2executed");
    }
  }

  expect((window as WindowWithFlag).__fa2Executed).toBe(false);
}

class ProbeSvgDirective extends RgxSvgDirective {
  constructor(mediaService: RgxMediaService) {
    super(mediaService);
  }

  load(element: HTMLElement, path: string): Promise<void> {
    return this.injectSvg(element, path);
  }
}

describe("[SAA-1803 F3] SVG load path rejects dangerous content (for-react)", () => {
  let service: RgxMediaService;
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    (window as WindowWithFlag).__fa2Executed = false;
    originalFetch = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
    service = new RgxMediaService();
  });

  afterEach(() => {
    service.dispose();
    if (originalFetch) {
      (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    } else {
      delete (globalThis as unknown as { fetch?: typeof fetch }).fetch;
    }
  });

  const hostileSvgs: Array<[string, string]> = [
    [
      "script element",
      `<svg xmlns="http://www.w3.org/2000/svg"><script>${XSS}</script><rect width="1" height="1"/></svg>`,
    ],
    [
      "root onload handler",
      `<svg xmlns="http://www.w3.org/2000/svg" onload="${XSS}"><rect width="1" height="1"/></svg>`,
    ],
    [
      "foreignObject html breakout",
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror="${XSS}"></body></foreignObject></svg>`,
    ],
    [
      "javascript xlink:href",
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:${XSS}"><text x="10" y="10">click</text></a></svg>`,
    ],
    [
      "data: use href",
      `<svg xmlns="http://www.w3.org/2000/svg"><use href="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+#x"/></svg>`,
    ],
    [
      "animation vector",
      `<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="href" values="javascript:${XSS}"/><set attributeName="onload" to="${XSS}"/><rect width="1" height="1"/></svg>`,
    ],
  ];

  it.each(hostileSvgs)(
    "loadSvg rejects same-origin SVG with %s",
    async (_name: string, svg: string) => {
      mockSvg(svg);
      const target = document.createElement("div");

      await service.loadSvg("/assets/hostile.svg", target).catch(() => undefined);

      expectNoExecutableSvg(target);
    }
  );

  it("loadSvg does not execute a hostile cross-origin SVG", async () => {
    const fetchMock = mockSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>${XSS}</script></svg>`
    );
    const target = document.createElement("div");

    await service
      .loadSvg("https://evil.test/hostile.svg", target)
      .catch(() => undefined);

    expectNoExecutableSvg(target);
    // A same-origin-only remediation may refuse before fetching; a sanitizing
    // remediation may fetch and strip. Either is acceptable, neither may inject.
    if (target.innerHTML !== "") {
      expect(fetchMock).toHaveBeenCalled();
    }
  });

  it("loadSvg still injects a benign same-origin SVG", async () => {
    mockSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><symbol id="p"><circle cx="5" cy="5" r="4" fill="#000"/></symbol></defs><use href="#p"/></svg>`
    );
    const target = document.createElement("div");

    await service.loadSvg("/assets/benign.svg", target);

    expect(target.querySelector("circle")).toBeTruthy();
    expect(target.querySelector("use")).toBeTruthy();
    expectNoExecutableSvg(target);
  });

  it("RgxSvgDirective.injectSvg applies the same rejection through loadSvg", async () => {
    mockSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>${XSS}</script><rect width="1" height="1"/></svg>`
    );
    const target = document.createElement("div");
    const directive = new ProbeSvgDirective(service);

    await directive.load(target, "/assets/hostile.svg").catch(() => undefined);

    expectNoExecutableSvg(target);
  });
});
