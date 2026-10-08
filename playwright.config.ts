import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const database = join(
  mkdtempSync(join(tmpdir(), "nabdh-browser-")),
  "cms.sqlite",
);
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100/setup",
    reuseExistingServer: false,
    env: {
      CMS_DB_PATH: database,
      CMS_DEVICE_API_KEY: "test-only-device-api-key-32-characters-long",
    },
    timeout: 60000,
  },
});
