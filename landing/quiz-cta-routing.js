/* Keep generated Framer quiz CTAs pointed at the app start flow. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LandingQuizCtaRouting = api;
  if (root.document) api.install(root.document, root);
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  var START_HREF = "../start.html";
  var QUIZ_CTA_TEXT = /^(take it|prepare for 2027|get your fit read|apply for spring 2025)\b/i;

  function textOf(anchor) {
    return String(anchor && anchor.textContent || "").replace(/\s+/g, " ").trim();
  }

  function getHref(anchor) {
    if (!anchor) return "";
    if (typeof anchor.getAttribute === "function") return anchor.getAttribute("href") || "";
    return anchor.href || "";
  }

  function setHref(anchor, href) {
    if (!anchor) return;
    if (typeof anchor.setAttribute === "function") anchor.setAttribute("href", href);
    else anchor.href = href;
  }

  function isContactHref(href, win) {
    href = String(href || "").trim();
    if (!href) return false;
    if (/^(?:\.{0,2}\/)?contact\/?$/i.test(href)) return true;
    try {
      var base = win && win.location && win.location.href || "http://localhost/landing/index.html";
      var url = new URL(href, base);
      return /\/contact\/?$/i.test(url.pathname);
    } catch (e) {
      return false;
    }
  }

  function isQuizCta(anchor, win) {
    return !!(anchor && isContactHref(getHref(anchor), win) && QUIZ_CTA_TEXT.test(textOf(anchor)));
  }

  function fixLink(anchor, win) {
    if (isQuizCta(anchor, win)) setHref(anchor, START_HREF);
  }

  function fixAll(doc, win) {
    if (!doc || typeof doc.querySelectorAll !== "function") return;
    var anchors = doc.querySelectorAll("a[href]");
    Array.prototype.forEach.call(anchors, function (anchor) { fixLink(anchor, win); });
  }

  function closestAnchor(target) {
    if (!target || typeof target.closest !== "function") return null;
    return target.closest("a[href]");
  }

  function install(doc, win) {
    win = win || root;
    var observer = null;
    var clickHandler = function (event) {
      var anchor = closestAnchor(event.target);
      if (!isQuizCta(anchor, win)) return;
      event.preventDefault();
      win.location.href = START_HREF;
    };

    doc.addEventListener("click", clickHandler, true);
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { fixAll(doc, win); });
    else fixAll(doc, win);

    if (win.MutationObserver && doc.documentElement) {
      observer = new win.MutationObserver(function () { fixAll(doc, win); });
      observer.observe(doc.documentElement, { childList: true, subtree: true });
    }

    return { clickHandler: clickHandler, observer: observer };
  }

  return {
    START_HREF: START_HREF,
    isContactHref: isContactHref,
    isQuizCta: isQuizCta,
    fixLink: fixLink,
    fixAll: fixAll,
    install: install,
  };
});
