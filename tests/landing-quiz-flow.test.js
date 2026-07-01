const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function landingHtmlFiles() {
  const out = [];
  const stack = [path.join(root, "landing")];

  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.name.endsWith(".html")) {
        out.push(path.relative(root, abs));
      }
    }
  }

  return out.sort();
}

test("landing export is rebranded and routes quiz entry to root start flow", () => {
  const html = decodeHtmlEntities(read("landing/index.html"));

  assert.match(html, /<title>Fit Beyond Interest — Does your major actually fit you\?<\/title>/);
  assert.match(html, /<meta property="og:title" content="Fit Beyond Interest">/);
  assert.match(html, /<meta name="twitter:title" content="Fit Beyond Interest">/);

  assert.match(
    html,
    /\bhref=["']\.\.\/start\.html["']/,
    "landing CTA should resolve from /landing/index.html to the root start.html flow",
  );
  assert.doesNotMatch(
    html,
    /\bhref=["'][^"']*(?:research|survey)\.html["']/,
    "public landing must not deep-link into context-dependent research or survey pages",
  );
});

test("generated landing pages do not retain stale Edukate branding or article slugs", () => {
  const staleCopy = /\bEdukate\b|edukate-|Professor Receives National Teaching Excellence Award|record-breaking graduation/i;

  for (const relPath of landingHtmlFiles()) {
    assert.doesNotMatch(read(relPath), staleCopy, `${relPath} still contains stale Edukate copy`);
  }

  assert.equal(
    exists("landing/research-page/edukate-professor-receives-national-teaching-excellence-award/index.html"),
    false,
  );
  assert.equal(
    exists("landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony/index.html"),
    false,
  );
});

test("current research landing articles are present with canonical public slugs", () => {
  const slugs = [
    "reading-belonging-and-career-clarity",
    "school-effect-vs-subject-fit",
  ];

  for (const slug of slugs) {
    const relPath = `landing/research-page/${slug}/index.html`;
    assert.equal(exists(relPath), true, `${relPath} should exist`);

    const html = decodeHtmlEntities(read(relPath));
    assert.match(html, new RegExp(`/research-page/${slug}`));
    assert.match(html, new RegExp(`"fKN3VqEvI":"${slug}"`));
  }
});

test("start flow completion and skip path both hand off to personalized research", () => {
  const source = read("app/prelanding.jsx");

  assert.match(source, /Continue to your research/);
  assert.match(source, /UC\.update\(\{\s*preLandingComplete:\s*true,\s*contextConfirmed:\s*true\s*\}\);/);

  const researchHandoffs = source.match(/window\.location\.href\s*=\s*"research\.html";/g) || [];
  assert.equal(
    researchHandoffs.length,
    2,
    "both the confirmed finish and honest skip path should route to research.html",
  );
  assert.doesNotMatch(source, /window\.location\.href\s*=\s*"index\.html";/);
});

test("research page preserves context honesty and the only downstream CTA is survey", () => {
  const html = read("research.html");

  assert.match(html, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(html, /Showing a demo pairing\./);
  assert.match(html, /<DataStatusBadge status="Preview" \/>/);
  assert.match(html, /Change college \/ major/);

  const surveyLinks = html.match(/href="survey\.html"/g) || [];
  assert.equal(surveyLinks.length, 2, "top and end-of-page survey CTAs should both target survey.html");
  assert.doesNotMatch(html, /href="index\.html"/);
});
