import { Condition, OrderDirection } from "@decaf-ts/core";
import { WindowColorSchemes } from "../../src/lib/engine/constants";
import { SessionRamAdapter } from "../../src/lib/engine/SessionRamAdapter";
import { RgxRepositoryDirective } from "../../src/lib/engine/RgxRepositoryDirective";
import { RgxMediaService } from "../../src/lib/services/RgxMediaService";
import {
  I18nLoader,
  mergeTranslations,
  provideI18nLoader,
} from "../../src/lib/i18n/Loader";

const originalFetch = (globalThis as unknown as Record<string, unknown>).fetch;

function installFetch(implementation: (...args: unknown[]) => Promise<unknown>) {
  const mock = jest.fn(implementation);
  (globalThis as unknown as Record<string, unknown>).fetch = mock;
  return mock;
}

afterAll(() => {
  (globalThis as unknown as Record<string, unknown>).fetch = originalFetch;
});

describe("RgxMediaService", () => {
  it("notifies resize listeners immediately and on window resize", () => {
    const service = new RgxMediaService();
    const listener = jest.fn();
    const unsubscribe = service.onResize(listener);
    try {
      expect(listener).toHaveBeenCalledWith({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      listener.mockClear();
      window.dispatchEvent(new Event("resize"));
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      listener.mockClear();
      window.dispatchEvent(new Event("resize"));
      expect(listener).not.toHaveBeenCalled();
    } finally {
      service.dispose();
    }
  });

  it("reports and toggles the dark palette", () => {
    const service = new RgxMediaService();
    try {
      expect(service.isDarkMode()).toBe(false);
      service.toggleDarkPalette(document.documentElement, true);
      expect(document.documentElement.classList.contains("dcf-palette-dark")).toBe(true);
      expect(service.isDarkMode()).toBe(true);
      service.toggleDarkPalette(document.documentElement, false);
      expect(service.isDarkMode()).toBe(false);
    } finally {
      service.dispose();
      document.documentElement.classList.remove("dcf-palette-dark");
    }
  });

  it("notifies color-scheme listeners and stops after unsubscribe", () => {
    const service = new RgxMediaService();
    const listener = jest.fn();
    const unsubscribe = service.onColorSchemeChange(listener);
    try {
      expect(listener).toHaveBeenCalledWith(WindowColorSchemes.light);
      unsubscribe();
      listener.mockClear();
      expect(service.onColorSchemeChange(jest.fn())).toBeInstanceOf(Function);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      service.dispose();
    }
  });

  it("loads svg markup through fetch and ignores empty paths", async () => {
    const fetch = installFetch(async () => ({
      text: async () => "<svg></svg>",
    }));
    const service = new RgxMediaService();
    const target = document.createElement("div");
    await service.loadSvg("/x.svg", target);
    expect(fetch).toHaveBeenCalledWith("/x.svg");
    expect(target.innerHTML).toBe("<svg></svg>");
    await service.loadSvg("", target);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("I18nLoader", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetches, merges and caches translations from every resource", async () => {
    const fetch = installFetch(async () => ({
      ok: true,
      json: async () => ({
        errors: { required: "Override required" },
        custom: { greeting: "Hi" },
      }),
    }));

    const loader = new I18nLoader([{ prefix: "/i18n/", suffix: ".json" }]);
    const result = await loader.getTranslation("en");

    expect(fetch).toHaveBeenCalledWith("/i18n/en.json");
    expect((result.custom as Record<string, unknown>).greeting).toBe("Hi");
    expect((result.errors as Record<string, unknown>).required).toBe(
      "Override required"
    );
    expect((result.errors as Record<string, unknown>).email).toBe(
      "This field must be a valid email address."
    );
    expect(I18nLoader.cache["en"]).toBe(result);
  });

  it("adds a versioned suffix when configured", async () => {
    const fetch = installFetch(async () => ({
      ok: true,
      json: async () => ({}),
    }));

    const loader = new I18nLoader(
      [{ prefix: "/i18n/", suffix: ".json" }],
      true
    );
    await loader.getTranslation("en");

    expect(fetch.mock.calls[0][0]).toMatch(
      /^\/i18n\/en\.json\?version=\d+$/
    );
  });

  it("falls back to library translations when the resource is unavailable", async () => {
    installFetch(async () => ({
      ok: false,
      json: async () => ({}),
    }));
    const notOk = await new I18nLoader([
      { prefix: "/i18n/", suffix: ".json" },
    ]).getTranslation("en");
    expect((notOk.errors as Record<string, unknown>).required).toBe(
      "This field is required."
    );

    installFetch(async () => {
      throw new Error("network");
    });
    const threw = await new I18nLoader([
      { prefix: "/i18n/", suffix: ".json" },
    ]).getTranslation("en");
    expect((threw.errors as Record<string, unknown>).required).toBe(
      "This field is required."
    );
  });

  it("omits library translations when disabled but still merges resources", async () => {
    installFetch(async () => ({
      ok: true,
      json: async () => ({ custom: { flag: true } }),
    }));
    I18nLoader.enabled = false;
    try {
      const result = await new I18nLoader([
        { prefix: "/i18n/", suffix: ".json" },
      ]).getTranslation("en");
      expect(result.errors).toBeUndefined();
      expect(result.custom).toEqual({ flag: true });
    } finally {
      I18nLoader.enabled = true;
    }
  });

  it("deep merges translations and ignores prototype-pollution keys", () => {
    expect(
      mergeTranslations({ a: { b: 1 } }, { a: { c: 2 }, d: "x" })
    ).toEqual({ a: { b: 1, c: 2 }, d: "x" });

    const polluted = JSON.parse('{"__proto__":{"hacked":true},"safe":"ok"}');
    const merged = mergeTranslations({}, polluted);
    expect(merged.safe).toBe("ok");
    expect(Object.prototype.hasOwnProperty.call(merged, "__proto__")).toBe(
      false
    );
    expect(({} as Record<string, unknown>).hacked).toBeUndefined();
  });

  it("wraps a single resource config into an array", () => {
    expect(
      provideI18nLoader({ prefix: "/i18n/", suffix: ".json" })
    ).toEqual({
      resources: [{ prefix: "/i18n/", suffix: ".json" }],
      versionedSuffix: false,
    });
  });
});

describe("SessionRamAdapter", () => {
  const dbName = "for-react-session-test";

  beforeEach(() => localStorage.clear());

  it("persists create, update and delete snapshots to localStorage", async () => {
    const adapter = new SessionRamAdapter({ user: "tester", dbName }, "session-persist");
    await adapter.create("users", "1", { name: "A" });
    expect(JSON.parse(localStorage.getItem(dbName) as string).users).toEqual([
      ["1", { name: "A" }],
    ]);

    await adapter.update("users", "1", { name: "B" });
    expect(JSON.parse(localStorage.getItem(dbName) as string).users).toEqual([
      ["1", { name: "B" }],
    ]);

    await adapter.delete("users", "1");
    expect(JSON.parse(localStorage.getItem(dbName) as string).users).toEqual([]);
  });

  it("restores previously persisted records on construction", async () => {
    localStorage.setItem(
      dbName,
      JSON.stringify({ users: [["1", { name: "Restored" }]] })
    );
    const adapter = new SessionRamAdapter({ user: "tester", dbName }, "session-restore");
    await expect(adapter.read("users", "1")).resolves.toEqual({
      name: "Restored",
    });
  });

  it("recovers from corrupt snapshots and clears the bad entry", async () => {
    localStorage.setItem(dbName, "not-json");
    const adapter = new SessionRamAdapter({ user: "tester", dbName }, "session-corrupt");
    await expect(adapter.read("users", "1")).rejects.toBeDefined();
    expect(localStorage.getItem(dbName)).toBeNull();
  });
});

describe("RgxRepositoryDirective", () => {
  const buildRepository = () => ({
    read: jest.fn().mockResolvedValue({ id: "1", name: "A" }),
    delete: jest.fn().mockResolvedValue({ id: "1" }),
    deleteAll: jest.fn().mockResolvedValue([{ id: "1" }]),
    query: jest.fn().mockResolvedValue([{ id: "1", name: "A" }]),
    create: jest.fn().mockResolvedValue({ id: "1" }),
    update: jest.fn().mockResolvedValue({ id: "1" }),
  });

  it("returns no repository when the model cannot be resolved", () => {
    const directive = new RgxRepositoryDirective("UnregisteredDirectiveModel");
    expect(directive.repository).toBeUndefined();
    expect(directive.from).toBeInstanceOf(Function);
  });

  it("reads through an attached repository", async () => {
    const repository = buildRepository();
    const directive = new RgxRepositoryDirective().from(repository as never);
    await expect(directive.read("1")).resolves.toEqual({ id: "1", name: "A" });
    expect(repository.read).toHaveBeenCalledWith("1");
  });

  it("deletes single ids and arrays of ids or records", async () => {
    const repository = buildRepository();
    const directive = new RgxRepositoryDirective().from(repository as never);

    await directive.delete("1", "id");
    expect(repository.delete).toHaveBeenCalledWith("1");

    await directive.delete([{ id: "2" }, { id: "3" }] as never, "id");
    expect(repository.deleteAll).toHaveBeenCalledWith(["2", "3"]);

    await directive.delete(["4", "5"], "id");
    expect(repository.deleteAll).toHaveBeenLastCalledWith(["4", "5"]);
  });

  it("queries with the configured condition and paging defaults", async () => {
    const repository = buildRepository();
    const directive = new RgxRepositoryDirective().from(repository as never);
    directive.filterBy = "name";
    directive.modelId = "A";
    directive.limit = 7;

    await expect(directive.query()).resolves.toEqual([{ id: "1", name: "A" }]);
    const [condition, orderBy, direction, limit, offset] =
      repository.query.mock.calls[0];
    expect(condition).toBeInstanceOf(Condition);
    expect(orderBy).toBe("id");
    expect(direction).toBe(OrderDirection.ASC);
    expect(limit).toBe(7);
    expect(offset).toBe(0);
  });

  it("paginates from a page number into a query offset", async () => {
    const repository = buildRepository();
    const directive = new RgxRepositoryDirective().from(repository as never);

    await expect(
      directive.paginate(undefined, "id", OrderDirection.DSC, 3, 5)
    ).resolves.toEqual({
      data: [{ id: "1", name: "A" }],
      paginator: { page: 3, limit: 5 },
    });
    expect(repository.query.mock.calls[0][3]).toBe(5);
    expect(repository.query.mock.calls[0][4]).toBe(10);
    expect(repository.query.mock.calls[0][2]).toBe(OrderDirection.DSC);
  });

  it("refreshes the cached query from the repository", async () => {
    const repository = buildRepository();
    const directive = new RgxRepositoryDirective().from(repository as never);
    await directive.refresh();
    expect((directive as unknown as { _query: unknown[] })._query).toEqual([
      { id: "1", name: "A" },
    ]);
  });

  it("re-initializes when the model is replaced", () => {
    const directive = new RgxRepositoryDirective();
    directive.setModel("UnregisteredDirectiveModel");
    expect(directive.repository).toBeUndefined();
    expect(directive.model).toBe("UnregisteredDirectiveModel");
  });
});
