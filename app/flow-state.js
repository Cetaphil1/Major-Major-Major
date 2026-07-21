/* flow-state.js - identity-aware persistence for survey progress. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.FlowState = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value == null ? "" : value).trim().toLowerCase().replace(/\s+/g, " ");
  }

  function keyFromParts(displayName, collegeId, collegeName, majorId, majorName) {
    var college = normalize(collegeId || collegeName);
    var major = normalize(majorId || majorName);
    if (!college || !major) return null;
    return [
      "name:" + normalize(displayName),
      "college:" + college,
      "major:" + major,
    ].join("|");
  }

  function identityKeyFromUserContext(ctx) {
    if (!ctx) return null;
    var college = ctx.selectedCollege || {};
    var major = ctx.selectedMajor || {};
    return keyFromParts(ctx.displayName, college.id, college.name, major.cipCode, major.name);
  }

  function identityKeyFromFlowContext(ctx) {
    if (!ctx) return null;
    var collegeMeta = ctx.collegeMeta || {};
    var majorMeta = ctx.majorMeta || {};
    return keyFromParts(ctx.displayName, collegeMeta.id, ctx.college, majorMeta.cipCode, ctx.major);
  }

  function storageOrDefault(storage) {
    return storage || (typeof localStorage !== "undefined" ? localStorage : null);
  }

  function load(storage) {
    var s = storageOrDefault(storage);
    if (!s) return null;
    try {
      return JSON.parse(s.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function save(state, storage) {
    var s = storageOrDefault(storage);
    if (!s) return;
    try {
      s.setItem(STORE, JSON.stringify(state));
    } catch (e) {}
  }

  function wipe(storage) {
    var s = storageOrDefault(storage);
    if (!s) return;
    try {
      s.removeItem(STORE);
    } catch (e) {}
  }

  function matchesIdentity(saved, identityKey) {
    if (!saved || !identityKey) return false;
    var savedKey = saved.identityKey || identityKeyFromFlowContext(saved.ctx);
    return savedKey === identityKey;
  }

  function loadForIdentity(identityKey, storage) {
    var saved = load(storage);
    return matchesIdentity(saved, identityKey) ? saved : null;
  }

  return {
    STORE: STORE,
    identityKeyFromUserContext: identityKeyFromUserContext,
    identityKeyFromFlowContext: identityKeyFromFlowContext,
    load: load,
    save: save,
    wipe: wipe,
    matchesIdentity: matchesIdentity,
    loadForIdentity: loadForIdentity,
  };
});
