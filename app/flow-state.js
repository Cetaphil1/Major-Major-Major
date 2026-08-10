(function () {
  var STORE = "fbi-flow-v1";

  function readRaw() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function identityPart(value) {
    return (value || "").trim().toLowerCase();
  }

  function identityKeyFromContext(context) {
    if (!context) return "";
    var college = context.selectedCollege && context.selectedCollege.name;
    var major = context.selectedMajor && context.selectedMajor.name;
    if (!college || !major) return "";
    return [identityPart(college), identityPart(major)].join("|");
  }

  function currentIdentityKey() {
    try {
      return identityKeyFromContext(window.UserContext && window.UserContext.load());
    } catch (e) {
      return "";
    }
  }

  function load() {
    var saved = readRaw();
    if (!saved) return null;

    var key = currentIdentityKey();
    if (!key) return saved.identityKey ? null : saved;
    return saved.identityKey === key ? saved : null;
  }

  function save(state) {
    try {
      var next = Object.assign({}, state || {}, { identityKey: currentIdentityKey() || null });
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch (e) {}
  }

  function wipe() {
    try {
      localStorage.removeItem(STORE);
    } catch (e) {}
  }

  window.FlowState = {
    STORE: STORE,
    identityKeyFromContext: identityKeyFromContext,
    currentIdentityKey: currentIdentityKey,
    load: load,
    save: save,
    wipe: wipe,
  };
})();
