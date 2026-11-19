/**
 * SAA-2010 — `/kanban` accessibility semantics and real pointer drag.
 *
 * Covers the region/list/listitem contract, the keyboard-help reference, the
 * polite live region, the `:focus-visible` ring and an actual pointer drag
 * from the card handle across columns.
 */
import { expect, test } from "@playwright/test";
import {
  cardIds,
  column,
  dragHandleTo,
  dropzone,
  lastEvent,
  openKanban,
  resetBoard,
  tabToFirstCard,
} from "./kanban-helpers";

const KEYBOARD_HELP =
  "Press Space to pick up a card, use the arrow keys to move it, press Enter to select or drop, press Enter again to edit, press E to edit, and Escape to cancel or clear the selection.";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openKanban(page);
});

test.afterEach(async ({ page }) => {
  await resetBoard(page).catch(() => undefined);
});

test("exposes a named board region and labelled column lists", async ({
  page,
}) => {
  const board = page.getByRole("region", { name: "Sprint board" });
  await expect(board).toBeVisible();

  const expected: Array<[string, string]> = [
    ["todo", "To do"],
    ["doing", "In progress"],
    ["review", "Review"],
    ["done", "Done"],
  ];
  for (const [columnId, title] of expected) {
    const section = column(page, columnId);
    await expect(section).toHaveAttribute("role", "group");
    const heading = section.locator(".dcf-kanban-column__title");
    await expect(heading).toHaveText(title);
    const headingId = await heading.getAttribute("id");
    const list = section.locator(".dcf-kanban-column__dropzone");
    await expect(list).toHaveAttribute("role", "list");
    await expect(list).toHaveAttribute("aria-labelledby", headingId as string);
    await expect(
      page.getByRole("list", { name: title })
    ).toBeVisible();
  }
});

test("labels every card listitem with title, column and position", async ({
  page,
}) => {
  await expect(
    page.getByRole("listitem", {
      name: "Draft Kanban API contract, To do, position 1 of 3",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("listitem", {
      name: "Enforce WIP limits, In progress, position 2 of 2",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("listitem", {
      name: "Phase 2 bundle isolation, Done, position 1 of 1",
    })
  ).toBeVisible();
});

test("references the keyboard help through aria-describedby", async ({
  page,
}) => {
  const first = page.locator('[data-kanban-task-id="task-1"]');
  const describedBy = await first.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();

  const help = page.locator(`#${describedBy}`);
  await expect(help).toHaveText(KEYBOARD_HELP);
});

test("exposes the polite live region", async ({ page }) => {
  const live = page.locator(".dcf-kanban__live");
  await expect(live).toHaveAttribute("role", "status");
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toHaveAttribute("aria-atomic", "true");
  await expect(live).toHaveClass(/dcf-kanban__sr-only/);
});

test("shows a visible focus ring after keyboard navigation", async ({
  page,
}) => {
  await tabToFirstCard(page);

  const styles = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const computed = getComputedStyle(element);
    return {
      id: element.dataset["kanbanTaskId"],
      focusVisible: element.matches(":focus-visible"),
      boxShadow: computed.boxShadow,
      outline: computed.outlineStyle,
    };
  });

  expect(styles.id).toBeTruthy();
  expect(styles.focusVisible).toBe(true);
  expect(styles.boxShadow).not.toBe("none");
});

test("pointer drag across columns emits taskMoved and moves the card", async ({
  page,
}) => {
  await dragHandleTo(page, "task-1", dropzone(page, "done"), {
    targetY: "middle",
  });

  await expect(lastEvent(page)).toContainText("taskMoved: task-1 -> done");
  await expect(
    page.locator('[data-column-id="done"] [data-kanban-task-id="task-1"]')
  ).toBeVisible();
  await expect(cardIds(page, "done")).toHaveCount(2);
  await expect(cardIds(page, "todo")).toHaveCount(2);
});
