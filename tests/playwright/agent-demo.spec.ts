/**
 * SAA-2094 coverage requirement 4 — the `/agent` demo route.
 *
 * Drives the deterministic `AgentChatFakeTransport` end to end through the
 * real demo shell: send (suggestion and keyboard), stream, cancel, attachments,
 * slash commands, model and visibility selectors. Replay/resume is not exposed
 * by the demo UI; it is covered at the transport seam by the Jest suites.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

const COMPLETION_TEXT = /Three orders are on file, the shipment is in transit/;
const APPROVAL_TEXT = /Approve sending this summary to the customer\?/;

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function openAgent(page: Page): Promise<void> {
  await page.goto("/agent");
  await expect(page.locator(".dcf-agent-chat")).toBeVisible();
  await expect(
    page.locator(".dcf-agent-chat").getByRole("heading", { name: "Agent chat" })
  ).toBeVisible();
}

function chat(page: Page): Locator {
  return page.locator(".dcf-agent-chat");
}

function composer(page: Page): Locator {
  return page.getByLabel("Type a message…");
}

async function sendSuggestion(page: Page, text: string): Promise<void> {
  await chat(page).getByRole("button", { name: text }).click();
  await expect(
    chat(page).locator(".dcf-chat-message--user", { hasText: text })
  ).toBeVisible();
}

test.describe("agent demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await openAgent(page);
  });

  test("renders the chat surface, history and demo panels", async ({ page }) => {
    const errors = trackErrors(page);

    await expect(
      chat(page).getByRole("heading", { name: "How can I help?" })
    ).toBeVisible();
    for (const suggestion of [
      "Show my recent orders",
      "Where is my shipment?",
      "What is the forecast for Lisbon?",
    ]) {
      await expect(
        chat(page).getByRole("button", { name: suggestion })
      ).toBeVisible();
    }
    await expect(
      page.locator(".dcf-agent-chat__history").getByText("Recent orders and shipment")
    ).toBeVisible();
    await expect(
      page.locator(".dcf-agent-chat__history").getByText("Lisbon forecast")
    ).toBeVisible();
    await expect(
      page.locator(".dcf-chat-attachment-input__trigger")
    ).toBeVisible();
    await expect(
      page.locator(".dcf-chat-visibility-selector [data-action=trigger]")
    ).toContainText("Private");

    await expect(
      page.getByRole("heading", { name: "Workflow", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tool results", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Telemetry", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Artifacts", exact: true })
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("streams a scripted roundtrip to completion", async ({ page }) => {
    const errors = trackErrors(page);

    await sendSuggestion(page, "Show my recent orders");
    await expect(
      chat(page).locator(".dcf-chat-message--streaming").first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(chat(page).locator(".dcf-chat-message--assistant")).toContainText(
      COMPLETION_TEXT,
      { timeout: 30_000 }
    );
    await expect(chat(page).locator(".dcf-chat-message--assistant")).toContainText(
      APPROVAL_TEXT,
      { timeout: 30_000 }
    );
    await expect(page.locator(".dcf-chat-message--streaming")).toHaveCount(0, {
      timeout: 30_000,
    });

    await expect(page.getByText("Understand the request").first()).toBeVisible();
    await expect(page.getByText("ORD-1042")).toBeVisible();
    await expect(page.getByText(/Roundtrip complete/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Approval required").first()).toBeVisible();
    await expect(page.locator(".dcf-chat-telemetry__run").first()).toHaveText(
      "demo-run-1"
    );

    expect(errors).toEqual([]);
  });

  test("cancels a streaming scripted response", async ({ page }) => {
    const errors = trackErrors(page);

    await sendSuggestion(page, "Where is my shipment?");
    const stop = chat(page).locator(".dcf-chat-composer [data-action=stop]");
    await expect(stop).toBeVisible({ timeout: 10_000 });
    await stop.click();

    await expect(
      page.getByText("The scripted response was cancelled.")
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      chat(page).locator(".dcf-chat-composer [data-action=send]")
    ).toBeVisible();
    await expect(
      chat(page).locator(".dcf-chat-message--streaming")
    ).toHaveCount(0, { timeout: 10_000 });

    expect(errors).toEqual([]);
  });

  test("attaches a file and sends it with the message", async ({ page }) => {
    const errors = trackErrors(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("handbook notes"),
    });
    await expect(page.getByText("notes.txt")).toBeVisible();
    await expect(page.getByText("14 B")).toBeVisible();

    await composer(page).fill("Summarize this file");
    await chat(page)
      .locator(".dcf-chat-composer [data-action=send]")
      .click();

    await expect(
      chat(page).locator(".dcf-chat-message--user", {
        hasText: "Summarize this file",
      })
    ).toBeVisible();
    await expect(
      chat(page).locator(".dcf-chat-message__attachments")
    ).toContainText("notes.txt");
    await expect(page.getByText("notes.txt")).toHaveCount(1);

    expect(errors).toEqual([]);
  });

  test("inserts slash commands from the list", async ({ page }) => {
    const errors = trackErrors(page);

    await composer(page).click();
    await composer(page).fill("/");
    const listbox = chat(page).getByRole("listbox", { name: "Slash commands" });
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole("option", { name: /summarize/ })).toBeVisible();

    await listbox.focus();
    await listbox.press("ArrowDown");
    await listbox.press("Enter");
    await expect(composer(page)).toHaveValue("/translate ");
    await expect(listbox).toHaveCount(0);

    await composer(page).fill("/sum");
    await chat(page).getByRole("option", { name: /summarize/ }).click();
    await expect(composer(page)).toHaveValue("/summarize ");

    expect(errors).toEqual([]);
  });

  test("selects a model and a visibility value", async ({ page }) => {
    const errors = trackErrors(page);

    const modelTrigger = page.locator(
      ".dcf-chat-model-selector [data-action=trigger]"
    );
    await modelTrigger.click();
    await page.getByRole("option", { name: /Fast agent/ }).click();
    await expect(modelTrigger).toContainText("Fast agent");

    const visibilityTrigger = page.locator(
      ".dcf-chat-visibility-selector [data-action=trigger]"
    );
    await expect(visibilityTrigger).toContainText("Private");
    await visibilityTrigger.click();
    await page.getByRole("option", { name: /Shared/ }).click();
    await expect(visibilityTrigger).toContainText("Shared");

    expect(errors).toEqual([]);
  });

  test("sends from the keyboard", async ({ page }) => {
    const errors = trackErrors(page);

    await composer(page).focus();
    await composer(page).fill("Keyboard message");
    await composer(page).press("Enter");
    await expect(
      chat(page).locator(".dcf-chat-message--user", {
        hasText: "Keyboard message",
      })
    ).toBeVisible();
    await expect(composer(page)).toHaveValue("");

    expect(errors).toEqual([]);
  });

  test("opens and closes popovers from the keyboard", async ({ page }) => {
    const errors = trackErrors(page);

    const modelTrigger = page.locator(
      ".dcf-chat-model-selector [data-action=trigger]"
    );
    await modelTrigger.focus();
    await modelTrigger.press("Enter");
    await expect(page.getByRole("listbox", { name: "Model" })).toBeVisible();
    await page.getByRole("searchbox").press("Escape");
    await expect(page.getByRole("listbox", { name: "Model" })).toHaveCount(0);

    const visibilityTrigger = page.locator(
      ".dcf-chat-visibility-selector [data-action=trigger]"
    );
    await visibilityTrigger.focus();
    await visibilityTrigger.press("Enter");
    await expect(
      page.getByRole("listbox", { name: "Conversation visibility" })
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("listbox", { name: "Conversation visibility" })
    ).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});
