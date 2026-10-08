import { defineConfig } from "@playwright/test";
const previewURL = `http://127.0.0.1:8082${process.env.WEB_BASE_PATH || ""}/`;
const previewDirectory = process.env.MOBILE_PREVIEW_DIR || "mobile/dist";
const quotedDirectory = `'${previewDirectory.replace(/'/g, "'\\''")}'`;
export default defineConfig({
  testDir: "./tests/mobile-browser",
  workers: 1,
  use: {
    baseURL: previewURL,
    viewport: { width: 390, height: 844 },
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: `python3 -m http.server 8082 --bind 127.0.0.1 --directory ${quotedDirectory}`,
    url: previewURL,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
