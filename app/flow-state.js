/* flow-state.js — identity-scoped persistence for the survey/report flow. */
(function (root) {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function identityKeyFromUserContext(ctx) {
    var college = ctx && ctx.selectedCollege;
    var major = ctx && ctx.selectedMajor;
    if (!college || !college.name || !major || !major.name) return "";
    return normalize(college.name) + "|" + normalize(major.name);
  }

  function identityKeyFromSurveyContext(ctx) {
    if (!ctx || !ctx.college || !ctx.major) return "";
    return normalize(ctx.college) + "|" + normalize(ctx.major);
  }

  function getStorage(storage) {
    return storage || root.localStorage;
  }

  function read(storage) {
    try {
      var raw = getStorage(storage).getItem(STORE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function load(userContext, storage) {
    var saved = read(storage);
    if (!saved) return null;

    var identityKey = identityKeyFromUserContext(userContext);
    if (!identityKey) return null;

    if (saved.identityKey) {
      return saved.identityKey === identityKey ? saved : null;
    }

    // Migrate pre-identity-key state only when it clearly belongs to this identity.
    return identityKeyFromSurveyContext(saved.ctx) === identityKey ?
      Object.assign({}, saved, { identityKey: identityKey }) :
      null;
  }

  function save(state, userContext, storage) {
    var identityKey = identityKeyFromUserContext(userContext);
    var next = Object.assign({}, state || {}, { identityKey: identityKey });
    try { getStorage(storage).setItem(STORE, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function wipe(storage) {
    try { getStorage(storage).removeItem(STORE); } catch (e) {}
  }

  var api = {
    STORE: STORE,
    identityKeyFromUserContext: identityKeyFromUserContext,
    identityKeyFromSurveyContext: identityKeyFromSurveyContext,
    load: load,
    save: save,
    wipe: wipe,
  };

  root.FlowState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
