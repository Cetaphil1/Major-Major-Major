/* data.jsx — Fit Beyond Interest content model
   8 quiz sections with realistic items, context options, and a worked
   sample report (a Computer Science student at elevated switch risk).
   Exposed on window for the screen scripts. */

const DIMENSIONS = [
  { key: "interest",   name: "Interest fit",       color: "var(--blue)",        short: "Interest" },
  { key: "confidence", name: "Skill confidence",   color: "var(--blue-bright)", short: "Confidence" },
  { key: "workload",   name: "Workload tolerance", color: "var(--purple)",      short: "Workload" },
  { key: "motivation", name: "Motivation",         color: "var(--purple-deep)", short: "Motivation" },
  { key: "career",     name: "Career clarity",     color: "var(--green)",       short: "Career" },
  { key: "school",     name: "School fit",         color: "var(--pink)",        short: "School fit" },
  { key: "belonging",  name: "Belonging",          color: "var(--pink-deep)",   short: "Belonging" },
  { key: "burnout",    name: "Burnout risk",       color: "var(--red)",         short: "Burnout" },
];

const AGREE = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
const FREQ  = ["Never", "Rarely", "Sometimes", "Often", "Almost always"];

const SECTIONS = [
  {
    key: "interest", number: 1, dim: "interest",
    title: "Interest fit",
    subtitle: "Whether the subject itself genuinely pulls you in — before and during college.",
    anchors: ["Strongly disagree", "Strongly agree"], scale: AGREE,
    questions: [
      { id: "int_1", text: "The core subject matter of my major genuinely fascinates me, not just the career it leads to." },
      { id: "int_2", text: "I explored this field on my own — reading, projects, or clubs — before I had to declare." },
      { id: "int_3", text: "The topics I find most stimulating are central to my major, not on its edges.", reverse: false },
    ],
  },
  {
    key: "confidence", number: 2, dim: "confidence",
    title: "Skill confidence",
    subtitle: "How capable you feel handling the actual skills your major demands.",
    anchors: ["Strongly disagree", "Strongly agree"], scale: AGREE,
    questions: [
      { id: "con_1", text: "I feel capable of handling the technical or analytical skills my major requires." },
      { id: "con_2", text: "When I struggle with material, I usually recover and figure it out." },
      { id: "con_3", text: "I often feel underprepared compared to my peers in core courses.", reverse: true },
    ],
  },
  {
    key: "workload", number: 3, dim: "workload",
    title: "Workload tolerance",
    subtitle: "How the real pace and volume of work in your major sits with you.",
    anchors: ["Never", "Almost always"], scale: FREQ,
    questions: [
      { id: "wl_1", text: "I keep up with the volume of work in my major without sacrificing my health." },
      { id: "wl_2", text: "I feel buried by problem sets, labs, or readings in this field.", reverse: true },
      { id: "wl_3", text: "I can sustain the late nights and deadlines this major expects." },
    ],
  },
  {
    key: "motivation", number: 4, dim: "motivation",
    title: "Motivation",
    subtitle: "What's actually driving your effort — curiosity, or outside pressure.",
    anchors: ["Strongly disagree", "Strongly agree"], scale: AGREE,
    questions: [
      { id: "mot_1", text: "I study because I'm genuinely curious, not only to pass or please others." },
      { id: "mot_2", text: "I'd keep learning this material even if it weren't required." },
      { id: "mot_3", text: "Most of my drive in this major comes from pressure to not fall behind.", reverse: true },
    ],
  },
  {
    key: "career", number: 5, dim: "career",
    title: "Career clarity",
    subtitle: "How clearly you can picture — and want — where this major leads.",
    anchors: ["Strongly disagree", "Strongly agree"], scale: AGREE,
    questions: [
      { id: "car_1", text: "I have a clear picture of the kind of work this major leads to." },
      { id: "car_2", text: "The careers connected to my field genuinely appeal to me." },
      { id: "car_3", text: "I'm unsure what I'd actually do with this degree after graduating.", reverse: true },
    ],
  },
  {
    key: "school", number: 6, dim: "school",
    title: "School fit",
    subtitle: "Whether your specific program and campus support how you work.",
    anchors: ["Strongly disagree", "Strongly agree"], scale: AGREE,
    questions: [
      { id: "sch_1", text: "My program's culture and teaching style suit how I learn best." },
      { id: "sch_2", text: "I can get the courses, labs, and advising I need at my school." },
      { id: "sch_3", text: "The competition in my program leaves me more drained than motivated.", reverse: true },
    ],
  },
  {
    key: "belonging", number: 7, dim: "belonging",
    title: "Belonging",
    subtitle: "How at home you feel among other students in your field.",
    anchors: ["Strongly disagree", "Strongly agree"], scale: AGREE,
    questions: [
      { id: "bel_1", text: "I feel a sense of belonging among other students in my major." },
      { id: "bel_2", text: "I have people in this field I can turn to when things get hard." },
      { id: "bel_3", text: "I often feel like an outsider in my major.", reverse: true },
    ],
  },
  {
    key: "burnout", number: 8, dim: "burnout",
    title: "Burnout risk",
    subtitle: "Your emotional fuel level this term — honest is more useful than hopeful.",
    anchors: ["Strongly disagree", "Strongly agree"], scale: AGREE,
    questions: [
      { id: "bo_1", text: "I frequently feel emotionally exhausted by the work in my major.", reverse: true },
      { id: "bo_2", text: "Stress from this major spills into my sleep, mood, or relationships.", reverse: true },
      { id: "bo_3", text: "I can still recharge and come back engaged after a heavy stretch." },
    ],
  },
];

