import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  asLength,
  dateFromString,
  getByPath,
  getMenuIcon,
  isNumber,
  isValidBase64,
  stripHTML,
} from "../../src/lib/utils/helpers";
import { modelBuilderStructuredDefinitionOf } from "../../src/lib/utils/structured-output";
import { truncate, sanitizeHtml } from "../../src/lib/pipes/truncate";
import { safeHtml } from "../../src/lib/pipes/safe-html";
import { translate } from "../../src/lib/pipes/translate";
import { I18nLoader } from "../../src/lib/i18n/Loader";
import { I18nFakeLoader } from "../../src/lib/i18n/FakeLoader";
import { RgxTranslateService } from "../../src/lib/services/RgxTranslateService";
import { RgxRouterService } from "../../src/lib/services/RgxRouterService";
import { getRgxSpinner } from "../../src/lib/utils/RgxSpinner";
import { getRgxToast } from "../../src/lib/utils/RgxToast";
import {
  RgxI18nProvider,
  useTranslate,
} from "../../src/lib/services/RgxContext";

describe("helpers", () => {
  it("parses dates without time using local midnight", () => {
    expect(dateFromString("2024-01-02") instanceof Date).toBe(true);
  });

  it("detects base64 payloads and data urls", () => {
    expect(isValidBase64("aGVsbG8=")).toBe(true);
    expect(isValidBase64("data:image/png;base64,aGVsbG8=")).toBe(true);
    expect(isValidBase64("not valid!")).toBe(false);
  });

  it("strips html and normalizes counts", () => {
    expect(stripHTML("<b>Hello</b>")).toBe("Hello");
    expect(asLength([1, 2, 3])).toBe(3);
    expect(asLength(7)).toBe(7);
    expect(asLength(undefined)).toBe(0);
  });

  it("resolves nested paths and numeric strings", () => {
    expect(getByPath({ a: { b: 2 } }, "a.b")).toBe(2);
    expect(getByPath({ a: {} }, "a.c")).toBeUndefined();
    expect(isNumber("42")).toBe(true);
    expect(isNumber("")).toBe(false);
  });

  it("finds menu icons by label", () => {
    expect(getMenuIcon("Home", [{ label: "Home", icon: "ti-home" }])).toBe(
      "ti-home"
    );
  });
});

describe("pipes", () => {
  it("truncates sanitized text", () => {
    expect(truncate("<b>Hello</b> world", 5)).toBe("Hello...");
    expect(sanitizeHtml("<b>Hello</b>")).toBe("Hello");
  });

  it("returns dangerouslySetInnerHTML payloads", () => {
    expect(safeHtml("<b>x</b>")).toEqual({ __html: "<b>x</b>" });
  });

  it("translates through the loader cache", () => {
    I18nLoader.cache["en"] = { HELLO: "Hello" };
    expect(translate("HELLO")).toBe("Hello");
    expect(translate("MISSING")).toBe("MISSING");
  });
});

describe("structured output", () => {
  it("parses persisted definitions", () => {
    expect(
      modelBuilderStructuredDefinitionOf({ model: "User", instructions: "" })
    ).toEqual({ model: "User", instructions: "" });
    expect(
      modelBuilderStructuredDefinitionOf('{"model":"User"}')
    ).toEqual({ model: "User" });
    expect(modelBuilderStructuredDefinitionOf("not json")).toBeNull();
    expect(modelBuilderStructuredDefinitionOf({ instructions: "" })).toBeNull();
  });
});

describe("translate service", () => {
  it("interpolates params and falls back to keys", () => {
    I18nLoader.cache["en"] = {
      component: { pagination: { page: "Page {0}" } },
    };
    const service = new RgxTranslateService("en", "en");
    expect(service.instant("component.pagination.page", "2")).toBe("Page 2");
    expect(service.instant("unknown.key")).toBe("unknown.key");
  });

  it("tracks locale changes and notifies subscribers", () => {
    I18nLoader.cache["en"] = { HELLO: "Hello" };
    I18nLoader.cache["pt"] = { HELLO: "Olá" };
    const service = new RgxTranslateService("en", "en");
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);
    service.use("pt");
    expect(service.getCurrentLang()).toBe("pt");
    expect(service.instant("HELLO")).toBe("Olá");
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("integrates with the i18n loader and React context", async () => {
    const Available = () => {
      const t = useTranslate();
      return <span>{t("HELLO")}</span>;
    };
    render(
      <RgxI18nProvider
        lang="en"
        loader={new I18nFakeLoader() as unknown as I18nLoader}
      >
        <Available />
      </RgxI18nProvider>
    );
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());
  });
});

describe("router service", () => {
  it("parses query params and navigates with the history api", async () => {
    window.history.pushState({}, "", "/users?name=Jane&page=2");
    const router = new RgxRouterService();
    expect(router.hasQueryParam("name")).toBe(true);
    expect(router.getQueryParamValue("page")).toBe("2");
    expect(router.getQueryParam("name")).toEqual({ name: "Jane" });
    await router.navigate("/other");
    expect(router.getCurrentUrl()).toBe("other");
    router.backToLastPage();
  });
});

describe("spinner and toast", () => {
  it("shows, updates, and removes a spinner overlay", async () => {
    const spinner = getRgxSpinner();
    await spinner.show("Loading");
    expect(spinner.isVisible()).toBe(true);
    expect(await spinner.getMessage()).toBe("Loading");
    await spinner.update("Half", 50);
    expect(document.querySelector(".dcf-spinner-overlay")).toBeTruthy();
    await spinner.remove();
    expect(spinner.isVisible()).toBe(false);
  });

  it("renders toasts and resolves a role", async () => {
    jest.useFakeTimers();
    const toast = getRgxToast({ duration: 10 });
    const promise = toast.success("Saved");
    expect(document.querySelector(".dcf-toast")).toBeTruthy();
    jest.advanceTimersByTime(6000);
    await expect(promise).resolves.toBe("dismiss");
    jest.useRealTimers();
  });
});
