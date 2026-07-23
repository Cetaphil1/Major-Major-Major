/* flow-state.js — identity-scoped persistence for the survey/report flow. */
(function (root) {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityKeyFromParts(displayName, college, major) {
    var collegeName = normalize(college && college.name);
    var majorName = normalize(major && major.name);
    if (!collegeName || !majorName) return null;

    return JSON.stringify({
      displayName: normalize(displayName),
      collegeId: normalize(college && college.id),
      collegeName: collegeName,
      majorCode: normalize(major && major.cipCode),
      majorName: majorName,
    });
  }

  function identityKeyFromUserContext(uc) {
    if (!uc) return null;
    return identityKeyFromParts(uc.displayName, uc.selectedCollege, uc.selectedMajor);
  }

  function identityKeyFromSavedContext(ctx) {
    if (!ctx) return null;
    return identityKeyFromParts(
      ctx.displayName,
      {
        name: ctx.college,
        id: ctx.collegeMeta && ctx.collegeMeta.id,
      },
      {
        name: ctx.major,
        cipCode: ctx.majorMeta && ctx.majorMeta.cipCode,
      }
    );
  }

  function readRaw() {
    try {
      return JSON.parse(root.localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function writeRaw(state) {
    try {
      root.localStorage.setItem(STORE, JSON.stringify(state));
    } catch (e) {}
  }

  function withoutIdentityKey(saved) {
    if (!saved || typeof saved !== "object") return null;
    var state = Object.assign({}, saved);
    delete state.identityKey;
    return state;
  }

  function loadForUserContext(uc) {
    var saved = readRaw();
    var currentKey = identityKeyFromUserContext(uc);
    if (!saved || !currentKey) return null;

    if (saved.identityKey) {
      return saved.identityKey === currentKey ? withoutIdentityKey(saved) : null;
    }

    // Migrate the old unscoped format only when its saved report context
    // exactly matches the current pre-landing identity.
    return identityKeyFromSavedContext(saved.ctx) === currentKey ? saved : null;
  }

  function saveForUserContext(uc, state) {
    var key = identityKeyFromUserContext(uc);
    if (!key) return;
    writeRaw(Object.assign({}, state || {}, { identityKey: key }));
  }

  function wipe() {
    try {
      root.localStorage.removeItem(STORE);
    } catch (e) {}
  }

  var api = {
    STORE: STORE,
    identityKeyFromUserContext: identityKeyFromUserContext,
    identityKeyFromSavedContext: identityKeyFromSavedContext,
    loadForUserContext: loadForUserContext,
    saveForUserContext: saveForUserContext,
    wipe: wipe,
  };

  root.FBIFlowState = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
