/* flow-state.js — identity-scoped persistence for the survey/report flow. */
(function () {
  var STORE = "fbi-flow-v1";

  function norm(value) {
    return (value || "").toString().trim().replace(/\s+/g, " ").toLowerCase();
  }

  function identityKey(ctx) {
    ctx = ctx || {};
    var college = ctx.selectedCollege || {};
    var major = ctx.selectedMajor || {};
    return [
      norm(ctx.displayName),
      norm(college.name),
      norm(major.name),
    ].join("|");
  }

  function load(key) {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.identityKey !== key) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function save(state, key) {
    var next = Object.assign({}, state || {}, { identityKey: key });
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
    wipe: wipe,
  };
})();
