const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(root, ...parts), "utf8");
}

function listHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

test("prelanding finish and skip routes save completion before research", () => {
  const prelanding = read("app", "prelanding.jsx");

  assert.match(
    prelanding,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "finishing context should confirm and route to personalized research"
  );
  assert.match(
    prelanding,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip: mark complete, leave whatever's filled, go to landing\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/,
    "skipping context should mark the gate complete before research fallback"
  );
  assert.doesNotMatch(prelanding, /window\.location\.href = "index\.html";/);
});

test("survey back and restart flows return to canonical research page", () => {
  const fitApp = read("app", "fit-app.jsx");

  assert.match(
    fitApp,
    /const toLanding = \(\) => \{ window\.location\.href = "research\.html"; \};/,
    "survey exits should return to research.html, not the ambiguous index.html shell"
  );
  assert.doesNotMatch(fitApp, /window\.location\.href = "index\.html";/);
});

test("research page uses saved context and visibly labels demo fallback", () => {
  const research = read("research.html");

  assert.match(research, /const uc = \(window\.UserContext && window\.UserContext\.load\(\)\) \|\| \{\};/);
  assert.match(research, /const name = \(uc\.displayName \|\| ""\)\.trim\(\);/);
  assert.match(research, /const college = \(uc\.selectedCollege && uc\.selectedCollege\.name\) \|\| "Swarthmore College";/);
  assert.match(research, /const major = \(uc\.selectedMajor && uc\.selectedMajor\.name\) \|\| "Political Science";/);
  assert.match(research, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/);
  assert.match(research, /<DataStatusBadge status="Preview" \/>/);
  assert.match(research, /Showing a demo pairing\./);
  assert.match(research, /<ResearchCenter college=\{college\} major=\{major\} \/>/);
  assert.match(research, /href="survey\.html"/);
});

test("generated landing pages start the quiz without bypassing context", () => {
  const landingFiles = listHtmlFiles(path.join(root, "landing"));
  let startLinkCount = 0;

  for (const file of landingFiles) {
    const html = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    const hrefs = [...html.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);
    const startLinks = hrefs.filter((href) => href.includes("start.html"));
    startLinkCount += startLinks.length;

    for (const href of startLinks) {
      assert.equal(
        path.resolve(path.dirname(file), href),
        path.join(root, "start.html"),
        `${rel} should link quiz CTAs to the root start flow`
      );
    }

    assert.equal(
      hrefs.some((href) => /(?:^|\/)(?:research|survey)\.html(?:[?#].*)?$/.test(href)),
      false,
      `${rel} should not deep-link around the context flow`
    );
    assert.doesNotMatch(html, /Edukate|edukate/, `${rel} should not ship retired Edukate branding`);
  }

  assert.ok(startLinkCount > 0, "landing export should include at least one quiz start link");
  assert.ok(
    fs.existsSync(path.join(root, "landing", "research-page", "reading-belonging-and-career-clarity", "index.html")),
    "current belonging/career clarity research article should exist"
  );
  assert.ok(
    fs.existsSync(path.join(root, "landing", "research-page", "school-effect-vs-subject-fit", "index.html")),
    "current school-vs-subject fit research article should exist"
  );
  assert.equal(
    fs.existsSync(path.join(root, "landing", "research-page", "edukate-professor-receives-national-teaching-excellence-award", "index.html")),
    false,
    "retired Edukate professor article should not be exported"
  );
  assert.equal(
    fs.existsSync(path.join(root, "landing", "research-page", "edukate-university-celebrates-record-breaking-graduation-ceremony", "index.html")),
    false,
    "retired Edukate graduation article should not be exported"
  );
});
