import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEO_PAGES, SITE_ORIGIN } from "./seo-pages.mjs";

const root = resolve(import.meta.dirname, "..");
const failures = [];
const titles = new Map();
const descriptions = new Map();
const sitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");

function capture(html, expression) {
  return html.match(expression)?.[1]?.replace(/\s+/g, " ").trim() || "";
}

for (const page of SEO_PAGES) {
  const file = resolve(root, page.file);
  if (!existsSync(file)) {
    failures.push(`${page.path}: source file ${page.file} is missing`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const title = capture(html, /<title>([\s\S]*?)<\/title>/i);
  const description = capture(html, /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?\s*>/i);
  const canonical = capture(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const h1 = capture(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "");
  const expectedCanonical = `${SITE_ORIGIN}${page.path}`;

  if (!title) failures.push(`${page.path}: title is missing`);
  if (!description) failures.push(`${page.path}: meta description is missing or attributes are out of the supported order`);
  if (canonical !== expectedCanonical) failures.push(`${page.path}: canonical must be ${expectedCanonical}`);
  if (!h1) failures.push(`${page.path}: visible H1 is missing`);
  if (!sitemap.includes(`<loc>${expectedCanonical}</loc>`)) failures.push(`${page.path}: URL is absent from sitemap.xml`);
  if (titles.has(title)) failures.push(`${page.path}: duplicate title also used by ${titles.get(title)}`);
  if (descriptions.has(description)) failures.push(`${page.path}: duplicate description also used by ${descriptions.get(description)}`);
  titles.set(title, page.path);
  descriptions.set(description, page.path);

  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const structuredData = JSON.parse(match[1]);
      const nodes = structuredData["@graph"] || [structuredData];
      for (const node of nodes) {
        if (node?.["@type"] !== "FAQPage") continue;
        for (const question of node.mainEntity || []) {
          const name = String(question?.name || "").trim();
          const answer = String(question?.acceptedAnswer?.text || "").trim();
          if (!name || !visibleText.includes(name)) failures.push(`${page.path}: FAQ structured-data question is not visible: ${name || "<empty>"}`);
          if (!answer || !visibleText.includes(answer)) failures.push(`${page.path}: FAQ structured-data answer is not visible for: ${name || "<empty>"}`);
        }
      }
    } catch (error) {
      failures.push(`${page.path}: invalid JSON-LD (${error.message})`);
    }
  }
}

const sitemapLocs = [...sitemap.matchAll(/<loc>(https:\/\/yourrulesgame\.ru\/[^<]*)<\/loc>/g)]
  .map((match) => match[1])
  .filter((url) => !url.includes("/images/"));
if (new Set(sitemapLocs).size !== SEO_PAGES.length) failures.push("sitemap.xml contains missing or duplicate canonical page URLs");

const robots = readFileSync(resolve(root, "public/robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)) failures.push("robots.txt does not advertise the canonical sitemap");
if (!robots.includes("User-agent: Yandex")) failures.push("robots.txt has no explicit Yandex policy");

if (failures.length) {
  console.error(`SEO validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO validation passed for ${SEO_PAGES.length} public pages.`);
