(function () {
  var STORE = "fbi-flow-v1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityKey(uc) {
    uc = uc || {};
    var college = uc.selectedCollege || {};
    var major = uc.selectedMajor || {};
    return JSON.stringify({
      displayName: normalize(uc.displayName),
      college: normalize(college.name),
      major: normalize(major.name),
    });
  }

  function legacyIdentityKey(state) {
    var ctx = (state && state.ctx) || {};
    return JSON.stringify({
      displayName: normalize(ctx.displayName),
      college: normalize(ctx.college),
      major: normalize(ctx.major),
    });
  }

  function readRaw() {
    try { return JSON.parse(localStorage.getItem(STORE) || "null"); }
    catch (e) { return null; }
  }

  function loadForIdentity(key) {
    var state = readRaw();
    if (!state) return null;
    if (state.identityKey === key) return state;
    if (!state.identityKey && legacyIdentityKey(state) === key) {
      state.identityKey = key;
      return state;
    }
    return null;
  }

  function saveForIdentity(key, state) {
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
    loadForIdentity: loadForIdentity,
    saveForIdentity: saveForIdentity,
    wipe: wipe,
  };
})();
