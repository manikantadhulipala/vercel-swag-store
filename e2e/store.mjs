// End-to-end check of the Swag Store cart and search in a real Chrome.
// Run against the stable mock scenario (see run.mjs), so stock is deterministic.
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.setDefaultTimeout(20000);
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(err.message));

async function badgeCount() {
  return page.evaluate(() => {
    const link = document.querySelector('a[href="/cart"]');
    const match = link?.getAttribute("aria-label")?.match(/Cart, (\d+) items?/);
    return match ? Number(match[1]) : 0;
  });
}

try {
  // 1. Product page loads with price, stock, and Add to Cart
  await page.goto(`${BASE}/products/black-canvas-tote-bag`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, Number(process.env.SETTLE_MS ?? 1500)));
  const h1 = await page.$eval("h1", (el) => el.textContent);
  check("product page renders name", h1 === "Black Canvas Tote Bag", h1);
  const priceText = await page.$eval("h1 + p", (el) => el.textContent);
  check("price formatted as currency", priceText.includes("$30.00"), priceText);

  // 2. Quantity selector: increment to 2, then Add to Cart
  await page.click('button[aria-label="Increase quantity"]');
  const qty = await page.$eval("#quantity", (el) => el.value);
  check("quantity selector increments", qty === "2", qty);

  const cartBefore = await badgeCount();
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "Add to Cart")
      .click();
  });
  try {
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[role="status"]')].some((e) =>
          e.textContent.includes("Added")
        ),
      { timeout: 8000 }
    );
  } catch (e) {
    console.log(
      "STATUS_DEBUG",
      await page.evaluate(() =>
        [...document.querySelectorAll('[role="status"],[role="alert"]')].map((x) => x.textContent)
      )
    );
    throw e;
  }
  check("Add to Cart shows success", true);

  // Badge updates after the server action revalidates the layout
  await page
    .waitForFunction(
      () => {
        const label = document.querySelector('a[href="/cart"]')?.getAttribute("aria-label") ?? "";
        return label.startsWith("Cart, 2 items");
      },
      { timeout: 20000 }
    )
    .catch(() => {});
  const badgeAfter = await badgeCount();
  check(
    "cart badge shows 2 after adding 2",
    badgeAfter === 2,
    `before=${cartBefore} after=${badgeAfter}`
  );

  // 3. Cart page lists the item with line total and subtotal
  await page.goto(`${BASE}/cart`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, Number(process.env.SETTLE_MS ?? 1500)));
  const rowName = await page
    .$eval("ul li a[href='/products/black-canvas-tote-bag']", (el) => el.textContent)
    .catch(() => null);
  check("cart lists the added product", rowName === "Black Canvas Tote Bag", rowName ?? "missing");
  const subtotal = await page.evaluate(() => {
    const row = [...document.querySelectorAll("aside div")].find((d) =>
      d.textContent.includes("Subtotal")
    );
    return row ? row.textContent : "";
  });
  check("subtotal is $60.00 for 2 totes", subtotal.includes("$60.00"), subtotal.trim());

  // 4. Increase quantity via the + button
  await page.evaluate(() =>
    document.querySelector('button[aria-label="Increase quantity"]').click()
  );
  await page.waitForFunction(
    () => document.querySelector('span[aria-live="polite"]')?.textContent === "3",
    { timeout: 20000 }
  );
  check("cart quantity increases to 3", true);

  // 5. Persists across reload (same browser session)
  await page.reload({ waitUntil: "load" });
  await new Promise((r) => setTimeout(r, Number(process.env.SETTLE_MS ?? 1500)));
  const persisted = await page.$eval('span[aria-live="polite"]', (el) => el.textContent);
  check("cart persists after reload", persisted === "3", persisted);

  // 6. Remove item
  await page.evaluate(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Remove").click()
  );
  await page.waitForFunction(() => document.body.textContent.includes("Your cart is empty"), {
    timeout: 20000,
  });
  check("remove empties the cart", true);

  // 7. Search: 3-char debounce, results, clearing resets
  await page.goto(`${BASE}/search`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, Number(process.env.SETTLE_MS ?? 1500)));
  await page.type("#search-query", "ho");
  await new Promise((r) => setTimeout(r, 800));
  check("no search below 3 characters", !page.url().includes("q="), page.url());
  await page.type("#search-query", "odie");
  await page.waitForFunction(() => location.search.includes("q=hoodie"), { timeout: 10000 });
  check("debounced search updates URL after 3+ chars", true, page.url());
  await page.waitForFunction(() => document.body.textContent.includes("Showing"), {
    timeout: 15000,
  });
  check("results render for hoodie", true);

  await page.click("#search-query", { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page
    .waitForFunction(() => !location.search.includes("q="), { timeout: 10000 })
    .catch(() => {});
  check("clearing input clears stale search", !page.url().includes("q="), page.url());

  // 8. Out-of-stock and invalid product handling
  const missing = await page.goto(`${BASE}/products/nope-not-real`, { waitUntil: "load" });
  check("unknown product returns 404", missing.status() === 404, String(missing.status()));
} catch (error) {
  check("script completed without exceptions", false, error.message);
} finally {
  check("no uncaught page errors", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
