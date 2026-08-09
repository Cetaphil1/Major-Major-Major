/* flow-state.js - identity-scoped survey/report persistence.
   Survey answers only belong to the college/major identity they were collected for. */
(function () {
  var KEY = "fbi-flow-v1";

  function clean(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityKey(ctx) {
    ctx = ctx || {};
    var college = ctx.selectedCollege && ctx.selectedCollege.name || ctx.college;
    var major = ctx.selectedMajor && ctx.selectedMajor.name || ctx.major;
    if (!college || !major) return "";
    return JSON.stringify([
      clean(ctx.displayName),
      clean(college),
      clean(major),
    ]);
  }

  function readRaw() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch (e) { return null; }
  }

  function load(ctx) {
    var expected = identityKey(ctx);
    if (!expected) return null;
    var saved = readRaw();
    if (!saved) return null;

    var savedKey = saved.identityKey || identityKey(saved.ctx);
    return savedKey === expected ? saved : null;
  }

  function save(ctx, state) {
    var key = identityKey(ctx);
    if (!key) return;
    var next = Object.assign({}, state || {}, { identityKey: key });
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
  }

  function wipe() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  window.FlowState = {
    KEY: KEY,
    identityKey: identityKey,
    load: load,
    save: save,
    wipe: wipe,
  };
})();
