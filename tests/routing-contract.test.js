const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

test("site root redirects to the public landing page", () => {
  const html = readFileSync("index.html", "utf8");

  assert.match(html, /window\.location\.replace\(["']landing\/index\.html["']\)/);
  assert.match(html, /<meta[^>]+http-equiv=["']refresh["'][^>]+url=landing\/index\.html/i);
  assert.doesNotMatch(html, /app\/research\.jsx/);
});

test("landing quiz CTAs enter the context flow", () => {
  const html = readFileSync("landing/index.html", "utf8");
  const quizLinks = [...html.matchAll(/<a\b[^>]*href=["']([^"']*start\.html)["'][^>]*>[\s\S]*?Take the quiz[\s\S]*?<\/a>/gi)];

  assert.ok(quizLinks.length >= 2, "expected the visible landing quiz CTAs to link to start.html");
  assert.ok(quizLinks.every((match) => match[1] === "../start.html"));
});

test("survey loads identity-scoped flow state before the controller", () => {
  const html = readFileSync("survey.html", "utf8");
  const flowStateIndex = html.indexOf('src="app/flow-state.js"');
  const controllerIndex = html.indexOf('src="app/fit-app.jsx"');

  assert.notEqual(flowStateIndex, -1);
  assert.notEqual(controllerIndex, -1);
  assert.ok(flowStateIndex < controllerIndex, "flow-state.js must load before fit-app.jsx");
});
