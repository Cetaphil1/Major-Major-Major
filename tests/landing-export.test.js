const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const LANDING_DIR = path.join(ROOT, "landing");

function htmlFiles(dir = LANDING_DIR) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function hrefs(html) {
  return [...html.matchAll(/\bhref="([^"]+)"/g)].map((m) => m[1]);
}

describe("generated landing export", () => {
  it("keeps the public landing page on the Fit Beyond Interest brand", () => {
    const html = read("landing/index.html");

    assert.match(html, /<title>Fit Beyond Interest — Does your major actually fit you\?<\/title>/);
    assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/);
    assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/);
    assert.match(html, /Compare your major, school environment, workload, motivation, belonging, and career clarity/);
    assert.doesNotMatch(html, /Edukate/i);
  });

  it("does not leave stale Edukate copy anywhere in the exported landing tree", () => {
    const stale = htmlFiles()
      .map((file) => [path.relative(ROOT, file), fs.readFileSync(file, "utf8")])
      .filter(([, html]) => /Edukate/i.test(html))
      .map(([rel]) => rel);

    assert.deepEqual(stale, []);
  });

  it("keeps generated CTA links pointed at the root prelanding flow", () => {
    const badLinks = [];
    const startLinks = [];

    for (const file of htmlFiles()) {
      const rel = path.relative(ROOT, file);
      for (const href of hrefs(fs.readFileSync(file, "utf8"))) {
        if (/(?:^|\/)(survey|research)\.html(?:$|[?#])/.test(href)) {
          badLinks.push(`${rel}: ${href}`);
        }
        if (/(?:^|\/)start\.html(?:$|[?#])/.test(href)) {
          startLinks.push(`${rel}: ${href}`);
          const resolved = path
            .normalize(path.join(path.dirname(file), href.split(/[?#]/)[0]))
            .replaceAll(path.sep, "/");
          assert.equal(resolved, path.join(ROOT, "start.html").replaceAll(path.sep, "/"), `${rel} has a nested start link: ${href}`);
        }
      }
    }

    assert.ok(startLinks.length > 0, "expected at least one landing CTA into start.html");
    assert.deepEqual(badLinks, [], "landing CTAs should not bypass research context by deep-linking into survey/research");
  });

  it("keeps current research slugs and omits retired generated article paths", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "landing/research-page/school-effect-vs-subject-fit/index.html")));
    assert.ok(fs.existsSync(path.join(ROOT, "landing/research-page/reading-belonging-and-career-clarity/index.html")));

    const allPaths = htmlFiles().map((file) => path.relative(ROOT, file).replaceAll(path.sep, "/"));
    assert.equal(allPaths.includes("landing/research-page/choosing-a-university-for-more-than-rankings/index.html"), false);
    assert.equal(allPaths.includes("landing/research-page/how-to-choose-the-right-program/index.html"), false);
  });
});