const TOTAL_QUESTIONS = SECTIONS.reduce((n, s) => n + s.questions.length, 0);

const COLLEGES = [
  "University of California, Berkeley", "University of Michigan", "Arizona State University",
  "University of Texas at Austin", "New York University", "Georgia Institute of Technology",
  "Ohio State University", "University of Washington", "Boston University", "Purdue University",
];
const MAJORS = [
  "Computer Science", "Mechanical Engineering", "Biology (Pre-Med)", "Psychology",
  "Business Administration", "Economics", "Nursing", "Political Science",
  "Mathematics", "English", "Graphic Design", "Communications",
];

const STAGES = ["Prospective", "First year", "Sophomore", "Junior", "Senior", "Fifth year+"];
const ENROLLMENT = ["Full time", "Part time"];
const INTENT = [
  { key: "first",    t: "Choosing my first major",    d: "I haven't committed yet." },
  { key: "switch",   t: "Considering switching",      d: "I'm in a major but unsure." },
  { key: "exploring",t: "Just exploring options",     d: "Comparing a few directions." },
];

/* Worked sample — a CS student who likes the subject but is grinding down. */
const SAMPLE_REPORT = {
  student: { college: "University of California, Berkeley", major: "Computer Science", stage: "Sophomore", intent: "switch" },
  overall: 68,                 // /100
  overallLabel: "Moderate fit",
  switchRisk: { level: "Elevated", pct: 64, tone: "warn" },
  burnoutRisk: { level: "High",    pct: 78, tone: "risk" },
  scores: { // 0–100 per dimension
    interest: 86, confidence: 71, workload: 38, motivation: 64,
    career: 80, school: 58, belonging: 44, burnout: 30,
  },
  strongest: [
    { key: "interest", name: "Interest fit", score: 86 },
    { key: "career",   name: "Career clarity", score: 80 },
    { key: "confidence", name: "Skill confidence", score: 71 },
  ],
  weakest: [
    { key: "burnout",  name: "Burnout resilience", score: 30 },
    { key: "workload", name: "Workload tolerance", score: 38 },
    { key: "belonging",name: "Belonging", score: 44 },
  ],
  nextSteps: [
    { t: "Protect recovery, not just output.", d: "Your interest is real, but burnout resilience is your lowest signal. Build two fixed no-work blocks into each week before adding anything new." },
    { t: "Talk to your advisor about course load — this term.", d: "Workload tolerance is well below your interest. A lighter or re-sequenced semester may keep you in the field you actually like." },
    { t: "Find one study group or club in the major.", d: "Belonging is among your weakest areas and one of the strongest predictors of staying. One small group can move it fast." },
    { t: "Run a 4-week check-in before any switch.", d: "Don't decide mid-crunch. Re-take this quiz after midterms to see whether the dip is the workload or the field." },
  ],
  betterFit: [
    { n: "Applied Mathematics", w: "92% aligned" },
    { n: "Information Science",  w: "89% aligned" },
    { n: "Cognitive Science",    w: "85% aligned" },
    { n: "Data Science",         w: "83% aligned" },
  ],
  questions: [
    "Is it the subject I'm tired of, or the pace and volume of this program?",
    "Would a lighter term or a different school make this major sustainable?",
    "Which parts of the work energize me, and which consistently drain me?",
    "If I switched, would I keep the parts of this field I genuinely love?",
    "Who in this major do I actually want to be like in four years?",
  ],
};

Object.assign(window, {
  DIMENSIONS, SECTIONS, TOTAL_QUESTIONS, AGREE, FREQ,
  COLLEGES, MAJORS, STAGES, ENROLLMENT, INTENT, SAMPLE_REPORT,
});
