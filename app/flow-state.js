/* flow-state.js — identity-scoped persistence for survey progress.
   The survey result is only valid for the college/major identity that produced
   its answers; changing identity must start a fresh flow instead of reusing a
   stale report from localStorage. */
(function () {
  var STORE = "fbi-flow-v1";

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function joinIdentity(name, college, major) {
    college = norm(college);
    major = norm(major);
    if (!college || !major) return "";
    return [norm(name), college, major].join("|");
  }

  function identityFromUserContext(uc) {
    if (!uc) return "";
    var college = uc.selectedCollege && uc.selectedCollege.name;
    var major = uc.selectedMajor && uc.selectedMajor.name;
    return joinIdentity(uc.displayName, college, major);
  }

  function identityFromContext(ctx) {
    if (!ctx) return "";
    return joinIdentity(ctx.displayName, ctx.college, ctx.major);
  }

  function readRaw() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function writeRaw(state) {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
    return state;
  }

  function stateIdentity(state) {
    if (!state) return "";
    return state.identityKey || identityFromContext(state.ctx);
  }

  function loadForIdentity(identityKey) {
    var state = readRaw();
    var storedIdentity = stateIdentity(state);
    if (!state) return null;

    // If the caller has a current identity, only matching saved state is valid.
    if (identityKey) {
      return storedIdentity === identityKey ? state : null;
    }

    // Without a current identity, do not leak a previous identity-scoped report
    // into a fresh/demo survey session.
    return storedIdentity ? null : state;
  }

  function save(state, identityKey) {
    var next = Object.assign({}, state || {});
    var scopedIdentity = identityKey || identityFromContext(next.ctx);
    if (scopedIdentity) next.identityKey = scopedIdentity;
    return writeRaw(next);
  }

  function wipe() {
    try { localStorage.removeItem(STORE); } catch (e) {}
  }

  window.FBIFlowState = {
    STORE: STORE,
    identityFromUserContext: identityFromUserContext,
    identityFromContext: identityFromContext,
    loadForIdentity: loadForIdentity,
    save: save,
    wipe: wipe,
  };
})();
