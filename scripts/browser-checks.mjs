import { chromium } from "playwright";
import verifyLayout from "../tests/layout.browser.js";
import verifyDraftAndResults from "../tests/draft.browser.js";
const baseURL = process.env.CODEMON_TEST_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({
  channel: process.env.CODEMON_BROWSER_CHANNEL,
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log("Layout:", await verifyLayout(page, baseURL));
  console.log(
    "Drafts and judging:",
    await verifyDraftAndResults(page, baseURL),
  );
} finally {
  await browser.close();
}
