// Accessibility audit: runs axe-core (WCAG 2.0 and 2.1, levels A and AA) against each
// page in a real browser, after the page has rendered, and fails on any violation.
// Usage: node e2e/a11y.mjs   (BASE_URL and CHROME_PATH are read from the environment)
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AXE_SOURCE = readFileSync(
  new URL("../node_modules/axe-core/axe.min.js", import.meta.url),
  "utf8"
);
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 2500);

const pages = [
  { name: "home", path: "/" },
  { name: "search", path: "/search" },
  { name: "search results", path: "/search?q=hoodie" },
  { name: "product", path: "/products/black-canvas-tote-bag" },
  { name: "not found", path: "/products/nope-zz" },
  { name: "cart", path: "/cart" },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox"],
});
let failures = 0;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Put one item in the cart first so the cart page is audited with content.
  await page.goto(`${BASE}/products/black-canvas-tote-bag`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, SETTLE_MS));
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === "Add to Cart")
      ?.click();
  });
  await new Promise((r) => setTimeout(r, SETTLE_MS));

  for (const target of pages) {
    await page.goto(`${BASE}${target.path}`, { waitUntil: "load" });
    await new Promise((r) => setTimeout(r, SETTLE_MS));

    await page.addScriptTag({ content: AXE_SOURCE });
    const audit = await page.evaluate(async () => {
      const run = await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
      const violations = run.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        sample: v.nodes[0]?.target?.join(" ") ?? "",
      }));
      return { violations, rulesPassed: run.passes.length };
    });
    const result = audit.violations;

    if (result.length === 0) {
      console.log(`PASS  ${target.name} (${target.path})  ${audit.rulesPassed} rules passed`);
    } else {
      failures += 1;
      console.log(`FAIL  ${target.name} (${target.path})`);
      for (const violation of result) {
        console.log(
          `      ${violation.impact}: ${violation.id} (${violation.nodes} node${violation.nodes === 1 ? "" : "s"}) - ${violation.help}`
        );
        console.log(`        e.g. ${violation.sample}`);
      }
    }
  }
  // Keyboard reachability: the main controls must be reachable with the Tab key alone.
  const keyboardChecks = [
    { name: "search input", path: "/search", match: "search-query" },
    { name: "Add to Cart", path: "/products/black-canvas-tote-bag", match: "Add to Cart" },
    { name: "cart link", path: "/", match: "/cart" },
  ];

  for (const check of keyboardChecks) {
    await page.goto(`${BASE}${check.path}`, { waitUntil: "load" });
    await new Promise((r) => setTimeout(r, SETTLE_MS));

    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate((match) => {
        const el = document.activeElement;
        if (!el) return false;
        return (
          el.id === match || el.textContent?.trim() === match || el.getAttribute("href") === match
        );
      }, check.match);
    }
    if (reached) {
      console.log(`PASS  keyboard reaches ${check.name}`);
    } else {
      failures += 1;
      console.log(`FAIL  keyboard cannot reach ${check.name}`);
    }
  }
} finally {
  await browser.close();
}

console.log(
  failures === 0
    ? "\naccessibility: all pages passed"
    : `\naccessibility: ${failures} page(s) with violations`
);
process.exit(failures === 0 ? 0 : 1);
