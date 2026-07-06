/* flow-state.js — identity-scoped persistence for the survey flow.
   Survey answers are only valid for the college/major identity that produced
   them, so saved progress must not carry across a changed pre-landing context. */
(function () {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function makeKey(displayName, college, major) {
    var normalizedCollege = normalize(college);
    var normalizedMajor = normalize(major);
    if (!normalizedCollege || !normalizedMajor) return null;
    return [normalize(displayName), normalizedCollege, normalizedMajor].join("|");
  }

  function keyForUserContext(uc) {
    uc = uc || {};
    return makeKey(
      uc.displayName,
      uc.selectedCollege && uc.selectedCollege.name,
      uc.selectedMajor && uc.selectedMajor.name
    );
  }

  function keyForSurveyContext(ctx) {
    ctx = ctx || {};
    return makeKey(ctx.displayName, ctx.college, ctx.major);
  }

  function readRaw() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function load(expectedKey) {
    if (!expectedKey) return null;

    var saved = readRaw();
    if (!saved) return null;

    if (saved.identityKey) {
      return saved.identityKey === expectedKey ? saved : null;
    }

    // Safely migrate only legacy state that already belongs to this identity.
    return keyForSurveyContext(saved.ctx) === expectedKey
      ? Object.assign({}, saved, { identityKey: expectedKey })
      : null;
  }

  function save(identityKey, state) {
    if (!identityKey) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(Object.assign({}, state || {}, { identityKey: identityKey })));
    } catch (e) {}
  }

  function wipe() {
    try { localStorage.removeItem(STORE); } catch (e) {}
  }

  window.FlowState = {
    STORE: STORE,
    keyForUserContext: keyForUserContext,
    keyForSurveyContext: keyForSurveyContext,
    load: load,
    save: save,
    wipe: wipe,
  };
})();
