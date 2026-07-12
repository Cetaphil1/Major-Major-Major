/* flow-state.js — identity-scoped persistence for the survey runtime.
   Quiz answers are only valid for the name + college + major that produced
   them. Keep that identity beside the saved flow so changing context cannot
   silently reuse a previous report. */
(function () {
  var STORE = "fbi-flow-v1";

  function readRaw() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  function writeRaw(state) {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch (e) {}
  }

  function clear() {
    try {
      localStorage.removeItem(STORE);
    } catch (e) {}
  }

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function identityFromUserContext(uc) {
    uc = uc || {};
    return {
      displayName: (uc.displayName || "").trim(),
      college: (uc.selectedCollege && uc.selectedCollege.name) || "",
      major: (uc.selectedMajor && uc.selectedMajor.name) || "",
    };
  }

  function identityKey(identity) {
    identity = identity || {};
    return [
      norm(identity.displayName),
      norm(identity.college),
      norm(identity.major),
    ].join("|");
  }

  function load(identity) {
    var raw = readRaw();
    if (!raw || !raw.identityKey) return null;
    return raw.identityKey === identityKey(identity) ? raw.flow || null : null;
  }

  function save(identity, flow) {
    writeRaw({
      identityKey: identityKey(identity),
      identity: identity || {},
      flow: flow || {},
    });
  }

  window.FlowState = {
    STORE: STORE,
    identityFromUserContext: identityFromUserContext,
    identityKey: identityKey,
    load: load,
    save: save,
    clear: clear,
  };
})();
