import { getWorkspaceTarget, loadWorkspaceModule } from "../workspace-target";

type Api = typeof import("../../src/lib/public-apis");

const target = getWorkspaceTarget();

describe(`public api surface (${target})`, () => {
  let api: Api;

  beforeAll(async () => {
    api = (await loadWorkspaceModule()) as unknown as Api;
  });

  it("exports the complete component surface", () => {
    const components = [
      "RgxCard",
      "RgxComponentRenderer",
      "RgxContainer",
      "RgxCrudField",
      "RgxCrudForm",
      "RgxDashboard",
      "RgxEmptyState",
      "RgxFieldset",
      "RgxFileUpload",
      "RgxFilter",
      "RgxIcon",
      "RgxLayout",
      "RgxList",
      "RgxListItem",
      "RgxModal",
      "RgxModalConfirm",
      "RgxModelBuilder",
      "RgxModelRenderer",
      "RgxPagination",
      "RgxSearchbar",
      "RgxSteppedForm",
      "RgxTable",
      "registerDefaultComponents",
    ];
    components.forEach((name) => {
      expect((api as unknown as Record<string, unknown>)[name]).toBeDefined();
    });
  });

  it("exports engine, services, pipes, and utils", () => {
    const surface = [
      "RgxRenderingEngine",
      "RgxFormService",
      "RgxComponentRegistry",
      "RgxComponentDirective",
      "RgxFormDirective",
      "RgxParentComponentDirective",
      "RgxRenderableComponentDirective",
      "RgxFormFieldDirective",
      "RgxPageDirective",
      "RgxModelPageDirective",
      "RgxRepositoryDirective",
      "ValidatorFactory",
      "RgxEventEmitter",
      "SessionRamAdapter",
      "DecafAxiosHttpAdapter",
      "RgxMediaService",
      "RgxTranslateService",
      "RgxRouterService",
      "RgxServicesProvider",
      "RgxI18nProvider",
      "useTranslate",
      "useRgxTranslateService",
      "useRgxRouterService",
      "I18nLoader",
      "I18nFakeLoader",
      "safeHtml",
      "translate",
      "truncate",
      "RgxTooltip",
      "RgxSpinner",
      "RgxToast",
      "getRgxSpinner",
      "getRgxToast",
      "structured",
      "DecafFakerRepository",
      "provideDbAdapter",
      "getModelRepository",
      "provideDecafDbAdapter",
      "provideDecafDarkMode",
    ];
    const available = {
      ...api,
      structured: api.modelBuilderStructuredDefinitionOf,
    };
    surface.forEach((name) => {
      expect(
        (available as unknown as Record<string, unknown>)[name]
      ).toBeDefined();
    });
  });

  it("exports the for-angular helper parity functions", () => {
    [
      "getMenuIcon",
      "dateFromString",
      "isValidBase64",
      "stripHTML",
      "asLength",
      "getByPath",
      "isNumber",
      "itemMapper",
      "dataMapper",
      "cleanSpaces",
      "getLocaleContext",
      "getLocaleContextByKey",
    ].forEach((name) => {
      expect((api as unknown as Record<string, unknown>)[name]).toBeDefined();
    });
  });
});

describe(`engine parity (${target})`, () => {
  let api: Api;

  beforeAll(async () => {
    api = (await loadWorkspaceModule()) as unknown as Api;
  });

  it("exposes the session ram adapter flavour", () => {
    const adapter = new api.SessionRamAdapter({
      user: "test",
      dbName: "test-db",
    });
    expect(adapter).toBeInstanceOf(api.SessionRamAdapter);
    expect(api.SESSION_RAM_FLAVOUR).toBe("session");
  });

  it("returns no repository when the model is not registered", () => {
    expect(api.getModelAndRepository("UnregisteredModel")).toBeUndefined();
  });

  it("normalizes an empty repository directive", async () => {
    const directive = new api.RgxRepositoryDirective();
    expect(directive.repository).toBeUndefined();
    await expect(directive.query()).resolves.toEqual([]);
    await expect(directive.paginate()).resolves.toEqual({ data: [] });
  });

  it("resolves the window-backed adapter flavour", () => {
    (window as unknown as Record<string, unknown>)["DB_ADAPTER_PROVIDER"] =
      "session";
    expect(api.getDbAdapterFlavour()).toBe("session");
  });

  it("exposes bookmark and statement URL rewriting", () => {
    const adapter = new api.DecafAxiosHttpAdapter();
    expect(
      adapter.parseStatementURL("http://api/users/statement/find/asc")
    ).toBe("http://api/users/find?direction=asc");
    expect(api.DecafAxiosHttpAdapter.getEventHeaders()).toEqual({});
  });
});
