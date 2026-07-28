(function () {
  var KEY = "fbi-flow-v1";

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityKey(displayName, college, major) {
    var collegeName = norm(college);
    var majorName = norm(major);
    if (!collegeName || !majorName) return "";
    return [norm(displayName), collegeName, majorName].join("|");
  }

  function identityKeyFromUserContext(ctx) {
    ctx = ctx || {};
    return identityKey(
      ctx.displayName,
      ctx.selectedCollege && ctx.selectedCollege.name,
      ctx.selectedMajor && ctx.selectedMajor.name
    );
  }

  function identityKeyFromFlowContext(ctx) {
    ctx = ctx || {};
    return identityKey(ctx.displayName, ctx.college, ctx.major);
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch (e) { return null; }
  }

  function load(activeIdentityKey) {
    var saved = read();
    if (!saved || !activeIdentityKey) return null;

    // Legacy states did not include identityKey. Restore only if their
    // embedded context matches the active pre-landing identity.
    var savedIdentityKey = saved.identityKey || identityKeyFromFlowContext(saved.ctx);
    if (savedIdentityKey !== activeIdentityKey) return null;

    saved.identityKey = savedIdentityKey;
    return saved;
  }

  function save(state, activeIdentityKey) {
    if (!activeIdentityKey) return;
    try {
      var next = Object.assign({}, state || {}, { identityKey: activeIdentityKey });
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {}
  }

  function wipe() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  window.FlowState = {
    KEY: KEY,
    identityKey: identityKey,
    identityKeyFromUserContext: identityKeyFromUserContext,
    identityKeyFromFlowContext: identityKeyFromFlowContext,
    load: load,
    save: save,
    wipe: wipe,
  };
})();
