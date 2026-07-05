/* flow-state.js — identity-scoped persistence for the survey/report flow. */
(function () {
  var LEGACY_KEY = "fbi-flow-v1";
  var KEY_PREFIX = LEGACY_KEY + ":";
  var SEP = "|";

  function norm(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function encodePart(value) {
    return encodeURIComponent(norm(value));
  }

  function identityFromUserContext(uc) {
    uc = uc || {};
    var college = uc.selectedCollege || {};
    var major = uc.selectedMajor || {};
    var id = {
      displayName: norm(uc.displayName),
      collegeId: norm(college.id),
      college: norm(college.name),
      majorCode: norm(major.cipCode),
      major: norm(major.name),
    };
    id.key = [
      encodePart(id.displayName),
      encodePart(id.collegeId),
      encodePart(id.college),
      encodePart(id.majorCode),
      encodePart(id.major),
    ].join(SEP);
    return id;
  }

  function scopedKey(identity) {
    return KEY_PREFIX + ((identity && identity.key) || "anonymous");
  }

  function parse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function readKey(key) {
    try { return parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  function writeKey(key, state) {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
  }

  function removeKey(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function legacyMatchesIdentity(state, identity) {
    if (!state || !state.ctx || !identity) return false;
    var ctx = state.ctx;
    if (norm(ctx.college) !== identity.college) return false;
    if (norm(ctx.major) !== identity.major) return false;
    return !ctx.displayName || norm(ctx.displayName) === identity.displayName;
  }

  function load(identity) {
    var state = readKey(scopedKey(identity));
    if (state) return state;

    var legacy = readKey(LEGACY_KEY);
    if (!legacyMatchesIdentity(legacy, identity)) return null;

    save(identity, legacy);
    removeKey(LEGACY_KEY);
    return legacy;
  }

  function save(identity, state) {
    var key = scopedKey(identity);
    var next = Object.assign({}, state || {}, { identityKey: (identity && identity.key) || "anonymous" });
    writeKey(key, next);
  }

  function wipe(identity) {
    removeKey(scopedKey(identity));
    removeKey(LEGACY_KEY);
  }

  window.FlowState = {
    LEGACY_KEY: LEGACY_KEY,
    identityFromUserContext: identityFromUserContext,
    legacyMatchesIdentity: legacyMatchesIdentity,
    load: load,
    save: save,
    wipe: wipe,
    scopedKey: scopedKey,
  };
})();
