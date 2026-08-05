/* flow-state.js - identity-scoped survey progress persistence. */
(function (root) {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityKey(ctx) {
    return [
      normalize(ctx && ctx.displayName),
      normalize(ctx && ctx.selectedCollege && ctx.selectedCollege.name),
      normalize(ctx && ctx.selectedMajor && ctx.selectedMajor.name),
    ].join("|");
  }

  function read() {
    try {
      return JSON.parse(root.localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function load(key) {
    var saved = read();
    if (!saved || saved.identityKey !== key) return null;
    return saved;
  }

  function save(state, key) {
    try {
      root.localStorage.setItem(STORE, JSON.stringify(Object.assign({}, state || {}, { identityKey: key })));
    } catch (e) {}
  }

  function wipe() {
    try {
      root.localStorage.removeItem(STORE);
    } catch (e) {}
  }

  root.FlowState = {
    STORE: STORE,
    identityKey: identityKey,
    load: load,
    save: save,
    wipe: wipe,
  };
})(typeof window !== "undefined" ? window : globalThis);
