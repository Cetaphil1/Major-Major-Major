/* flow-state.js - identity-scoped persistence for the survey controller.
   The report answers are only valid for the college/major identity that
   produced them, so saved progress is ignored when the user edits context. */
(function () {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return (value || "").toString().trim().toLowerCase();
  }

  function identityKey(userContext) {
    userContext = userContext || {};
    var college = userContext.selectedCollege || {};
    var major = userContext.selectedMajor || {};
    return [
      normalize(userContext.displayName),
      normalize(college.id || college.name),
      normalize(college.name),
      normalize(major.cipCode || major.name),
      normalize(major.name)
    ].join("|");
  }

  function loadRaw() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function save(state) {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  function wipe() {
    try { localStorage.removeItem(STORE); } catch (e) {}
  }

  function forIdentity(userContext) {
    var key = identityKey(userContext);
    var saved = loadRaw();
    return saved && saved.identityKey === key ? saved : null;
  }

  window.FlowState = {
    STORE: STORE,
    identityKey: identityKey,
    loadRaw: loadRaw,
    forIdentity: forIdentity,
    save: save,
    wipe: wipe
  };
})();
