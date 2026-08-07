(function (root) {
  var STORE = "fbi-flow-v1";

  function storageOrDefault(storage) {
    return storage || (root && root.localStorage) || null;
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityKeyFromUserContext(ctx) {
    if (!ctx || !ctx.selectedCollege || !ctx.selectedMajor) return "";

    var collegeName = normalize(ctx.selectedCollege.name);
    var majorName = normalize(ctx.selectedMajor.name);
    if (!collegeName || !majorName) return "";

    return [
      normalize(ctx.displayName),
      normalize(ctx.selectedCollege.id) + ":" + collegeName,
      normalize(ctx.selectedMajor.cipCode) + ":" + majorName,
    ].join("|");
  }

  function loadRaw(storage) {
    storage = storageOrDefault(storage);
    if (!storage) return null;
    try {
      return JSON.parse(storage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveRaw(state, storage) {
    storage = storageOrDefault(storage);
    if (!storage) return state;
    try {
      storage.setItem(STORE, JSON.stringify(state));
    } catch (e) {}
    return state;
  }

  function loadForIdentity(identityKey, storage) {
    var saved = loadRaw(storage);
    if (!identityKey || !saved || saved.identityKey !== identityKey) return null;
    return saved;
  }

  function saveForIdentity(identityKey, state, storage) {
    if (!identityKey) return state;
    return saveRaw(Object.assign({}, state || {}, { identityKey: identityKey }), storage);
  }

  function wipe(storage) {
    storage = storageOrDefault(storage);
    if (!storage) return;
    try {
      storage.removeItem(STORE);
    } catch (e) {}
  }

  var api = {
    STORE: STORE,
    identityKeyFromUserContext: identityKeyFromUserContext,
    loadRaw: loadRaw,
    saveRaw: saveRaw,
    loadForIdentity: loadForIdentity,
    saveForIdentity: saveForIdentity,
    wipe: wipe,
  };

  if (root) root.FlowState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
