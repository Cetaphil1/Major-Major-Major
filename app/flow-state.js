(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.FBIFlowState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var STORE = "fbi-flow-v1";

  function norm(value) {
    return value == null ? "" : String(value).trim().toLowerCase();
  }

  function identityKeyFromUserContext(userContext) {
    userContext = userContext || {};
    var college = userContext.selectedCollege || {};
    var major = userContext.selectedMajor || {};
    return [
      "name", norm(userContext.displayName),
      "college", norm(college.id || college.name),
      "major", norm(major.cipCode || major.name)
    ].join("|");
  }

  function identityKeyFromFlowContext(ctx) {
    ctx = ctx || {};
    var collegeMeta = ctx.collegeMeta || {};
    var majorMeta = ctx.majorMeta || {};
    return [
      "name", norm(ctx.displayName),
      "college", norm(collegeMeta.id || ctx.college),
      "major", norm(majorMeta.cipCode || ctx.major)
    ].join("|");
  }

  function storageOrDefault(storage) {
    if (storage) return storage;
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  }

  function read(storage) {
    storage = storageOrDefault(storage);
    if (!storage) return null;
    try {
      var raw = storage.getItem(STORE);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function write(state, storage) {
    storage = storageOrDefault(storage);
    if (!storage) return;
    try { storage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  function loadForUserContext(userContext, storage) {
    var saved = read(storage);
    if (!saved) return null;

    var identityKey = identityKeyFromUserContext(userContext);
    if (saved.identityKey === identityKey) return saved;

    // Keep legacy in-progress surveys only when their embedded identity matches.
    if (!saved.identityKey && identityKeyFromFlowContext(saved.ctx) === identityKey) {
      var migrated = Object.assign({}, saved, { identityKey: identityKey });
      write(migrated, storage);
      return migrated;
    }

    return null;
  }

  function saveForUserContext(state, userContext, storage) {
    var next = Object.assign({}, state || {}, {
      identityKey: identityKeyFromUserContext(userContext)
    });
    write(next, storage);
    return next;
  }

  function wipe(storage) {
    storage = storageOrDefault(storage);
    if (!storage) return;
    try { storage.removeItem(STORE); } catch (e) {}
  }

  return {
    STORE: STORE,
    identityKeyFromUserContext: identityKeyFromUserContext,
    identityKeyFromFlowContext: identityKeyFromFlowContext,
    loadForUserContext: loadForUserContext,
    saveForUserContext: saveForUserContext,
    wipe: wipe
  };
});
