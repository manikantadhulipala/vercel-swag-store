// Browser checks for edge cases, run against the mock API (see mock-api.mjs).
// Usage: node e2e/scenarios.mjs <out-of-stock|low-stock|expired-cart>
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const scenario = process.argv[2];

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const settle = () =>
  new Promise((resolve) => setTimeout(resolve, Number(process.env.SETTLE_MS ?? 2500)));

async function clickButtonByText(page, text) {
  await page.evaluate((label) => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === label
    );
    button?.click();
  }, text);
}

async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction((t) => document.body.textContent.includes(t), { timeout }, text);
}

async function outOfStock(page) {
  await page.goto(`${BASE}/products/black-canvas-tote-bag`, { waitUntil: "load" });
  await settle();
  await waitForText(page, "Out of stock");
  check("out-of-stock: stock indicator says Out of stock", true);

  const addDisabled = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Add to Cart"
    );
    return button?.disabled === true;
  });
  check("out-of-stock: Add to Cart is disabled", addDisabled);

  const qtyDisabled = await page.$eval("#quantity", (el) => el.disabled);
  check("out-of-stock: quantity input is disabled", qtyDisabled);
}

async function lowStock(page) {
  await page.goto(`${BASE}/products/black-canvas-tote-bag`, { waitUntil: "load" });
  await settle();
  await waitForText(page, "Only 2 left in stock");
  check("low-stock: shows the low-stock message", true);

  for (let i = 0; i < 3; i += 1) {
    await page.evaluate(() =>
      document.querySelector('button[aria-label="Increase quantity"]')?.click()
    );
    await settle();
  }
  const capped = await page.$eval("#quantity", (el) => el.value);
  check("low-stock: quantity cannot exceed available stock", capped === "2", `quantity=${capped}`);

  await clickButtonByText(page, "Add to Cart");
  await waitForText(page, "Added 2 to your cart.");
  check("low-stock: adding the available 2 succeeds", true);

  await clickButtonByText(page, "Add to Cart");
  await waitForText(page, "You already have all available stock in your cart.");
  check("low-stock: second add is refused on the server", true);
}

async function expiredCart(page) {
  await page.goto(BASE, { waitUntil: "load" });
  await page.setCookie({
    name: "swag_cart_token",
    value: "00000000-0000-4000-8000-000000000000",
    url: BASE,
  });

  await page.goto(`${BASE}/cart`, { waitUntil: "load" });
  await settle();
  await waitForText(page, "Your cart is empty");
  check("expired-cart: unknown cart shows the empty cart without crashing", true);

  await page.goto(`${BASE}/products/black-canvas-tote-bag`, { waitUntil: "load" });
  await settle();
  await clickButtonByText(page, "Add to Cart");
  await waitForText(page, "Your cart has expired. Please try again.");
  check("expired-cart: add to cart reports the expiry", true);

  const cookies = await page.cookies(BASE);
  const token = cookies.find((c) => c.name === "swag_cart_token");
  check("expired-cart: the stale cart cookie is cleared", !token, token ? token.value : "none");
}

// The catalog API is down. Pages should show a recoverable error inside the store
// layout, not a blank page or a stack trace.
async function apiDown(page) {
  await page.goto(BASE, { waitUntil: "load" });
  await settle();
  await waitForText(page, "We could not load this page.");
  check("api-down: home shows the recoverable error message", true);

  const headerVisible = await page.$eval("header", () => true).catch(() => false);
  check("api-down: store header stays on screen", headerVisible);

  const retry = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Try again")
  );
  check("api-down: a Try again button is offered", retry);

  await page.goto(`${BASE}/products/black-canvas-tote-bag`, { waitUntil: "load" });
  await settle();
  await waitForText(page, "We could not load this page.");
  check("api-down: product page shows the same recoverable error", true);
}

const runners = {
  "out-of-stock": outOfStock,
  "low-stock": lowStock,
  "expired-cart": expiredCart,
  "api-down": apiDown,
};

if (!runners[scenario]) {
  console.error(`Usage: node e2e/scenarios.mjs <${Object.keys(runners).join("|")}>`);
  process.exit(2);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await runners[scenario](page);
} catch (error) {
  check(`${scenario}: completed without exceptions`, false, error.message);
} finally {
  check(`${scenario}: no uncaught page errors`, pageErrors.length === 0, pageErrors[0] ?? "");
  await browser.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${scenario}: ${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
