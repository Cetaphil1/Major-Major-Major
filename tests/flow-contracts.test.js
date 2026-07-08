import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function walkHtml(relDir) {
  const root = path.join(repoRoot, relDir);
  const out = [];

  function visit(absDir) {
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const abs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        visit(abs);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        out.push(path.relative(repoRoot, abs).split(path.sep).join("/"));
      }
    }
  }

  visit(root);
  return out.sort();
}

function relativeHref(fromRelFile, toRelFile) {
  const fromDir = path.dirname(path.join(repoRoot, fromRelFile));
  return path.relative(fromDir, path.join(repoRoot, toRelFile)).split(path.sep).join("/");
}

function loadUserContext(initialStorage = {}) {
  const store = new Map(Object.entries(initialStorage));
  const sandbox = {
    window: {},
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
      removeItem(key) {
        store.delete(key);
      },
    },
  };

  vm.runInNewContext(read("app/user-context.js"), sandbox);
  return { UserContext: sandbox.window.UserContext, store };
}

test("generated landing pages keep the quiz CTA on the root start flow", () => {
  const pages = walkHtml("landing");
  assert.ok(pages.length >= 10, "expected generated landing pages to be present");

  for (const page of pages) {
    const html = read(page);
    const expectedStartHref = relativeHref(page, "start.html");

    assert.match(html, /Fit Beyond Interest/, `${page} should use current product branding`);
    assert.doesNotMatch(html, /Edukate/i, `${page} should not contain retired Edukate branding`);
    assert.equal(count(html, "research.html"), 0, `${page} should not bypass context into research`);
    assert.equal(count(html, "survey.html"), 0, `${page} should not bypass context into the survey`);
    assert.ok(count(html, "start.html") >= 1, `${page} should expose at least one quiz entry link`);
    assert.equal(
      count(html, expectedStartHref),
      count(html, "start.html"),
      `${page} should only use correctly rooted start.html links`,
    );
    assert.ok(
      html.includes(expectedStartHref),
      `${page} should link to ${expectedStartHref} so nested landing pages reach /start.html`,
    );
  }
});

test("prelanding completion and skip both persist before routing to research", () => {
  const prelanding = read("app/prelanding.jsx");

  assert.match(
    prelanding,
    /const finish = \(\) => \{\s*UC\.update\(\{ preLandingComplete: true, contextConfirmed: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "finishing context should confirm and mark prelanding complete before research",
  );
  assert.match(
    prelanding,
    /const skipIntro = \(\) => \{\s*\/\/ honest skip:[^\n]*\n\s*UC\.update\(\{ preLandingComplete: true \}\);\s*window\.location\.href = "research\.html";\s*\};/s,
    "skipping should still mark prelanding complete before research",
  );
  assert.doesNotMatch(
    prelanding,
    /window\.location\.href = "index\.html"/,
    "post-context routing should not drift back to the ambiguous index page",
  );
});

test("research and survey pages preserve the context-first flow", () => {
  const index = read("index.html");
  const research = read("research.html");
  const surveyController = read("app/fit-app.jsx");

  assert.match(
    index,
    /if \(!c\.preLandingComplete\) \{ window\.location\.replace\('start\.html'\); \}/,
    "root research entry should gate brand-new visitors through start.html",
  );
  assert.match(research, /window\.UserContext && window\.UserContext\.load\(\)/);
  assert.match(research, /DataStatusBadge status="Preview"/, "demo research fallback must be labeled");
  assert.ok(count(research, 'href="survey.html"') >= 2, "research should clearly hand off to survey.html");
  assert.match(
    surveyController,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{ window\.location\.replace\("start\.html"\); \}/,
    "survey should reject users who have not completed the context flow",
  );
  assert.match(surveyController, /seeded\.displayName = uc\.displayName \|\| "";/);
  assert.match(surveyController, /seeded\.college = ucCollege\.name;/);
  assert.match(surveyController, /seeded\.major = ucMajor\.name;/);
});

test("UserContext recovers from bad storage and keeps identity updates merged", () => {
  const { UserContext, store } = loadUserContext({
    "fbi-user-context-v1": "{not-json",
  });

  assert.deepEqual(UserContext.load(), UserContext.empty(), "bad localStorage should reset to an empty context");

  UserContext.update({
    displayName: "  Maya  ",
    selectedCollege: { name: "Swarthmore College" },
  });
  UserContext.update({
    selectedMajor: { name: "Political Science", category: "Social Sciences" },
    preLandingComplete: true,
  });

  const saved = JSON.parse(store.get(UserContext.KEY));
  assert.equal(saved.displayName, "  Maya  ");
  assert.equal(saved.selectedCollege.name, "Swarthmore College");
  assert.equal(saved.selectedMajor.name, "Political Science");
  assert.equal(saved.preLandingComplete, true);
  assert.equal(UserContext.nameOr("friend"), "Maya");
  assert.equal(UserContext.hasIdentity(), true);

  const related = UserContext.relatedMajorsFor(
    { name: "Political Science", category: "Social Sciences" },
    [
      { name: "Political Science", category: "Social Sciences" },
      { name: "Sociology", category: "Social Sciences" },
      { name: "Computer Science", category: "Computer and Information Sciences" },
      { name: "Economics", category: "Social Sciences" },
    ],
    2,
  );
  assert.deepEqual(Array.from(related), ["Sociology", "Economics"]);
});
