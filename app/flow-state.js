/* flow-state.js — identity-scoped persistence for the survey flow.
   Survey answers are only valid for the exact student/college/major context
   that produced them. Keep this plain JS so survey.html can load it before
   Babel-transpiled app code. */
(function () {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function selectedName(ctx, key) {
    var selected = ctx && ctx[key];
    return selected && selected.name ? selected.name : "";
  }

  function identityKey(userContext) {
    userContext = userContext || {};
    var college = normalize(selectedName(userContext, "selectedCollege"));
    var major = normalize(selectedName(userContext, "selectedMajor"));
    if (!college || !major) return "";
    return [
      normalize(userContext.displayName),
      college,
      major
    ].join("|");
  }

  function savedContextKey(ctx) {
    ctx = ctx || {};
    var college = normalize(ctx.college);
    var major = normalize(ctx.major);
    if (!college || !major) return "";
    return [
      normalize(ctx.displayName),
      college,
      major
    ].join("|");
  }

  function readRaw() {
    try {
      var raw = localStorage.getItem(STORE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function load(userContext) {
    var currentKey = identityKey(userContext);
    if (!currentKey) return null;

    var saved = readRaw();
    if (!saved) return null;

    if (saved.identityKey === currentKey) return saved;

    // Adopt old unscoped records only when their embedded context matches the
    // current identity. Otherwise an old report could silently resume for a new
    // college/major and skip the survey.
    if (!saved.identityKey && savedContextKey(saved.ctx) === currentKey) {
      return Object.assign({}, saved, { identityKey: currentKey });
    }

    return null;
  }

  function save(state, userContext) {
    var currentKey = identityKey(userContext);
    if (!currentKey) return;

    try {
      localStorage.setItem(STORE, JSON.stringify(Object.assign({}, state || {}, {
        identityKey: currentKey
      })));
    } catch (e) {}
  }

  function wipe() {
    try { localStorage.removeItem(STORE); } catch (e) {}
  }

  window.FlowState = {
    STORE: STORE,
    identityKey: identityKey,
    savedContextKey: savedContextKey,
    load: load,
    save: save,
    wipe: wipe
  };
})();
