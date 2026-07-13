/* flow-state.js - identity-scoped survey persistence.
   Survey answers and report phase are only valid for the saved student
   identity. If the visitor changes college or major in the pre-landing flow,
   the old answers must not be reused for the new report. */
(function (root) {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityFromUserContext(userContext) {
    userContext = userContext || {};
    var college = userContext.selectedCollege || {};
    var major = userContext.selectedMajor || {};
    return {
      displayName: normalize(userContext.displayName),
      college: normalize(college.name),
      major: normalize(major.name),
    };
  }

  function identityFromSurveyContext(ctx) {
    ctx = ctx || {};
    return {
      displayName: normalize(ctx.displayName),
      college: normalize(ctx.college),
      major: normalize(ctx.major),
    };
  }

  function identityKey(identity) {
    identity = identity || {};
    return [identity.displayName, identity.college, identity.major].join("|");
  }

  function sameIdentity(a, b) {
    return identityKey(a) === identityKey(b);
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

  function removeRaw() {
    try {
      root.localStorage.removeItem(STORE);
    } catch (e) {}
  }

  function savedMatchesIdentity(saved, currentIdentity) {
    if (!saved) return false;
    if (saved.identityKey) return saved.identityKey === identityKey(currentIdentity);

    // Backwards-compatible read for pre-fix saved survey sessions. Only trust
    // them when their embedded context already matches the current identity.
    return sameIdentity(identityFromSurveyContext(saved.ctx), currentIdentity);
  }

  function load(userContext) {
    var saved = readRaw();
    var currentIdentity = identityFromUserContext(userContext);
    return savedMatchesIdentity(saved, currentIdentity) ? saved : null;
  }

  function save(userContext, state) {
    var currentIdentity = identityFromUserContext(userContext);
    writeRaw(Object.assign({}, state || {}, { identityKey: identityKey(currentIdentity) }));
  }

  var api = {
    STORE: STORE,
    identityFromUserContext: identityFromUserContext,
    identityFromSurveyContext: identityFromSurveyContext,
    identityKey: identityKey,
    load: load,
    save: save,
    wipe: removeRaw,
  };

  root.FlowState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
