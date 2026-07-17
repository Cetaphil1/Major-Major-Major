const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(rel));
    else if (entry.name.endsWith(".html")) out.push(rel);
  }
  return out;
}

function hrefs(html) {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

function bodyOfFunction(source, functionName) {
  const start = source.indexOf(`const ${functionName} = () => {`);
  assert.notEqual(start, -1, `Expected ${functionName} to be defined`);

  const openBrace = source.indexOf("{", start);
  let depth = 0;
  for (let i = openBrace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(openBrace + 1, i);
  }

  assert.fail(`Could not parse ${functionName} body`);
}

test("generated landing pages keep the rebrand and enter the root start flow", () => {
  const pages = walkHtml("landing");
  assert.ok(pages.length > 0, "Expected generated landing pages");

  for (const page of pages) {
    const html = read(page);
    assert.match(html, /Fit Beyond Interest/, `${page} should carry current branding`);
    assert.doesNotMatch(html, /Edukate/, `${page} should not carry retired Edukate branding`);

    const appLinks = hrefs(html).filter((href) => /(?:start|research|survey)\.html(?:[?#].*)?$/.test(href));
    assert.ok(appLinks.length > 0, `${page} should include a quiz-entry link`);

    for (const href of appLinks) {
      const resolved = path.normalize(path.join(path.dirname(page), href.split(/[?#]/)[0]));
      assert.equal(
        resolved,
        "start.html",
        `${page} should route generated CTAs to the root start flow, got ${href}`,
      );
    }
  }
});

test("prelanding completion and skip both persist before routing to research", () => {
  const source = read("app/prelanding.jsx");
  const finish = bodyOfFunction(source, "finish");
  const skipIntro = bodyOfFunction(source, "skipIntro");

  assert.match(finish, /UC\.update\(\{\s*preLandingComplete:\s*true,\s*contextConfirmed:\s*true\s*\}\)/s);
  assert.match(finish, /window\.location\.href\s*=\s*"research\.html"/);
  assert.doesNotMatch(finish, /window\.location\.href\s*=\s*"index\.html"/);

  assert.match(skipIntro, /UC\.update\(\{\s*preLandingComplete:\s*true\s*\}\)/s);
  assert.match(skipIntro, /window\.location\.href\s*=\s*"research\.html"/);
  assert.doesNotMatch(skipIntro, /window\.location\.href\s*=\s*"index\.html"/);
});

test("research and survey pages preserve the shared-context handoff", () => {
  const startHtml = read("start.html");
  assert.ok(
    startHtml.indexOf('src="app/user-context.js"') < startHtml.indexOf('src="app/prelanding.jsx"'),
    "start.html should load UserContext before the prelanding controller",
  );
  assert.ok(
    startHtml.indexOf('src="app/college-snapshots.js"') < startHtml.indexOf('src="app/prelanding.jsx"'),
    "start.html should load college snapshots before the prelanding preview",
  );

  const researchHtml = read("research.html");
  assert.ok(
    researchHtml.indexOf('src="app/user-context.js"') < researchHtml.indexOf('src="app/research-data.js"'),
    "research.html should load UserContext before research data/helpers",
  );
  assert.match(researchHtml, /const uc = \(window\.UserContext && window\.UserContext\.load\(\)\) \|\| \{\}/);
  assert.match(researchHtml, /const isDemo = !\(uc\.selectedCollege && uc\.selectedCollege\.name\)/);
  assert.match(researchHtml, /href="survey\.html"/);

  const surveyHtml = read("survey.html");
  assert.ok(
    surveyHtml.indexOf('src="app/user-context.js"') < surveyHtml.indexOf('src="app/fit-app.jsx"'),
    "survey.html should load UserContext before the survey app",
  );

  const appSource = read("app/fit-app.jsx");
  assert.match(
    appSource,
    /if \(!uc \|\| !uc\.preLandingComplete\) \{\s*window\.location\.replace\("start\.html"\);\s*\}/,
    "survey app should gate users without completed prelanding context back to start.html",
  );
});

test("college snapshot data covers every college used by the prelanding picker", () => {
  const colleges = JSON.parse(read("colleges.json"));
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(read("app/college-snapshots.js"), context);

  const snapshots = context.window.__COLLEGE_SNAPSHOTS;
  assert.ok(snapshots, "Expected college snapshots to register on window");

  const missing = colleges
    .map((college) => college.id)
    .filter((id) => !Object.prototype.hasOwnProperty.call(snapshots, id));

  assert.deepEqual(missing, []);
});
