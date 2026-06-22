const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const fitDescription =
  "Compare your major, school environment, workload, motivation, belonging, and career clarity to understand whether your major actually fits.";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function attr(html, pattern, label) {
  const match = html.match(pattern);
  assert.ok(match, `Expected ${label} to exist`);
  return match[1];
}

function decodeEntities(value) {
  return value.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

function hydrateData(html) {
  return JSON.parse(
    decodeEntities(attr(html, /data-framer-hydrate-v2="([^"]+)"/, "Framer hydrate data")),
  );
}

function hrefs(html) {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => decodeEntities(match[1]));
}

const landingPages = [
  ["landing/index.html", "../start.html"],
  ["landing/about-page/index.html", "../../start.html"],
  ["landing/contact/index.html", "../../start.html"],
  ["landing/event-page/index.html", "../../start.html"],
  ["landing/event-page/award-winning-student-play/index.html", "../../../start.html"],
  ["landing/event-page/international-fashion-parade/index.html", "../../../start.html"],
  ["landing/event-page/student-startup-pitch-competition/index.html", "../../../start.html"],
  ["landing/news/index.html", "../../start.html"],
  ["landing/news/climate-solutions/index.html", "../../../start.html"],
  ["landing/news/environmental-impact/index.html", "../../../start.html"],
  ["landing/news/renewable-resources/index.html", "../../../start.html"],
  ["landing/news/sustainable-development/index.html", "../../../start.html"],
  ["landing/news/technological-advancements/index.html", "../../../start.html"],
  ["landing/programs/index.html", "../../start.html"],
  ["landing/programs/b-sc-in-computer-science/index.html", "../../../start.html"],
  ["landing/research-page/index.html", "../../start.html"],
  ["landing/research-page/reading-belonging-and-career-clarity/index.html", "../../../start.html"],
  ["landing/research-page/school-effect-vs-subject-fit/index.html", "../../../start.html"],
];

test("landing export keeps Fit Beyond Interest metadata across generated pages", () => {
  for (const [page] of landingPages) {
    const html = read(page);

    assert.equal(
      attr(html, /<meta name="description" content="([^"]+)"/, `${page} description`),
      fitDescription,
    );
    assert.equal(
      attr(html, /<meta property="og:title" content="([^"]+)"/, `${page} Open Graph title`),
      "Fit Beyond Interest",
    );
    assert.equal(
      attr(html, /<meta name="twitter:title" content="([^"]+)"/, `${page} Twitter title`),
      "Fit Beyond Interest",
    );
    assert.equal(
      attr(html, /<meta property="og:description" content="([^"]+)"/, `${page} Open Graph description`),
      fitDescription,
    );
  }
});

test("generated landing CTAs keep routing users into the quiz start flow", () => {
  for (const [page, expectedStartHref] of landingPages) {
    assert.ok(
      hrefs(read(page)).includes(expectedStartHref),
      `${page} should link to ${expectedStartHref}`,
    );
  }
});

test("home landing page exposes the current research model routes", () => {
  const links = hrefs(read("landing/index.html"));

  assert.ok(links.includes("research-page/index.html"));
  assert.ok(links.includes("research-page/school-effect-vs-subject-fit/index.html"));
  assert.ok(links.includes("research-page/reading-belonging-and-career-clarity/index.html"));
  assert.equal(
    links.some((href) => href.includes("edukate-")),
    false,
    "retired Edukate article slugs should not remain on the landing page",
  );
});

test("research article pages hydrate with the expected slug and collection item", () => {
  const articles = [
    [
      "landing/research-page/school-effect-vs-subject-fit/index.html",
      "school-effect-vs-subject-fit",
      "woRtWYK29",
    ],
    [
      "landing/research-page/reading-belonging-and-career-clarity/index.html",
      "reading-belonging-and-career-clarity",
      "VUBmmGbZe",
    ],
  ];

  for (const [page, slug, collectionItemId] of articles) {
    const html = read(page);
    const data = hydrateData(html);

    assert.equal(data.routeId, "lDzRc5Mdj");
    assert.equal(data.pathVariables.fKN3VqEvI, slug);
    assert.equal(data.collectionItemId, collectionItemId);
    assert.match(
      attr(html, /<meta property="og:url" content="([^"]+)"/, `${page} Open Graph URL`),
      new RegExp(`/research-page/${slug}$`),
    );
  }
});

test("retired research article export paths are absent", () => {
  const retiredArticles = [
    "landing/research-page/edukate-professor-receives-national-teaching-excellence-award/index.html",
    "landing/research-page/edukate-university-celebrates-record-breaking-graduation-ceremony/index.html",
  ];

  for (const page of retiredArticles) {
    assert.equal(fs.existsSync(path.join(root, page)), false, `${page} should remain removed`);
  }
});
