/* flow-state.js - identity-scoped persistence for the survey/report flow. */
(function (root) {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function identityKey(displayName, college, major) {
    college = normalize(college);
    major = normalize(major);
    if (!college || !major) return "";
    return [normalize(displayName), college, major].join("|");
  }

  function identityKeyFromUserContext(ctx) {
    var college = ctx && ctx.selectedCollege;
    var major = ctx && ctx.selectedMajor;
    return identityKey(ctx && ctx.displayName, college && college.name, major && major.name);
  }

  function identityKeyFromSurveyContext(ctx) {
    return identityKey(ctx && ctx.displayName, ctx && ctx.college, ctx && ctx.major);
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

    var currentIdentity = identityKeyFromUserContext(userContext);
    if (!currentIdentity) return null;

    if (saved.identityKey) {
      return saved.identityKey === currentIdentity ? saved : null;
    }

    // Migrate legacy state only when it clearly belongs to this student setup.
    if (identityKeyFromSurveyContext(saved.ctx) !== currentIdentity) return null;
    return Object.assign({}, saved, { identityKey: currentIdentity });
  }

  function save(state, userContext, storage) {
    var currentIdentity = identityKeyFromUserContext(userContext);
    var next = Object.assign({}, state || {}, { identityKey: currentIdentity });
    if (!currentIdentity) return next;

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
