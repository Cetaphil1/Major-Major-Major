/* flow-state.js — identity-scoped survey/report persistence.
   The survey answers belong to the exact saved name + college + major context.
   If that identity changes, the old report must not be reused for the new person/path. */
(function () {
  var STORE = "fbi-flow-v1";

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityKey(ctx) {
    ctx = ctx || {};
    var college = ctx.selectedCollege || {};
    var major = ctx.selectedMajor || {};
    return [
      norm(ctx.displayName),
      norm(college.id || college.name),
      norm(college.name),
      norm(major.cipCode || major.name),
      norm(major.name)
    ].join("|");
  }

  function parseSaved() {
    try { return JSON.parse(localStorage.getItem(STORE) || "null"); }
    catch (e) { return null; }
  }

  function load(ctx) {
    var saved = parseSaved();
    if (!saved) return null;
    if (saved.identityKey !== identityKey(ctx)) return null;
    return saved;
  }

  function save(state, ctx) {
    var next = Object.assign({}, state || {}, { identityKey: identityKey(ctx) });
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function wipe() {
    try { localStorage.removeItem(STORE); } catch (e) {}
  }

  window.FlowState = {
    STORE: STORE,
    identityKey: identityKey,
    load: load,
    save: save,
    wipe: wipe
  };
})();
