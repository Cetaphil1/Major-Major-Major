const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const routing = require("../landing/quiz-cta-routing.js");

function anchor(href, text, attributes) {
  attributes = attributes || {};
  return {
    href,
    textContent: text,
    getAttribute(name) {
      if (Object.prototype.hasOwnProperty.call(attributes, name)) return attributes[name];
      return name === "href" ? this.href : null;
    },
    setAttribute(name, value) {
      if (name === "href") this.href = value;
    },
  };
}

test("rewrites generated quiz CTAs from contact to the start flow", () => {
  const hero = anchor("/contact", "Prepare for 2027");
  const nav = anchor("./contact", "Take it");
  const labeledNav = anchor("/landing/contact", "", { "aria-label": "Take it" });

  routing.fixLink(hero);
  routing.fixLink(nav);
  routing.fixLink(labeledNav);

  assert.equal(hero.href, "../start.html");
  assert.equal(nav.href, "../start.html");
  assert.equal(labeledNav.href, "../start.html");
});

test("does not rewrite ordinary contact links", () => {
  const contact = anchor("/contact", "Contact us");

  routing.fixLink(contact);

  assert.equal(contact.href, "/contact");
});

test("click handler catches hydrated contact CTAs before navigation", () => {
  const hero = anchor("/contact", "Prepare for 2027");
  const win = {
    location: { href: "http://localhost:8000/landing/index.html" },
  };
  let clickHandler = null;
  const doc = {
    readyState: "loading",
    addEventListener(type, handler) {
      if (type === "click") clickHandler = handler;
    },
  };
  const install = routing.install(doc, win);
  const event = {
    target: { closest: () => hero },
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };

  assert.equal(clickHandler, install.clickHandler);
  clickHandler(event);

  assert.equal(event.prevented, true);
  assert.equal(win.location.href, "../start.html");
});

test("landing page loads the CTA routing guard", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "landing", "index.html"), "utf8");

  assert(html.includes('src="quiz-cta-routing.js"'));
});
