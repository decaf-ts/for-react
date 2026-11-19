import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/*
 * Minimal Playwright harness for the for-react demo app.
 *
 * The demo is served by Vite on port 8111 (see vite.config.ts). Downstream
 * export links (kanban, graph, ...) can add specs under tests/playwright and
 * reuse this config unchanged.
 *
 * The Paperclip CI sandbox has no /etc/fonts configuration, so Skia cannot
 * resolve fonts and Chromium crashes with
 * `SkFontMgr_FontConfigInterface: Not implemented`. Only apply the fontconfig
 * workaround in that environment (detected by the sandbox flag or the sandbox's
 * own fontconfig file); all other environments are unaffected.
 */
const needsSandboxFontConfig =
  !!process.env["PAPERCLIP_SANDBOX"] ||
  existsSync("/paperclip/.config/fontconfig/fonts.conf");

const PORT = Number(process.env["FOR_REACT_E2E_PORT"] || 8111);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    ...(needsSandboxFontConfig
      ? {
          launchOptions: {
            env: {
              ...process.env,
              FONTCONFIG_FILE: "/paperclip/.config/fontconfig/fonts.conf",
              FONTCONFIG_PATH: "/paperclip/.config/fontconfig",
            },
          },
        }
      : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host localhost --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
