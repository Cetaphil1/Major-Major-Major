const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const landingRoot = path.join(repoRoot, "landing");

const quizEntryPages = [
  "index.html",
  "programs/index.html",
  "research-page/index.html",
];

const currentResearchSlugs = [
  "reading-belonging-and-career-clarity",
  "school-effect-vs-subject-fit",
];

const retiredResearchSlugs = [
  "edukate-professor-receives-national-teaching-excellence-award",
  "edukate-university-celebrates-record-breaking-graduation-ceremony",
];

function readWorkspaceFile(...parts) {
  return fs.readFileSync(path.join(repoRoot, ...parts), "utf8");
}

function listHtmlFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listHtmlFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith(".html") ? [entryPath] : [];
    });
}

function extractHrefValues(html) {
  return Array.from(html.matchAll(/\bhref="([^"]+)"/g), (match) => match[1]);
}

function stripUrlFragmentAndQuery(href) {
  return href.split("#", 1)[0].split("?", 1)[0];
}

function resolveWorkspaceHref(pagePath, href) {
  const cleanHref = stripUrlFragmentAndQuery(href);

  if (!cleanHref || /^[a-z][a-z0-9+.-]*:/i.test(cleanHref)) {
    return null;
  }

  if (cleanHref.startsWith("/")) {
    return path.normalize(path.join(repoRoot, cleanHref));
  }

  return path.normalize(path.resolve(path.dirname(pagePath), cleanHref));
}

test("landing export keeps the Fit Beyond Interest rebrand in generated pages", () => {
  const landingHome = readWorkspaceFile("landing", "index.html");

  assert.match(
    landingHome,
    /<title>Fit Beyond Interest . Does your major actually fit you\?<\/title>/,
  );
  assert.match(
    landingHome,
    /<meta property="og:title" content="Fit Beyond Interest">/,
  );
  assert.match(
    landingHome,
    /<meta name="twitter:title" content="Fit Beyond Interest">/,
  );

  for (const htmlPath of listHtmlFiles(landingRoot)) {
    const html = fs.readFileSync(htmlPath, "utf8");

    assert.doesNotMatch(
      html,
      /edukate/i,
      `${path.relative(repoRoot, htmlPath)} should not ship retired Edukate copy`,
    );
  }
});

test("quiz entry pages route visitors to the root start flow without bypassing onboarding", () => {
  const blockedDestinations = ["research.html", "survey.html"];

  for (const relativePagePath of quizEntryPages) {
    const pagePath = path.join(landingRoot, relativePagePath);
    const hrefs = extractHrefValues(fs.readFileSync(pagePath, "utf8"));
    const resolvedHrefs = hrefs
      .map((href) => resolveWorkspaceHref(pagePath, href))
      .filter(Boolean);

    assert.ok(
      resolvedHrefs.includes(path.join(repoRoot, "start.html")),
      `${relativePagePath} should include a CTA into the start flow`,
    );

    for (const blockedDestination of blockedDestinations) {
      assert.ok(
        !resolvedHrefs.includes(path.join(repoRoot, blockedDestination)),
        `${relativePagePath} should not link directly to ${blockedDestination}`,
      );
    }
  }
});

test("research export contains only the current Fit Beyond Interest article slugs", () => {
  const researchRoot = path.join(landingRoot, "research-page");
  const articleSlugs = fs
    .readdirSync(researchRoot, { withFileTypes: true })
    .filter((entry) => {
      const articleIndex = path.join(researchRoot, entry.name, "index.html");

      return entry.isDirectory() && fs.existsSync(articleIndex);
    })
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(articleSlugs, currentResearchSlugs);

  for (const slug of currentResearchSlugs) {
    const html = readWorkspaceFile("landing", "research-page", slug, "index.html");

    assert.match(
      html,
      new RegExp(
        `<meta property="og:url" content="https://incredible-pages-588758\\.framer\\.app/research-page/${slug}">`,
      ),
    );
    assert.match(
      html,
      new RegExp(`&quot;pathVariables&quot;:\\{&quot;fKN3VqEvI&quot;:&quot;${slug}&quot;\\}`),
    );
  }

  for (const slug of retiredResearchSlugs) {
    assert.equal(
      fs.existsSync(path.join(researchRoot, slug, "index.html")),
      false,
      `${slug} should remain removed from the generated research export`,
    );
  }
});
