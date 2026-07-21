/* Keep generated Framer quiz CTAs pointed at the app start flow. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LandingQuizCtaRouting = api;
  if (root.document) api.install(root.document, root);
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  var START_HREF = "../start.html";
  var QUIZ_CTA_TEXT = /\b(take it|prepare for 2027|get your fit read|apply for spring 2025)\b/i;

  function textOf(anchor) {
    if (!anchor) return "";
    return [
      anchor.textContent,
      typeof anchor.getAttribute === "function" && anchor.getAttribute("aria-label"),
      typeof anchor.getAttribute === "function" && anchor.getAttribute("title"),
      typeof anchor.getAttribute === "function" && anchor.getAttribute("data-framer-name"),
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
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

  function isStartHref(href, win) {
    href = String(href || "").trim();
    if (!href) return false;
    if (/^(?:\.{0,2}\/)?start\.html$/i.test(href)) return true;
    try {
      var base = win && win.location && win.location.href || "http://localhost/landing/index.html";
      var url = new URL(href, base);
      return /\/start\.html$/i.test(url.pathname);
    } catch (e) {
      return false;
    }
  }

  function isContactLabel(anchor) {
    return /\b(contact|get in touch)\b/i.test(textOf(anchor));
  }

  function isQuizCta(anchor, win) {
    if (!anchor) return false;
    var href = getHref(anchor);
    var hasQuizLabel = QUIZ_CTA_TEXT.test(textOf(anchor));
    return !!((hasQuizLabel && (isContactHref(href, win) || isStartHref(href, win))) ||
      (isContactHref(href, win) && !isContactLabel(anchor)));
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

  function closestQuizTarget(target) {
    var node = target;
    var depth = 0;
    while (node && depth < 8) {
      if (QUIZ_CTA_TEXT.test(textOf(node))) return node;
      node = node.parentElement;
      depth += 1;
    }
    return null;
  }

  function install(doc, win) {
    win = win || root;
    var observer = null;
    var clickHandler = function (event) {
      var anchor = closestAnchor(event.target);
      if (!isQuizCta(anchor, win) && !closestQuizTarget(event.target)) return;
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      else if (typeof event.stopPropagation === "function") event.stopPropagation();
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
    isStartHref: isStartHref,
    isQuizCta: isQuizCta,
    fixLink: fixLink,
    fixAll: fixAll,
    closestQuizTarget: closestQuizTarget,
    install: install,
  };
});
