/* flow-state.js — identity-scoped persistence for the survey flow. */
(function (root) {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityFromUserContext(uc) {
    var college = (uc && uc.selectedCollege) || null;
    var major = (uc && uc.selectedMajor) || null;
    return {
      displayName: normalize(uc && uc.displayName),
      collegeName: normalize(college && college.name),
      collegeId: normalize(college && college.id),
      majorName: normalize(major && major.name),
      majorCipCode: normalize(major && major.cipCode)
    };
  }

  function identityKey(identity) {
    var id = identity || identityFromUserContext(null);
    return JSON.stringify({
      displayName: normalize(id.displayName),
      collegeName: normalize(id.collegeName),
      collegeId: normalize(id.collegeId),
      majorName: normalize(id.majorName),
      majorCipCode: normalize(id.majorCipCode)
    });
  }

  function loadRaw() {
    try {
      return JSON.parse(root.localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function isForIdentity(saved, identity) {
    return !!(saved && saved.identityKey && saved.identityKey === identityKey(identity));
  }

  function load(identity) {
    var saved = loadRaw();
    return isForIdentity(saved, identity) ? saved : null;
  }

  function save(state, identity) {
    var next = Object.assign({}, state || {}, { identityKey: identityKey(identity) });
    try {
      root.localStorage.setItem(STORE, JSON.stringify(next));
    } catch (e) {}
    return next;
  }

  function wipe() {
    try {
      root.localStorage.removeItem(STORE);
    } catch (e) {}
  }

  var api = {
    STORE: STORE,
    identityFromUserContext: identityFromUserContext,
    identityKey: identityKey,
    isForIdentity: isForIdentity,
    load: load,
    save: save,
    wipe: wipe
  };

  root.FlowState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
