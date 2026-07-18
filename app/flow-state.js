/* flow-state.js - identity-scoped persistence for the survey flow.
   Plain global script so it can be used by browser pages and lightweight Node tests. */
(function (root) {
  var STORE = "fbi-flow-v1";

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityKeyFromUserContext(uc) {
    uc = uc || {};
    var college = uc.selectedCollege || {};
    var major = uc.selectedMajor || {};
    return [
      norm(uc.displayName),
      norm(college.id || college.name),
      norm(college.name),
      norm(major.cipCode || major.name),
      norm(major.name),
    ].join("|");
  }

  function loadRaw(storage) {
    try {
      storage = storage || root.localStorage;
      return JSON.parse(storage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveRaw(state, storage) {
    try {
      storage = storage || root.localStorage;
      storage.setItem(STORE, JSON.stringify(state));
    } catch (e) {}
  }

  function wipe(storage) {
    try {
      storage = storage || root.localStorage;
      storage.removeItem(STORE);
    } catch (e) {}
  }

  function savedMatchesIdentity(saved, identityKey) {
    return !!(saved && saved.identityKey && saved.identityKey === identityKey);
  }

  function scopedSavedForIdentity(uc, storage) {
    var identityKey = identityKeyFromUserContext(uc);
    var saved = loadRaw(storage);
    return {
      identityKey: identityKey,
      saved: savedMatchesIdentity(saved, identityKey) ? saved : null,
    };
  }

  var api = {
    STORE: STORE,
    identityKeyFromUserContext: identityKeyFromUserContext,
    loadRaw: loadRaw,
    saveRaw: saveRaw,
    wipe: wipe,
    savedMatchesIdentity: savedMatchesIdentity,
    scopedSavedForIdentity: scopedSavedForIdentity,
  };

  root.FlowState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
