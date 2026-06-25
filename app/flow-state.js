/* flow-state.js — persistence helpers for the survey/report flow.
   Plain global script so the browser app and Node regression tests share the
   same identity-scoping behavior. */
(function () {
  var STORE = "fbi-flow-v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; }
  }

  function save(s) {
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {}
  }

  function wipe() {
    try { localStorage.removeItem(STORE); } catch (e) {}
  }

  function norm(value) {
    return (value == null ? "" : String(value)).trim().toLowerCase();
  }

  function identityKey(parts) {
    parts = parts || {};
    return [
      "name=" + norm(parts.displayName),
      "college=" + norm(parts.collegeId || parts.collegeName),
      "major=" + norm(parts.majorId || parts.majorName),
    ].join("|");
  }

  function identityKeyFromUserContext(uc) {
    var college = (uc && uc.selectedCollege) || {};
    var major = (uc && uc.selectedMajor) || {};
    return identityKey({
      displayName: uc && uc.displayName,
      collegeId: college.id,
      collegeName: college.name,
      majorId: major.cipCode,
      majorName: major.name,
    });
  }

  function identityKeyFromContext(ctx) {
    ctx = ctx || {};
    return identityKey({
      displayName: ctx.displayName,
      collegeId: ctx.collegeMeta && ctx.collegeMeta.id,
      collegeName: ctx.college,
      majorId: ctx.majorMeta && ctx.majorMeta.cipCode,
      majorName: ctx.major,
    });
  }

  function overlayIdentity(ctx, uc) {
    ctx = Object.assign({}, ctx || {});
    if (!uc) return ctx;

    var college = uc.selectedCollege || null;
    var major = uc.selectedMajor || null;

    ctx.displayName = (uc.displayName || "").trim();
    ctx.college = college && college.name ? college.name : "";
    ctx.collegeMeta = college && !college.isManual
      ? { id: college.id, city: college.city, state: college.state, control: college.type, level: college.level }
      : null;
    ctx.major = major && major.name ? major.name : "";
    ctx.majorMeta = major && !major.isManual
      ? { cipCode: major.cipCode, category: major.category }
      : null;

    return ctx;
  }

  function hasSavedProgress(saved) {
    return !!(saved && (saved.phase || saved.ctx || saved.sectionIdx || saved.answers));
  }

  function createInitialState(saved, uc, emptyCtx) {
    emptyCtx = emptyCtx || {};
    var currentIdentityKey = identityKeyFromUserContext(uc);
    var savedIdentityKey = saved && (saved.identityKey || identityKeyFromContext(saved.ctx));
    var identityChanged = hasSavedProgress(saved) && currentIdentityKey !== savedIdentityKey;
    var baseCtx = identityChanged ? Object.assign({}, emptyCtx) : Object.assign({}, emptyCtx, (saved && saved.ctx) || {});

    return {
      phase: identityChanged ? "context" : ((saved && saved.phase) || "context"),
      ctx: overlayIdentity(baseCtx, uc),
      sectionIdx: identityChanged ? 0 : ((saved && saved.sectionIdx) || 0),
      answers: identityChanged ? {} : ((saved && saved.answers) || {}),
      identityKey: currentIdentityKey,
      identityChanged: identityChanged,
    };
  }

  window.FlowState = {
    STORE: STORE,
    load: load,
    save: save,
    wipe: wipe,
    identityKeyFromUserContext: identityKeyFromUserContext,
    identityKeyFromContext: identityKeyFromContext,
    createInitialState: createInitialState,
  };
})();
