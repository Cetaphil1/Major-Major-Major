/* research-data.js — the "college research system" data layer.
   Plain global script (no Babel) loaded before the React components, mirroring
   user-context.js. It fetches the local JSON files once, caches them on window,
   and exposes window.Research with pure builder helpers. Nothing is scraped or
   stored remotely — every link is either an official tool or a public search. */
(function () {
  var CACHE = null; // resolved { sources, similar, nearby, profiles, colleges }

  function fetchJSON(path, fallback) {
    return fetch(path).then(function (r) { return r.json(); }).catch(function () { return fallback; });
  }

  // Load every research file once. Reuses window.__COLLEGES if the context
  // screen already fetched it. Returns a Promise of the cache object.
  function load() {
    if (CACHE) return Promise.resolve(CACHE);
    var collegesP = window.__COLLEGES ? Promise.resolve(window.__COLLEGES) : fetchJSON("colleges.json", []);
    return Promise.all([
      fetchJSON("researchSources.json", { categories: [], _meta: { engines: {} } }),
      fetchJSON("collegeMajors.json", { similarMajors: {} }),
      fetchJSON("nearbyColleges.json", { byCollegeId: {}, fallback: {} }),
      fetchJSON("collegeProfiles.json", { profiles: {} }),
      collegesP,
    ]).then(function (res) {
      window.__COLLEGES = res[4];
      CACHE = { sources: res[0], similar: res[1], nearby: res[2], profiles: res[3], colleges: res[4] };
      return CACHE;
    });
  }

  // ── lookups ──────────────────────────────────────────────────
  function norm(s) { return (s || "").trim().toLowerCase(); }

  function collegeRecordFor(name) {
    var db = (CACHE && CACHE.colleges) || window.__COLLEGES || [];
    var n = norm(name);
    return db.find(function (c) {
      if (norm(c.name) === n) return true;
      return (c.alias || []).some(function (a) { return norm(a) === n; });
    }) || null;
  }

  function profileFor(collegeId) {
    if (!collegeId || !CACHE) return null;
    return CACHE.profiles.profiles[collegeId] || null;
  }

  function nearbyFor(collegeId) {
    if (!CACHE) return { list: [], fallback: {} };
    var list = (collegeId && CACHE.nearby.byCollegeId[collegeId]) || [];
    return { list: list, fallback: CACHE.nearby.fallback || {} };
  }

  // Similar majors: prefer the curated map, then fall back to same-category
  // majors from the major DB. Always honestly flagged.
  function similarMajorsFor(majorName) {
    if (!CACHE) return { list: [], status: "Needs source", disclaimer: "" };
    var map = CACHE.similar.similarMajors || {};
    var meta = CACHE.similar._meta || {};
    var direct = map[majorName];
    if (direct && direct.length) {
      return { list: direct.slice(0, 7), status: meta.status || "Estimated", disclaimer: meta.disclaimer || "", source: "curated" };
    }
    // category fallback via the loaded majors DB
    var db = window.__MAJORS || [];
    var rec = db.find(function (m) { return norm(m.name) === norm(majorName); });
    if (rec && rec.category) {
      var sibs = db.filter(function (m) { return m.category === rec.category && m.name !== rec.name; })
        .slice(0, 6)
        .map(function (m) { return { name: m.name, relation: "Same field: " + rec.category + "." }; });
      if (sibs.length) return { list: sibs, status: "Estimated", disclaimer: meta.disclaimer || "", source: "category" };
    }
    return { list: [], status: "Needs source", disclaimer: meta.disclaimer || "" };
  }

  // ── link building ────────────────────────────────────────────
  function engines() { return (CACHE && CACHE.sources._meta && CACHE.sources._meta.engines) || {}; }

  function fillText(t, ctx) {
    return (t || "")
      .replace(/\{college\}/g, ctx.college || "your school")
      .replace(/\{major\}/g, ctx.major || "your major")
      .replace(/\{domain\}/g, ctx.domain || "");
  }

  function buildOne(entry, ctx) {
    var eng = engines();
    var encC = encodeURIComponent(ctx.college || "");
    var encM = encodeURIComponent(ctx.major || "");
    var url, status = entry.status;

    if (entry.type === "direct") {
      url = entry.url.replace(/\{c\}/g, encC).replace(/\{m\}/g, encM);
    } else if (entry.type === "homepage") {
      if (ctx.homepage) { url = ctx.homepage; status = "Official source"; }
      else { url = (eng.google || "") + encodeURIComponent(fillText(entry.query, ctx)); status = "Research link"; }
    } else if (entry.type === "scoped") {
      var q = ctx.domain ? fillText(entry.siteQuery, ctx) : fillText(entry.query, ctx);
      url = (eng.google || "") + encodeURIComponent(q);
    } else { // "search"
      var base = eng[entry.engine] || eng.google || "";
      url = base + encodeURIComponent(fillText(entry.query, ctx));
    }
    return { id: entry.id, label: fillText(entry.label, ctx), url: url, status: status, note: entry.note || "" };
  }

  // Resolve every category (or one) into ready-to-render link groups.
  function buildCategories(ctx) {
    if (!CACHE) return [];
    return (CACHE.sources.categories || []).map(function (cat) {
      return {
        id: cat.id, title: cat.title, blurb: cat.blurb, warning: cat.warning || null,
        links: (cat.links || []).map(function (e) { return buildOne(e, ctx); }),
      };
    });
  }
  function buildCategory(id, ctx) {
    return buildCategories(ctx).find(function (c) { return c.id === id; }) || null;
  }

  // Build the full research context for a given college + major.
  function contextFor(collegeName, majorName) {
    var rec = collegeRecordFor(collegeName);
    var id = rec ? rec.id : null;
    var prof = profileFor(id);
    return {
      college: collegeName, major: majorName,
      collegeId: id, record: rec, profile: prof,
      domain: prof ? prof.domain : null,
      homepage: prof ? prof.homepage : null,
    };
  }

  // ── live College Scorecard (U.S. Dept. of Education) ─────────────
  // Fills the SAME stat grid for ANY school, not just the curated demos.
  // DEMO_KEY works for low-volume demos; register a free instant key at
  // https://api.data.gov/signup/ and swap it in for production rate limits.
  var SCORECARD_KEY = "DEMO_KEY";
  var SCORECARD_BASE = "https://api.data.gov/ed/collegescorecard/v1/schools";
  var SCORECARD_FIELDS = [
    "school.name", "school.school_url",
    "latest.student.size",
    "latest.admissions.admission_rate.overall",
    "latest.admissions.sat_scores.midpoint.critical_reading",
    "latest.admissions.sat_scores.midpoint.math",
    "latest.cost.tuition.in_state", "latest.cost.tuition.out_of_state",
    "latest.cost.avg_net_price.overall",
    "latest.completion.completion_rate_4yr_150nt",
    "latest.earnings.10_yrs_after_entry.median",
  ].join(",");

  function scNorm(s) {
    return (s || "").toLowerCase()
      .replace(/[\u2013\u2014-]/g, " ")
      .replace(/[.,&']/g, " ")
      .replace(/\s+/g, " ").trim()
      .replace(/^the /, "");
  }
  function scFixUrl(u) {
    if (!u) return null;
    u = u.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return u;
  }
  function scPickBest(query, results) {
    var q = scNorm(query), best = null, bs = -1;
    (results || []).forEach(function (r) {
      var n = scNorm(r["school.name"]); var sc = 0;
      if (n === q) sc = 100;
      else if (n.indexOf(q) === 0) { sc = 80 - (n.length - q.length) * 0.1; if (n.indexOf("main campus") >= 0) sc += 15; }
      else {
        var qt = q.split(" "), nt = {};
        n.split(" ").forEach(function (t) { nt[t] = 1; });
        var ov = qt.filter(function (t) { return nt[t]; }).length / qt.length;
        sc = ov * 60; if (n.indexOf("main campus") >= 0) sc += 5;
      }
      var size = r["latest.student.size"] || 0;
      sc += sc >= 70 ? Math.min(size / 5000, 18) : Math.min(size / 100000, 0.5);
      if (sc > bs) { bs = sc; best = r; }
    });
    return bs >= 40 ? best : null;
  }
  function scStats(rec) {
    var g = function (k) { return rec[k]; };
    var size = g("latest.student.size");
    var admit = g("latest.admissions.admission_rate.overall");
    var satR = g("latest.admissions.sat_scores.midpoint.critical_reading");
    var satM = g("latest.admissions.sat_scores.midpoint.math");
    var tin = g("latest.cost.tuition.in_state");
    var tout = g("latest.cost.tuition.out_of_state");
    var net = g("latest.cost.avg_net_price.overall");
    var grad = g("latest.completion.completion_rate_4yr_150nt");
    var earn = g("latest.earnings.10_yrs_after_entry.median");
    var n = function (x) { return x == null ? null : x.toLocaleString(); };
    var stats = [];
    if (size != null) stats.push({ label: "Enrollment", value: n(size), sub: "Degree-seeking" });
    if (admit != null) stats.push({ label: "Acceptance rate", value: Math.round(admit * 100) + "%", sub: admit < 0.2 ? "Highly selective" : admit < 0.5 ? "Selective" : "Accessible" });
    if (satR && satM) stats.push({ label: "SAT midpoint", value: String(satR + satM), sub: "Reading + math" });
    if (tin != null) {
      if (tout != null && tout !== tin) stats.push({ label: "In-state tuition", value: "$" + n(tin), sub: "Out-of-state $" + n(tout) });
      else stats.push({ label: "Tuition & fees", value: "$" + n(tin), sub: "Before aid" });
    }
    if (net != null) stats.push({ label: "Avg net price", value: "$" + n(net), sub: "After aid" });
    if (grad != null) stats.push({ label: "Graduation rate", value: Math.round(grad * 100) + "%", sub: "Within 6 years" });
    if (earn != null) stats.push({ label: "Median earnings", value: "$" + n(earn), sub: "~10 yrs after entry" });
    return stats;
  }

  // Returns a Promise of { stats[], homepage, matched } on success, or
  // { error: "rate" | "none" | "net" } so the UI can explain WHY. Only
  // successful matches are cached (so a transient 429 won't poison the cache).
  function scorecardFor(name) {
    var key = "fbi-sc-" + scNorm(name).replace(/\s+/g, "-");
    try {
      var c = localStorage.getItem(key);
      if (c) { var p = JSON.parse(c); if (p && p.t && Date.now() - p.t < 2592e6 && p.v) return Promise.resolve(p.v); }
    } catch (e) {}
    var q = scNorm(name);
    var tries = [q, q.split(" ").slice(0, 3).join(" "), q.split(" ").slice(0, 2).join(" ")];
    var i = 0, rateHit = false;
    function attempt() {
      if (i >= tries.length) return Promise.resolve({ error: rateHit ? "rate" : "none" });
      var t = tries[i++];
      var url = SCORECARD_BASE + "?api_key=" + SCORECARD_KEY + "&school.name=" + encodeURIComponent(t) +
        "&fields=" + SCORECARD_FIELDS + "&per_page=40";
      return fetch(url).then(function (r) {
        if (r.status === 429) { rateHit = true; return null; }
        return r.json();
      }).then(function (j) {
        if (!j) return attempt();
        var res = (j && j.results) || [];
        if (!res.length) return attempt();
        var best = scPickBest(name, res);
        if (!best) return attempt();
        return { stats: scStats(best), homepage: scFixUrl(best["school.school_url"]), matched: best["school.name"] };
      }).catch(function () { return attempt(); });
    }
    return attempt().then(function (v) {
      if (v && v.stats) { try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {} }
      return v;
    });
  }

  window.Research = {
    load: load,
    contextFor: contextFor,
    collegeRecordFor: collegeRecordFor,
    profileFor: profileFor,
    nearbyFor: nearbyFor,
    similarMajorsFor: similarMajorsFor,
    buildCategories: buildCategories,
    buildCategory: buildCategory,
    buildOne: buildOne,
    scorecardFor: scorecardFor,
  };
})();
