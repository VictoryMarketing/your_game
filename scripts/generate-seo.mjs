import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEO_PAGES, SITE_ORIGIN } from "./seo-pages.mjs";

const root = resolve(import.meta.dirname, "..");
const today = new Date().toISOString().slice(0, 10);

function lastModified(file) {
  try {
    const dirty = execFileSync("git", ["status", "--porcelain", "--", file], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (dirty) return today;
    const value = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today;
  } catch {
    return today;
  }
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const urls = SEO_PAGES.map((page) => {
  const image = page.image
    ? `\n    <image:image><image:loc>${xml(`${SITE_ORIGIN}${page.image}`)}</image:loc></image:image>`
    : "";
  return `  <url>\n    <loc>${xml(`${SITE_ORIGIN}${page.path}`)}</loc>\n    <lastmod>${lastModified(page.file)}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>${image}\n  </url>`;
}).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`;

writeFileSync(resolve(root, "public/sitemap.xml"), sitemap, "utf8");
writeFileSync(resolve(root, "public/sitemap.txt"), `${SEO_PAGES.map((page) => `${SITE_ORIGIN}${page.path}`).join("\n")}\n`, "utf8");

const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${xml(`${SITE_ORIGIN}/sitemap.xml`)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://api.yourrulesgame.ru/api/library/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>
`;
writeFileSync(resolve(root, "public/sitemap-index.xml"), sitemapIndex, "utf8");

const robots = readFileSync(resolve(root, "public/robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)) {
  throw new Error("robots.txt does not reference the canonical XML sitemap");
}
if (!robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap-index.xml`)) {
  throw new Error("robots.txt does not reference the sitemap index");
}

console.log(`Generated sitemap.xml, sitemap-index.xml and sitemap.txt with ${SEO_PAGES.length} canonical URLs.`);
