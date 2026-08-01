const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const RESEARCH_PAGES = ["research.html", "index.html"];

test("research pages only personalize when college and major are both present", () => {
  for (const page of RESEARCH_PAGES) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");

    assert.match(
      html,
      /window\.UserContext\.hasIdentity\(\)/,
      `${page} should use the shared complete-identity check`
    );
    assert.match(
      html,
      /const isDemo = !hasIdentity;/,
      `${page} should render demo UI whenever identity is incomplete`
    );
    assert.doesNotMatch(
      html,
      /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\);/,
      `${page} must not treat a college-only context as personalized`
    );
  }
});
