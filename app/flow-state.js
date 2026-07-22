/* flow-state.js — identity-scoped persistence for the survey flow.
   Keeps quiz/report progress from being replayed for a different student,
   college, or major on the same device. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.FlowState = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  var STORE = "fbi-flow-v1";

  function norm(value) {
    return value == null ? "" : String(value).trim().toLowerCase();
  }

  function makeKey(displayName, collegeName, collegeId, majorName, majorCode) {
    return JSON.stringify([
      "flow-identity-v1",
      norm(displayName),
      norm(collegeId),
      norm(collegeName),
      norm(majorCode),
      norm(majorName),
    ]);
  }

  function identityKeyFromUserContext(uc) {
    uc = uc || {};
    var college = uc.selectedCollege || {};
    var major = uc.selectedMajor || {};
    return makeKey(
      uc.displayName,
      college.name,
      college.id,
      major.name,
      major.cipCode
    );
  }

  function identityKeyFromFlowContext(ctx) {
    ctx = ctx || {};
    var collegeMeta = ctx.collegeMeta || {};
    var majorMeta = ctx.majorMeta || {};
    return makeKey(
      ctx.displayName,
      ctx.college,
      collegeMeta.id,
      ctx.major,
      majorMeta.cipCode
    );
  }

  function parse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function savedIdentityKey(saved) {
    if (!saved) return null;
    return saved.identityKey || identityKeyFromFlowContext(saved.ctx);
  }

  function create(storage) {
    return {
      load: function (uc) {
        var currentKey = identityKeyFromUserContext(uc);
        var saved = parse(storage.getItem(STORE));
        if (!saved || savedIdentityKey(saved) !== currentKey) return null;
        if (!saved.identityKey) saved.identityKey = currentKey;
        return saved;
      },
      save: function (uc, state) {
        var currentKey = identityKeyFromUserContext(uc);
        var next = Object.assign({}, state || {}, { identityKey: currentKey });
        try { storage.setItem(STORE, JSON.stringify(next)); } catch (e) {}
        return next;
      },
      clear: function () {
        try { storage.removeItem(STORE); } catch (e) {}
      },
    };
  }

  function browserStore() {
    return create(localStorage);
  }

  return {
    STORE: STORE,
    create: create,
    identityKeyFromUserContext: identityKeyFromUserContext,
    identityKeyFromFlowContext: identityKeyFromFlowContext,
    load: function (uc) { return browserStore().load(uc); },
    save: function (uc, state) { return browserStore().save(uc, state); },
    clear: function () { return browserStore().clear(); },
  };
});
