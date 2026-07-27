import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;
const LANDING_ROOT = join(ROOT, "landing");

function walkHtmlFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkHtmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function hrefsFor(html) {
  return [...decodeHtmlEntities(html).matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);
}

test("generated landing pages keep the Fit Beyond Interest rebrand", () => {
  const files = walkHtmlFiles(LANDING_ROOT);

  assert.ok(files.length > 0, "expected generated landing HTML files to exist");

  for (const file of files) {
    const text = readText(file);
    const rel = relative(ROOT, file);

    assert.match(text, /<meta property="og:title" content="Fit Beyond Interest">/, `${rel} should expose the current brand in OG metadata`);
    assert.match(text, /<meta name="twitter:title" content="Fit Beyond Interest">/, `${rel} should expose the current brand in Twitter metadata`);
    assert.doesNotMatch(text, /\bEdukate\b/i, `${rel} should not ship retired Edukate branding`);
  }
});

test("landing quiz-entry links send users to the root start flow", () => {
  const marketingPages = [
    "landing/index.html",
    "landing/programs/index.html",
    "landing/programs/b-sc-in-computer-science/index.html",
    "landing/research-page/index.html",
  ];

  for (const rel of marketingPages) {
    const html = readText(join(ROOT, rel));
    const allLinks = hrefsFor(html);
    const links = allLinks.filter((href) => href.includes("start.html"));

    assert.ok(links.length > 0, `${rel} should include a quiz entry link`);
    assert.ok(
      links.some((href) => new URL(href, `https://example.com/${rel}`).pathname === "/start.html"),
      `${rel} should route quiz CTAs to the root start.html flow`,
    );
    assert.equal(
      allLinks.filter((href) => href.includes("research.html") || href.includes("survey.html")).length,
      0,
      `${rel} should not bypass context entry through research.html or survey.html`,
    );
  }
});

test("current research article slugs are published and old slugs stay retired", () => {
  const currentSlugs = [
    "school-effect-vs-subject-fit",
    "reading-belonging-and-career-clarity",
  ];
  const retiredSlugs = [
    "college-readiness",
    "faculty-excellence",
  ];

  for (const slug of currentSlugs) {
    const articlePath = join(LANDING_ROOT, "research-page", slug, "index.html");
    const rel = relative(ROOT, articlePath);

    assert.ok(statSync(articlePath).isFile(), `${rel} should exist`);

    const html = readText(articlePath);
    assert.match(
      html,
      new RegExp(`<meta property="og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}">`),
      `${rel} should publish a canonical OG URL for its slug`,
    );
    assert.match(
      decodeHtmlEntities(html),
      new RegExp(`"pathVariables":\\{"fKN3VqEvI":"${slug}"\\}`),
      `${rel} should hydrate the matching Framer collection slug`,
    );
  }

  for (const slug of retiredSlugs) {
    const articlePath = join(LANDING_ROOT, "research-page", slug, "index.html");
    assert.throws(
      () => statSync(articlePath),
      { code: "ENOENT" },
      `retired research slug ${slug} should not remain published`,
    );
  }
});
