/* flow-state.js - identity-scoped persistence for the survey flow. */
(function () {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function identityFromUserContext(uc) {
    var college = uc && uc.selectedCollege;
    var major = uc && uc.selectedMajor;
    return [college && college.name, major && major.name].map(normalize).join("|");
  }

  function identityFromFlowContext(ctx) {
    return [ctx && ctx.college, ctx && ctx.major].map(normalize).join("|");
  }

  function readRaw() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function load(identityKey) {
    var saved = readRaw();
    if (!saved) return null;

    if (saved.identityKey) {
      return saved.identityKey === identityKey ? saved : null;
    }

    // Migrate compatible legacy saves, but never hydrate another identity's answers.
    if (identityFromFlowContext(saved.ctx) === identityKey) {
      saved.identityKey = identityKey;
      return saved;
    }

    return null;
  }

  function save(identityKey, state) {
    var next = Object.assign({ identityKey: identityKey }, state || {});
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function wipe() {
    try { localStorage.removeItem(STORE); } catch (e) {}
  }

  window.FlowState = {
    STORE: STORE,
    identityFromUserContext: identityFromUserContext,
    identityFromFlowContext: identityFromFlowContext,
    load: load,
    save: save,
    wipe: wipe,
  };
})();
