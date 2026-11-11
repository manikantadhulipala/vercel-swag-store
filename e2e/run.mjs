// Runs every browser check against a production build, with the API replaced by the
// mock in e2e/mock-api.mjs so each scenario is deterministic.
// Usage: pnpm build && pnpm test:e2e
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const APP_PORT = Number(process.env.APP_PORT ?? 3100);
const MOCK_PORT = Number(process.env.MOCK_PORT ?? 4010);
const BASE_URL = `http://localhost:${APP_PORT}`;
const MOCK_BASE = `http://localhost:${MOCK_PORT}/api`;

const jobs = [
  { scenario: "stable", test: ["e2e/store.mjs"] },
  { scenario: "out-of-stock", test: ["e2e/scenarios.mjs", "out-of-stock"] },
  { scenario: "low-stock", test: ["e2e/scenarios.mjs", "low-stock"] },
  { scenario: "expired-cart", test: ["e2e/scenarios.mjs", "expired-cart"] },
  { scenario: "api-down", test: ["e2e/scenarios.mjs", "api-down"] },
];

function start(command, args, env) {
  return spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitFor(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return; // any HTTP response means the server is listening
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function run(command, args, env) {
  return new Promise((resolve) => {
    const child = start(command, args, env);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => child.on("exit", resolve));
}

let failures = 0;

for (const job of jobs) {
  console.log(`\n=== ${job.scenario} ===`);
  const mock = start("node", ["e2e/mock-api.mjs"], {
    MOCK_PORT: String(MOCK_PORT),
    MOCK_SCENARIO: job.scenario,
  });
  const app = start("pnpm", ["exec", "next", "start", "-p", String(APP_PORT)], {
    SWAG_API_BASE_URL: MOCK_BASE,
  });

  try {
    await waitFor(`http://localhost:${MOCK_PORT}/`, 30000);
    await waitFor(`${BASE_URL}/`, 90000);
    const code = await run("node", [...job.test], { BASE_URL });
    if (code !== 0) failures += 1;
    console.log(`=== ${job.scenario}: ${code === 0 ? "passed" : "FAILED"} ===`);
  } catch (error) {
    failures += 1;
    console.error(`=== ${job.scenario}: could not run (${error.message}) ===`);
  } finally {
    await stop(app);
    await stop(mock);
  }
}

console.log(
  failures === 0 ? "\nAll browser scenarios passed." : `\n${failures} scenario group(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
