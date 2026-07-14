import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INDEXNOW_KEY, SEO_PAGES, SITE_ORIGIN } from "./seo-pages.mjs";

const root = resolve(import.meta.dirname, "..");
const keyLocation = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;

function changedFiles() {
  if (process.env.INDEXNOW_ALL === "1") return null;
  try {
    return execFileSync("git", ["diff", "--name-only", "HEAD^", "HEAD"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

const changed = changedFiles();
const keyWasAdded = !changed || changed.includes(`public/${INDEXNOW_KEY}.txt`);
const selected = keyWasAdded
  ? SEO_PAGES
  : SEO_PAGES.filter((page) => changed.includes(page.file) || (page.path === "/" && changed.some((file) => file === "index.html" || file.startsWith("src/"))));
const urlList = [...new Set(selected.map((page) => `${SITE_ORIGIN}${page.path}`))];

if (!urlList.length) {
  console.log("IndexNow: no public page content changed; nothing to submit.");
  process.exit(0);
}

if (process.env.INDEXNOW_DRY_RUN === "1") {
  console.log(`IndexNow dry run: ${urlList.join(", ")}`);
  process.exit(0);
}

const keyFile = readFileSync(resolve(root, `public/${INDEXNOW_KEY}.txt`), "utf8").trim();
if (keyFile !== INDEXNOW_KEY) throw new Error("IndexNow key file is invalid");

const payload = { host: "yourrulesgame.ru", key: INDEXNOW_KEY, keyLocation, urlList };
const endpoints = ["https://yandex.com/indexnow"];

for (const endpoint of endpoints) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow submission to ${endpoint} failed with HTTP ${response.status}`);
  }
  console.log(`IndexNow accepted ${urlList.length} changed URL(s) at ${endpoint}: HTTP ${response.status}.`);
}
