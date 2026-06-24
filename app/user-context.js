/* user-context.js — single source of truth for the pre-landing context.
   Plain global script (no Babel) so start.html, index.html and survey.html
   can all read/write the SAME saved object. Persisted to localStorage so a
   refresh keeps the context, the landing page can personalize, the survey
   skips duplicate questions, and the final report reuses it.

   Shape:
   {
     displayName: string | null,
     selectedCollege: { name, city, state, type, level, id, isManual } | null,
     selectedMajor:   { name, category, cipCode, keywords[], relatedMajors[], isManual } | null,
     contextConfirmed: boolean,
     preLandingComplete: boolean
   }
*/
(function () {
  var KEY = "fbi-user-context-v1";

  function empty() {
    return {
      displayName: null,
      selectedCollege: null,
      selectedMajor: null,
      contextConfirmed: false,
      preLandingComplete: false,
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      var parsed = JSON.parse(raw);
      return Object.assign(empty(), parsed || {});
    } catch (e) {
      return empty();
    }
  }

  function save(ctx) {
    try { localStorage.setItem(KEY, JSON.stringify(ctx)); } catch (e) {}
    return ctx;
  }

  // merge a partial patch into the stored context
  function update(patch) {
    var next = Object.assign(load(), patch || {});
    return save(next);
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  // friendly name with honest fallback (never a fake legal name)
  function nameOr(fallback) {
    var c = load();
    var n = (c.displayName || "").trim();
    return n || (fallback || "you");
  }

  function normalizedPart(value) {
    return (value || "").trim().toLowerCase();
  }

  function identityKey(ctx) {
    ctx = ctx || load();
    var college = ctx.selectedCollege && ctx.selectedCollege.name;
    var major = ctx.selectedMajor && ctx.selectedMajor.name;
    if (!normalizedPart(college) || !normalizedPart(major)) return null;
    return JSON.stringify([
      normalizedPart(ctx.displayName),
      normalizedPart(college),
      normalizedPart(major),
    ]);
  }

  function hasIdentity() {
    return !!identityKey();
  }

  function matchesIdentity(saved, ctx) {
    var key = identityKey(ctx);
    return !!(key && saved && saved.identityKey === key);
  }

  // Build a small relatedMajors list from the majors DB by sharing a category.
  // Used as honest category-based fallback when the dataset has no explicit
  // relatedMajors field. Returns up to `n` other major names in the same field.
  function relatedMajorsFor(major, db, n) {
    n = n || 5;
    if (!major) return [];
    if (major.relatedMajors && major.relatedMajors.length) return major.relatedMajors.slice(0, n);
    db = db || window.__MAJORS || [];
    var cat = major.category;
    if (!cat) return [];
    var out = [];
    for (var i = 0; i < db.length; i++) {
      var m = db[i];
      if (m.category === cat && m.name !== major.name) out.push(m.name);
      if (out.length >= n) break;
    }
    return out;
  }

  window.UserContext = {
    KEY: KEY,
    empty: empty,
    load: load,
    save: save,
    update: update,
    clear: clear,
    nameOr: nameOr,
    identityKey: identityKey,
    hasIdentity: hasIdentity,
    matchesIdentity: matchesIdentity,
    relatedMajorsFor: relatedMajorsFor,
  };
})();
