/* college-snapshots.js — real campus setting, size, and notable-program data
   for every college in colleges.json. Plain global script (no Babel) loaded
   before prelanding.jsx so the pre-landing "College snapshot" can show real,
   cited figures instead of "Coming soon" placeholders.

   SOURCES: U.S. News Best Colleges profiles (fall 2024 undergraduate figures)
   and NCES/IPEDS locale ("setting") classifications. Enrollment is undergraduate
   headcount. Figures shift yearly — verify the latest via each school's U.S. News
   profile or College Scorecard page. Exact, link-verified numbers are marked with
   a direct URL; all others are well-established approximations (shown with "~").

   Size buckets: Small < 5,000 · Midsize 5,000–15,000 · Large > 15,000 undergrads. */
window.__COLLEGE_SNAPSHOTS = {
  /* ── California ─────────────────────────────────────────────── */
  "uc-berkeley":    { setting: "City",     settingSub: "Berkeley, SF Bay Area",        size: "Large",   sizeSub: "~33,500 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering & computer science (EECS)", "Business (Haas)", "Social sciences & research"] },
  "ucla":           { setting: "Urban",    settingSub: "Westwood, Los Angeles",        size: "Large",   sizeSub: "33,471 undergrads · fall 2024", src: "U.S. News", url: "https://www.usnews.com/best-colleges/ucla-1315", knownFor: ["Film, TV & theater", "Engineering & computer science", "Life sciences & pre-med"] },
  "uc-san-diego":   { setting: "City",     settingSub: "Coastal La Jolla, San Diego",  size: "Large",   sizeSub: "34,955 undergrads · fall 2024", src: "U.S. News", url: "https://www.usnews.com/best-colleges/university-of-california-san-diego-1317", knownFor: ["Biological & health sciences", "Engineering (Jacobs School)", "Oceanography (Scripps Institution)", "Cognitive science"] },
  "uc-davis":       { setting: "Town",     settingSub: "Davis, near Sacramento",       size: "Large",   sizeSub: "~31,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Agriculture & veterinary medicine", "Biological sciences", "Environmental science"] },
  "uc-irvine":      { setting: "Suburban", settingSub: "Irvine, Orange County",        size: "Large",   sizeSub: "~29,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Biological sciences", "Computer science", "Business"] },
  "uc-santa-barbara":{ setting: "Suburban",settingSub: "Coastal Santa Barbara",        size: "Large",   sizeSub: "~23,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Physics & materials", "Engineering", "Marine biology"] },
  "usc":            { setting: "Urban",    settingSub: "Los Angeles",                  size: "Large",   sizeSub: "~21,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Cinematic arts (film)", "Business (Marshall)", "Engineering (Viterbi)"] },
  "stanford":       { setting: "Suburban", settingSub: "8,180-acre campus near Palo Alto", size: "Midsize", sizeSub: "7,904 undergrads · fall 2024", src: "U.S. News", url: "https://www.usnews.com/best-colleges/stanford-university-1305", knownFor: ["Engineering", "Computer science", "Entrepreneurship & startups"] },
  "caltech":        { setting: "Suburban", settingSub: "Pasadena",                     size: "Small",   sizeSub: "~1,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Physics & astronomy", "Engineering", "Hard sciences & research"] },
  "san-jose-state": { setting: "Urban",    settingSub: "Downtown San Jose",            size: "Large",   sizeSub: "28,008 undergrads · fall 2024", src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business & accounting", "Animation & illustration"] },
  "cal-poly-slo":   { setting: "Town",     settingSub: "San Luis Obispo",              size: "Large",   sizeSub: "~21,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Architecture", "Agriculture ('learn by doing')"] },
  "sdsu":           { setting: "Urban",    settingSub: "San Diego",                    size: "Large",   sizeSub: "~31,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Engineering", "Communication"] },
  "santa-monica-college":{ setting: "Urban",settingSub: "Santa Monica, LA",            size: "Large",   sizeSub: "~24,000 students (2-yr)", src: "IPEDS", url: "", knownFor: ["UC/CSU transfer", "Film & media", "General education"] },

  /* ── Massachusetts ─────────────────────────────────────────── */
  "mit":            { setting: "Urban",    settingSub: "Cambridge, near Boston",       size: "Small",   sizeSub: "~4,500 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering (#1)", "Computer science", "Physical sciences & math"] },
  "harvard":        { setting: "Urban",    settingSub: "Cambridge, near Boston",       size: "Midsize", sizeSub: "~7,200 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Economics", "Government & social studies", "Biology & pre-med"] },
  "boston-university":{ setting: "Urban",  settingSub: "Boston",                       size: "Large",   sizeSub: "~18,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Engineering", "Communication"] },
  "boston-college": { setting: "Suburban", settingSub: "Chestnut Hill, near Boston",   size: "Midsize", sizeSub: "~9,500 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Carroll)", "Nursing", "Political science"] },
  "northeastern":   { setting: "Urban",    settingSub: "Boston",                       size: "Large",   sizeSub: "~16,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Co-op / experiential learning", "Engineering", "Business"] },
  "tufts":          { setting: "Suburban", settingSub: "Medford, near Boston",         size: "Midsize", sizeSub: "~6,800 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["International relations", "Engineering", "Biology & pre-med"] },
  "umass-amherst":  { setting: "Town",     settingSub: "Amherst, western MA",          size: "Large",   sizeSub: "~24,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Computer science", "Engineering", "Nursing"] },
  "williams":       { setting: "Rural",    settingSub: "Williamstown, the Berkshires", size: "Small",   sizeSub: "~2,100 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Liberal arts", "Economics", "Art history"] },
  "amherst-college":{ setting: "Town",     settingSub: "Amherst, western MA",          size: "Small",   sizeSub: "~1,900 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Liberal arts (open curriculum)", "Economics", "Sciences"] },
  "wellesley":      { setting: "Suburban", settingSub: "Wellesley, near Boston",       size: "Small",   sizeSub: "~2,400 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Liberal arts (women's college)", "Economics", "Biological sciences"] },

  /* ── New York ──────────────────────────────────────────────── */
  "nyu":            { setting: "Urban",    settingSub: "Greenwich Village, NYC",       size: "Large",   sizeSub: "~29,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Stern)", "Film & arts (Tisch)", "Liberal arts"] },
  "columbia":       { setting: "Urban",    settingSub: "Morningside Heights, NYC",     size: "Midsize", sizeSub: "~8,900 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Economics", "Core curriculum & humanities"] },
  "cornell":        { setting: "Rural",    settingSub: "Ithaca, Finger Lakes",         size: "Large",   sizeSub: "~16,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Agriculture & life sciences", "Hotel administration"] },
  "suny-buffalo":   { setting: "Suburban", settingSub: "Buffalo",                      size: "Large",   sizeSub: "~20,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Management", "Health sciences"] },
  "stony-brook":    { setting: "Suburban", settingSub: "Long Island",                  size: "Large",   sizeSub: "~18,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Computer science", "Engineering", "Health sciences"] },
  "binghamton":     { setting: "Suburban", settingSub: "Binghamton",                   size: "Midsize", sizeSub: "~14,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Management", "Engineering", "Psychology"] },
  "rochester":      { setting: "Suburban", settingSub: "Rochester",                    size: "Midsize", sizeSub: "~6,800 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Optics", "Music (Eastman)", "Biomedical engineering"] },
  "rpi":            { setting: "Suburban", settingSub: "Troy",                         size: "Midsize", sizeSub: "~6,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Computer science", "Architecture"] },
  "rit":            { setting: "Suburban", settingSub: "Rochester",                    size: "Midsize", sizeSub: "~14,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Computing", "Imaging & photography"] },
  "fordham":        { setting: "Urban",    settingSub: "New York City",                size: "Midsize", sizeSub: "~10,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Communications", "Political science"] },
  "syracuse":       { setting: "City",     settingSub: "Syracuse",                     size: "Large",   sizeSub: "~16,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Communications (Newhouse)", "Architecture", "Information studies"] },

  /* ── New Jersey ────────────────────────────────────────────── */
  "princeton":      { setting: "Suburban", settingSub: "Princeton",                    size: "Midsize", sizeSub: "~5,600 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Public & international affairs (SPIA)", "Economics"] },
  "rutgers":        { setting: "Suburban", settingSub: "New Brunswick",                size: "Large",   sizeSub: "~36,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Engineering", "Pharmacy"] },
  "njit":           { setting: "Urban",    settingSub: "Newark",                       size: "Midsize", sizeSub: "~9,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Computer science", "Architecture"] },
  "stevens":        { setting: "Urban",    settingSub: "Hoboken, across from NYC",     size: "Small",   sizeSub: "~4,200 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Computer science", "Business & technology"] },

  /* ── Pennsylvania ──────────────────────────────────────────── */
  "upenn":          { setting: "Urban",    settingSub: "Philadelphia",                 size: "Midsize", sizeSub: "~10,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Wharton)", "Nursing", "Engineering"] },
  "cmu":            { setting: "Urban",    settingSub: "Pittsburgh",                    size: "Midsize", sizeSub: "~7,500 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Computer science (#1)", "Engineering", "Drama & fine arts"] },
  "penn-state":     { setting: "Town",     settingSub: "University Park",               size: "Large",   sizeSub: "~41,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business (Smeal)", "Earth & mineral sciences"] },
  "pitt":           { setting: "Urban",    settingSub: "Pittsburgh",                    size: "Large",   sizeSub: "~19,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Nursing & health sciences", "Engineering", "Philosophy"] },
  "temple":         { setting: "Urban",    settingSub: "Philadelphia",                 size: "Large",   sizeSub: "~24,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Fox)", "Communication (Klein)", "Health professions"] },
  "drexel":         { setting: "Urban",    settingSub: "Philadelphia",                 size: "Large",   sizeSub: "~15,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Co-op / experiential learning", "Engineering", "Business"] },
  "swarthmore":     { setting: "Suburban", settingSub: "Swarthmore, near Philadelphia", size: "Small",  sizeSub: "1,623 undergrads · fall 2024", src: "U.S. News / IPEDS", url: "", knownFor: ["Liberal arts & sciences", "Engineering (ABET-accredited)", "Honors program"] },

  /* ── New England (CT/RI/NH/VT/ME) ──────────────────────────── */
  "yale":           { setting: "City",     settingSub: "New Haven",                    size: "Midsize", sizeSub: "~6,800 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Drama & arts", "Humanities", "Political science & pre-law"] },
  "uconn":          { setting: "Rural",    settingSub: "Storrs",                       size: "Large",   sizeSub: "~19,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Nursing"] },
  "brown":          { setting: "Urban",    settingSub: "Providence",                   size: "Midsize", sizeSub: "~7,200 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Open curriculum", "Computer science", "Applied math"] },
  "dartmouth":      { setting: "Rural",    settingSub: "Hanover",                      size: "Small",   sizeSub: "~4,500 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Economics", "Government"] },
  "uvm":            { setting: "City",     settingSub: "Burlington",                   size: "Midsize", sizeSub: "~12,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Environmental science", "Health sciences", "Business"] },
  "umaine":         { setting: "Town",     settingSub: "Orono",                        size: "Midsize", sizeSub: "~9,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Marine sciences", "Forestry & natural resources"] },

  /* ── Michigan ──────────────────────────────────────────────── */
  "umich":          { setting: "City",     settingSub: "Ann Arbor",                    size: "Large",   sizeSub: "~33,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business (Ross)", "Computer science"] },
  "michigan-state": { setting: "Suburban", settingSub: "East Lansing",                 size: "Large",   sizeSub: "~40,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Education", "Agriculture", "Supply chain management"] },
  "wayne-state":    { setting: "Urban",    settingSub: "Detroit",                      size: "Large",   sizeSub: "~17,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Medicine & health sciences", "Engineering", "Business"] },

  /* ── Ohio ──────────────────────────────────────────────────── */
  "ohio-state":     { setting: "City",     settingSub: "Columbus",                     size: "Large",   sizeSub: "~46,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Fisher)", "Engineering", "Agriculture"] },
  "case-western":   { setting: "Urban",    settingSub: "Cleveland",                    size: "Midsize", sizeSub: "~6,200 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Nursing", "Biomedical sciences"] },
  "university-of-cincinnati":{ setting: "Urban", settingSub: "Cincinnati",             size: "Large",   sizeSub: "~30,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Co-op education", "Design (DAAP)", "Engineering"] },
  "miami-ohio":     { setting: "Town",     settingSub: "Oxford, OH",                   size: "Large",   sizeSub: "~17,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Farmer)", "Education", "Psychology"] },

  /* ── Illinois ──────────────────────────────────────────────── */
  "uiuc":           { setting: "City",     settingSub: "Champaign-Urbana",             size: "Large",   sizeSub: "~35,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering & computer science", "Accountancy & business", "Agriculture"] },
  "uchicago":       { setting: "Urban",    settingSub: "Hyde Park, Chicago",           size: "Midsize", sizeSub: "~7,500 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Economics", "Mathematics", "Core curriculum"] },
  "northwestern":   { setting: "Suburban", settingSub: "Evanston, near Chicago",       size: "Midsize", sizeSub: "~8,800 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Journalism (Medill)", "Engineering", "Theatre & performance"] },
  "uic":            { setting: "Urban",    settingSub: "Chicago",                      size: "Large",   sizeSub: "~22,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Health sciences", "Engineering", "Business"] },
  "illinois-tech":  { setting: "Urban",    settingSub: "Chicago",                      size: "Small",   sizeSub: "~3,400 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Computer science", "Architecture"] },

  /* ── Indiana ───────────────────────────────────────────────── */
  "purdue":         { setting: "City",     settingSub: "West Lafayette",               size: "Large",   sizeSub: "~37,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Computer science", "Agriculture & aviation"] },
  "indiana":        { setting: "Town",     settingSub: "Bloomington",                  size: "Large",   sizeSub: "~36,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Kelley)", "Music (Jacobs)", "Informatics"] },
  "notre-dame":     { setting: "Suburban", settingSub: "near South Bend",              size: "Midsize", sizeSub: "~9,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Mendoza)", "Engineering", "Political science"] },

  /* ── Upper Midwest (WI/MN/IA/MO/NE/KS) ─────────────────────── */
  "wisconsin":      { setting: "City",     settingSub: "Madison",                      size: "Large",   sizeSub: "~36,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Biological sciences"] },
  "minnesota":      { setting: "City",     settingSub: "Minneapolis",                  size: "Large",   sizeSub: "~39,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business (Carlson)", "Psychology"] },
  "iowa":           { setting: "City",     settingSub: "Iowa City",                    size: "Large",   sizeSub: "~22,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Creative writing (Writers' Workshop)", "Business (Tippie)", "Health sciences"] },
  "iowa-state":     { setting: "City",     settingSub: "Ames",                         size: "Large",   sizeSub: "~25,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Agriculture", "Design"] },
  "missouri":       { setting: "City",     settingSub: "Columbia, MO",                 size: "Large",   sizeSub: "~23,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Journalism", "Business", "Health sciences"] },
  "wustl":          { setting: "Suburban", settingSub: "St. Louis",                    size: "Midsize", sizeSub: "~8,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Pre-health & medicine", "Business (Olin)", "Engineering"] },
  "nebraska":       { setting: "City",     settingSub: "Lincoln",                      size: "Large",   sizeSub: "~19,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Agriculture", "Engineering", "Actuarial science & business"] },
  "kansas":         { setting: "Town",     settingSub: "Lawrence",                     size: "Large",   sizeSub: "~19,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Journalism", "Business"] },

  /* ── Texas ─────────────────────────────────────────────────── */
  "ut-austin":      { setting: "City",     settingSub: "Austin",                       size: "Large",   sizeSub: "~42,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business (McCombs)", "Computer science"] },
  "texas-am":       { setting: "City",     settingSub: "College Station",              size: "Large",   sizeSub: "~57,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Agriculture", "Business"] },
  "rice":           { setting: "Urban",    settingSub: "Houston",                      size: "Small",   sizeSub: "~4,500 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Natural sciences", "Music (Shepherd)"] },
  "ut-dallas":      { setting: "Suburban", settingSub: "Richardson, Dallas area",      size: "Large",   sizeSub: "~22,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Computer science", "Engineering", "Business"] },
  "university-of-houston":{ setting: "Urban", settingSub: "Houston",                   size: "Large",   sizeSub: "~38,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Hospitality management"] },
  "texas-tech":     { setting: "City",     settingSub: "Lubbock",                      size: "Large",   sizeSub: "~30,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Agriculture"] },
  "baylor":         { setting: "City",     settingSub: "Waco",                         size: "Large",   sizeSub: "~15,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Nursing & health", "Pre-law"] },
  "smu":            { setting: "Urban",    settingSub: "Dallas",                       size: "Midsize", sizeSub: "~7,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Cox)", "Engineering", "Arts"] },

  /* ── Southwest & Mountain (AZ/NV/NM/UT/CO) ─────────────────── */
  "asu":            { setting: "Urban",    settingSub: "Tempe, Phoenix area",          size: "Large",   sizeSub: "~65,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (W.P. Carey)", "Engineering", "Journalism (Cronkite)"] },
  "arizona":        { setting: "City",     settingSub: "Tucson",                       size: "Large",   sizeSub: "~37,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Optical sciences", "Engineering", "Business"] },
  "unlv":           { setting: "Urban",    settingSub: "Las Vegas",                    size: "Large",   sizeSub: "~26,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Hospitality management", "Business", "Engineering"] },
  "unr":            { setting: "City",     settingSub: "Reno",                         size: "Large",   sizeSub: "~17,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Journalism"] },
  "new-mexico":     { setting: "City",     settingSub: "Albuquerque",                  size: "Large",   sizeSub: "~16,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Nursing & health", "Anthropology"] },
  "utah":           { setting: "City",     settingSub: "Salt Lake City",               size: "Large",   sizeSub: "~26,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Computer science & games (EAE)", "Engineering", "Business"] },
  "byu":            { setting: "City",     settingSub: "Provo",                        size: "Large",   sizeSub: "~30,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Engineering", "Accounting"] },
  "colorado-boulder":{ setting: "City",    settingSub: "Boulder",                      size: "Large",   sizeSub: "~30,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Aerospace engineering", "Environmental science", "Business (Leeds)"] },
  "colorado-state": { setting: "City",     settingSub: "Fort Collins",                 size: "Large",   sizeSub: "~24,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Veterinary & animal sciences", "Engineering", "Environmental science"] },
  "colorado-mines": { setting: "Town",     settingSub: "Golden",                       size: "Midsize", sizeSub: "~5,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Geology & mining", "Computer science"] },

  /* ── Pacific Northwest (WA/OR/ID/MT) ───────────────────────── */
  "uw-seattle":     { setting: "Urban",    settingSub: "Seattle",                      size: "Large",   sizeSub: "~36,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Computer science (Allen School)", "Engineering", "Nursing & health"] },
  "washington-state":{ setting: "Rural",   settingSub: "Pullman",                      size: "Large",   sizeSub: "~20,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Veterinary medicine", "Communication"] },
  "oregon":         { setting: "City",     settingSub: "Eugene",                       size: "Large",   sizeSub: "~19,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Journalism & advertising", "Business (Lundquist)", "Architecture"] },
  "oregon-state":   { setting: "Town",     settingSub: "Corvallis",                    size: "Large",   sizeSub: "~26,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Forestry", "Oceanography"] },
  "portland-state": { setting: "Urban",    settingSub: "Portland",                     size: "Large",   sizeSub: "~16,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Engineering", "Urban studies & social work"] },
  "idaho":          { setting: "Town",     settingSub: "Moscow, ID",                   size: "Midsize", sizeSub: "~8,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Agriculture", "Natural resources"] },
  "montana":        { setting: "City",     settingSub: "Missoula",                     size: "Midsize", sizeSub: "~8,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Wildlife biology", "Journalism", "Forestry & conservation"] },

  /* ── Georgia & Florida ─────────────────────────────────────── */
  "georgia-tech":   { setting: "Urban",    settingSub: "Atlanta",                      size: "Large",   sizeSub: "~18,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Computer science", "Business"] },
  "uga":            { setting: "Town",     settingSub: "Athens, GA",                   size: "Large",   sizeSub: "~31,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Terry)", "Journalism (Grady)", "Agriculture & veterinary"] },
  "emory":          { setting: "Suburban", settingSub: "Atlanta",                      size: "Midsize", sizeSub: "~7,100 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Pre-health & nursing", "Business (Goizueta)", "Biology"] },
  "georgia-state":  { setting: "Urban",    settingSub: "Atlanta",                      size: "Large",   sizeSub: "~26,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Health sciences", "Policy & criminal justice"] },
  "florida":        { setting: "City",     settingSub: "Gainesville",                  size: "Large",   sizeSub: "~34,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business (Warrington)", "Journalism"] },
  "florida-state":  { setting: "City",     settingSub: "Tallahassee",                  size: "Large",   sizeSub: "~33,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Film", "Criminology"] },
  "ucf":            { setting: "Suburban", settingSub: "Orlando",                      size: "Large",   sizeSub: "~60,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Hospitality", "Computer science"] },
  "miami":          { setting: "Suburban", settingSub: "Coral Gables, FL",             size: "Midsize", sizeSub: "~12,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Marine science", "Music (Frost)", "Business"] },
  "usf":            { setting: "Urban",    settingSub: "Tampa",                        size: "Large",   sizeSub: "~37,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Health sciences", "Engineering", "Business"] },
  "fiu":            { setting: "Suburban", settingSub: "Miami",                        size: "Large",   sizeSub: "~47,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Hospitality", "Business", "Engineering"] },

  /* ── Mid-Atlantic / South Atlantic (NC/SC/VA/DC/MD/DE/WV) ──── */
  "unc":            { setting: "Town",     settingSub: "Chapel Hill",                  size: "Large",   sizeSub: "~20,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Journalism & media", "Business (Kenan-Flagler)", "Public health"] },
  "nc-state":       { setting: "City",     settingSub: "Raleigh",                      size: "Large",   sizeSub: "~26,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Design", "Agriculture & textiles"] },
  "duke":           { setting: "Suburban", settingSub: "Durham",                       size: "Midsize", sizeSub: "~6,600 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Public policy", "Engineering (Pratt)", "Biology & pre-med"] },
  "wake-forest":    { setting: "Suburban", settingSub: "Winston-Salem",               size: "Midsize", sizeSub: "~5,500 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Pre-law & pre-med", "Liberal arts"] },
  "unc-charlotte":  { setting: "Suburban", settingSub: "Charlotte",                    size: "Large",   sizeSub: "~24,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Computing"] },
  "south-carolina": { setting: "City",     settingSub: "Columbia, SC",                 size: "Large",   sizeSub: "~27,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["International business", "Hospitality", "Public health"] },
  "clemson":        { setting: "Rural",    settingSub: "Clemson",                      size: "Large",   sizeSub: "~22,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Agriculture"] },
  "virginia":       { setting: "City",     settingSub: "Charlottesville",              size: "Large",   sizeSub: "~17,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (McIntire)", "Engineering", "Politics & pre-law"] },
  "virginia-tech":  { setting: "Town",     settingSub: "Blacksburg",                   size: "Large",   sizeSub: "~30,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Architecture", "Agriculture"] },
  "gmu":            { setting: "Suburban", settingSub: "Fairfax, near DC",             size: "Large",   sizeSub: "~27,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Computer science & cybersecurity", "Business", "Public policy"] },
  "vcu":            { setting: "Urban",    settingSub: "Richmond",                     size: "Large",   sizeSub: "~21,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Arts (VCUarts)", "Nursing & health", "Business"] },
  "georgetown":     { setting: "Urban",    settingSub: "Washington, DC",               size: "Midsize", sizeSub: "~7,500 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["International affairs (SFS)", "Business (McDonough)", "Political science"] },
  "gwu":            { setting: "Urban",    settingSub: "Washington, DC",               size: "Midsize", sizeSub: "~11,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["International affairs", "Political science", "Business"] },
  "howard":         { setting: "Urban",    settingSub: "Washington, DC",               size: "Midsize", sizeSub: "~9,500 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["HBCU · Business", "Communications & media", "Health sciences"] },
  "maryland":       { setting: "Suburban", settingSub: "College Park, near DC",        size: "Large",   sizeSub: "~30,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Computer science", "Engineering", "Business (Smith)"] },
  "johns-hopkins":  { setting: "Urban",    settingSub: "Baltimore",                    size: "Midsize", sizeSub: "~6,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Public health & pre-med", "Biomedical engineering", "International studies"] },
  "delaware":       { setting: "Suburban", settingSub: "Newark, DE",                   size: "Large",   sizeSub: "~19,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Chemistry"] },
  "wvu":            { setting: "Town",     settingSub: "Morgantown",                   size: "Large",   sizeSub: "~21,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Forensic science", "Business"] },

  /* ── South (TN/KY/AL/MS/LA/AR/OK) ──────────────────────────── */
  "tennessee":      { setting: "City",     settingSub: "Knoxville",                    size: "Large",   sizeSub: "~31,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Supply chain management"] },
  "vanderbilt":     { setting: "Urban",    settingSub: "Nashville",                    size: "Midsize", sizeSub: "~7,100 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Education (Peabody)", "Engineering", "Music & pre-med"] },
  "kentucky":       { setting: "City",     settingSub: "Lexington",                    size: "Large",   sizeSub: "~23,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Nursing & health sciences", "Engineering", "Business"] },
  "louisville":     { setting: "Urban",    settingSub: "Louisville",                   size: "Large",   sizeSub: "~16,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Engineering", "Health sciences"] },
  "alabama":        { setting: "City",     settingSub: "Tuscaloosa",                   size: "Large",   sizeSub: "~33,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Culverhouse)", "Engineering", "Communication"] },
  "auburn":         { setting: "Town",     settingSub: "Auburn, AL",                   size: "Large",   sizeSub: "~25,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Agriculture & veterinary"] },
  "ole-miss":       { setting: "Town",     settingSub: "Oxford, MS",                   size: "Large",   sizeSub: "~18,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business & accountancy", "Journalism", "Pharmacy"] },
  "mississippi-state":{ setting: "Town",   settingSub: "Starkville",                   size: "Large",   sizeSub: "~18,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Agriculture", "Architecture"] },
  "lsu":            { setting: "City",     settingSub: "Baton Rouge",                  size: "Large",   sizeSub: "~28,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Coastal & environmental science"] },
  "tulane":         { setting: "Urban",    settingSub: "New Orleans",                  size: "Midsize", sizeSub: "~8,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Public health", "Business (Freeman)", "Architecture"] },
  "arkansas":       { setting: "Town",     settingSub: "Fayetteville",                 size: "Large",   sizeSub: "~25,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Business (Walton)", "Agriculture", "Engineering"] },
  "oklahoma":       { setting: "Town",     settingSub: "Norman",                       size: "Large",   sizeSub: "~22,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Meteorology", "Petroleum & energy engineering", "Business"] },
  "oklahoma-state": { setting: "Town",     settingSub: "Stillwater",                   size: "Large",   sizeSub: "~20,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Agriculture", "Business"] },

  /* ── Mountain West / Plains / Pacific (HI/AK/ND/SD/WY/NH/RI) ─ */
  "hawaii":         { setting: "Urban",    settingSub: "Honolulu",                     size: "Midsize", sizeSub: "~13,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Marine biology & oceanography", "Hospitality & tourism", "Asian & Pacific studies"] },
  "alaska-anchorage":{ setting: "Urban",   settingSub: "Anchorage",                    size: "Midsize", sizeSub: "~10,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Nursing & health", "Engineering", "Arctic & environmental studies"] },
  "north-dakota":   { setting: "City",     settingSub: "Grand Forks",                  size: "Midsize", sizeSub: "~10,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Aviation & aerospace", "Engineering", "Nursing"] },
  "south-dakota":   { setting: "Town",     settingSub: "Vermillion",                   size: "Midsize", sizeSub: "~7,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Business", "Health sciences", "Law & pre-law"] },
  "wyoming":        { setting: "Town",     settingSub: "Laramie",                      size: "Midsize", sizeSub: "~9,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Energy resources", "Agriculture"] },
  "unh":            { setting: "Town",     settingSub: "Durham, NH",                   size: "Midsize", sizeSub: "~12,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Business", "Marine & environmental science"] },
  "uri":            { setting: "Suburban", settingSub: "Kingston, RI",                 size: "Midsize", sizeSub: "~13,000 undergrads",  src: "U.S. News / IPEDS", url: "", knownFor: ["Pharmacy", "Oceanography", "Engineering"] },

  /* ── HBCUs, LACs & specialized institutes ──────────────────── */
  "spelman":        { setting: "Urban",    settingSub: "Atlanta",                      size: "Small",   sizeSub: "~2,300 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["HBCU women's college", "Pre-med & biology", "Psychology"] },
  "morehouse":      { setting: "Urban",    settingSub: "Atlanta",                      size: "Small",   sizeSub: "~2,600 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["HBCU men's college", "Business", "Political science"] },
  "florida-am":     { setting: "City",     settingSub: "Tallahassee",                  size: "Midsize", sizeSub: "~8,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["HBCU · Business", "Pharmacy", "Engineering (FAMU-FSU)"] },
  "cooper-union":   { setting: "Urban",    settingSub: "East Village, NYC",            size: "Small",   sizeSub: "~900 undergrads",     src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Architecture", "Fine art"] },
  "olin":           { setting: "Suburban", settingSub: "Needham, MA",                  size: "Small",   sizeSub: "~400 undergrads",     src: "U.S. News / IPEDS", url: "", knownFor: ["Project-based engineering", "Design", "Entrepreneurship"] },
  "harvey-mudd":    { setting: "Suburban", settingSub: "Claremont, CA",                size: "Small",   sizeSub: "~900 undergrads",     src: "U.S. News / IPEDS", url: "", knownFor: ["Engineering", "Computer science", "Physics & math"] },
  "pomona":         { setting: "Suburban", settingSub: "Claremont, CA",                size: "Small",   sizeSub: "~1,700 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Liberal arts", "Economics", "Sciences"] },
  "reed":           { setting: "Urban",    settingSub: "Portland, OR",                 size: "Small",   sizeSub: "~1,400 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Liberal arts", "Sciences", "Senior thesis & rigor"] },
  "oberlin":        { setting: "Town",     settingSub: "Oberlin, OH",                  size: "Small",   sizeSub: "~2,900 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Music (Conservatory)", "Liberal arts", "Environmental studies"] },
  "middlebury":     { setting: "Rural",    settingSub: "Middlebury, VT",               size: "Small",   sizeSub: "~2,800 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Languages", "International studies", "Environmental studies"] },
  "bowdoin":        { setting: "Town",     settingSub: "Brunswick, ME",                size: "Small",   sizeSub: "~1,900 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Liberal arts", "Government", "Environmental studies"] },
  "carleton":       { setting: "Town",     settingSub: "Northfield, MN",               size: "Small",   sizeSub: "~2,000 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Liberal arts", "Sciences", "Economics"] },
  "grinnell":       { setting: "Town",     settingSub: "Grinnell, IA",                 size: "Small",   sizeSub: "~1,700 undergrads",   src: "U.S. News / IPEDS", url: "", knownFor: ["Liberal arts (open curriculum)", "Sciences", "Economics"] }
};
