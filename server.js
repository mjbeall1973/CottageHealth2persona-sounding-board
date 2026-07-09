// server.js — Persona Sounding Board (hosted version)
// Serves the tool, gates it behind a shared password, calls the Anthropic API to
// generate persona reactions, can pull copy from a URL or a PDF, and logs every
// evaluation to a central SQLite database so usage can be tracked across the team.

require("dotenv").config();
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const Database = require("better-sqlite3");
const Anthropic = require("@anthropic-ai/sdk");
const pdfParse = require("pdf-parse");

const { PERSONAS } = require("./personas");
const { BRAND_VOICE, PHOTOGRAPHY } = require("./brand-voice");

// ---------- config ----------
const PORT = process.env.PORT || 3000;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "cottage2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "evaluations.db");
const MAX_SOURCE_CHARS = 16000; // cap text pulled from URLs/PDFs before sending to the model

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("\n[!] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.\n");
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------- database ----------
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    run_id TEXT NOT NULL,
    user TEXT,
    atype TEXT,
    source TEXT,
    copy_preview TEXT,
    image_preview TEXT,
    persona_id TEXT,
    persona_name TEXT,
    score INTEGER,
    verdict TEXT,
    fix TEXT
  );
`);
const insertRow = db.prepare(`
  INSERT INTO evaluations
    (ts, run_id, user, atype, source, copy_preview, image_preview, persona_id, persona_name, score, verdict, fix)
  VALUES (@ts, @run_id, @user, @atype, @source, @copy_preview, @image_preview, @persona_id, @persona_name, @score, @verdict, @fix)
`);
db.exec(`CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, user TEXT, text TEXT);`);
const insertFeedback = db.prepare(`INSERT INTO feedback (ts, user, text) VALUES (@ts, @user, @text)`);
// full per-run snapshot so a user can reopen a past test (saved automatically by user)
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    ts TEXT, user TEXT, atype TEXT, source TEXT,
    context TEXT, copy TEXT, image_note TEXT,
    persona_ids TEXT, results_json TEXT, avg_score REAL
  );
`);
const insertRun = db.prepare(`INSERT OR REPLACE INTO runs
  (run_id, ts, user, atype, source, context, copy, image_note, persona_ids, results_json, avg_score)
  VALUES (@run_id, @ts, @user, @atype, @source, @context, @copy, @image_note, @persona_ids, @results_json, @avg_score)`);
// time-on-tool: accumulate active seconds per user per day (from client heartbeats)
db.exec(`CREATE TABLE IF NOT EXISTS activity (user TEXT, day TEXT, seconds INTEGER, PRIMARY KEY (user, day));`);
const upsertActivity = db.prepare(`INSERT INTO activity (user, day, seconds) VALUES (@user, @day, @seconds)
  ON CONFLICT(user, day) DO UPDATE SET seconds = seconds + @seconds`);
const REPORT_TOKEN = process.env.REPORT_TOKEN || SESSION_SECRET;

// ---------- app ----------
const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// ---------- auth (shared-password sign-in) ----------
function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}
function makeToken(email) {
  const payload = Buffer.from(email || "user").toString("base64url");
  return payload + "." + sign(payload);
}
function verifyToken(token) {
  if (!token || token.indexOf(".") < 0) return null;
  const [payload, sig] = token.split(".");
  if (sign(payload) !== sig) return null;
  try { return Buffer.from(payload, "base64url").toString("utf8"); } catch (e) { return null; }
}
function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const hit = raw.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}
function requireAuth(req, res, next) {
  const email = verifyToken(getCookie(req, "pb_auth"));
  if (!email) {
    if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Not signed in." });
    return res.redirect("/login.html");
  }
  req.userEmail = email;
  next();
}

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!password || password !== LOGIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  const token = makeToken((email || "").trim() || "user");
  res.setHeader("Set-Cookie",
    `pb_auth=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`);
  res.json({ ok: true });
});
app.post("/api/logout", (req, res) => {
  res.setHeader("Set-Cookie", "pb_auth=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  res.json({ ok: true });
});

// login page + its assets must be reachable without auth
app.get("/login.html", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));

// everything else requires sign-in
// ---------- owner report (per-user analytics) — token OR signed-in ----------
function ownerRows() {
  const rows = db.prepare(`SELECT user,
      COUNT(DISTINCT run_id) AS evaluations,
      AVG(score) AS avg_score,
      MIN(ts) AS first_seen, MAX(ts) AS last_seen,
      COUNT(DISTINCT substr(ts,1,10)) AS active_days
    FROM evaluations GROUP BY user ORDER BY evaluations DESC`).all();
  const fb = {}; db.prepare(`SELECT user, COUNT(*) n FROM feedback GROUP BY user`).all().forEach(r => fb[r.user] = r.n);
  const act = {}; db.prepare(`SELECT user, SUM(seconds) s FROM activity GROUP BY user`).all().forEach(r => act[r.user] = r.s || 0);
  return rows.map(r => ({ ...r, feedback: fb[r.user] || 0, active_minutes: Math.round((act[r.user] || 0) / 60) }));
}
function ownerAuthed(req) {
  if (verifyToken(getCookie(req, "pb_auth"))) return true;
  return req.query && req.query.token && req.query.token === REPORT_TOKEN;
}
app.get("/api/owner-report.csv", (req, res) => {
  if (!ownerAuthed(req)) return res.status(401).json({ error: "Not authorized." });
  const rows = ownerRows();
  const head = ["user", "evaluations", "avg_score", "minutes_on_tool", "active_days", "first_seen", "last_seen", "feedback_submitted"];
  const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const lines = [head.join(",")];
  rows.forEach(r => lines.push([r.user, r.evaluations, r.avg_score == null ? "" : (Math.round(r.avg_score * 10) / 10), r.active_minutes, r.active_days, r.first_seen, r.last_seen, r.feedback].map(q).join(",")));
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="voice-guide-owner-report.csv"');
  res.send(lines.join("\n"));
});
app.get("/api/owner-report.txt", (req, res) => {
  if (!ownerAuthed(req)) return res.status(401).send("Not authorized.");
  const rows = ownerRows();
  const totalRuns = db.prepare("SELECT COUNT(DISTINCT run_id) n FROM evaluations").get().n;
  const overall = db.prepare("SELECT AVG(score) a FROM evaluations WHERE score IS NOT NULL").get().a;
  const fb = db.prepare("SELECT ts, user, text FROM feedback ORDER BY ts DESC LIMIT 50").all();
  const L = [];
  L.push("PHILANTHROPY VOICE GUIDE — weekly usage report");
  L.push(new Date().toLocaleString());
  L.push(`\nTotals: ${totalRuns} evaluations · ${rows.length} users · overall avg ${overall == null ? "—" : (Math.round(overall * 10) / 10)}/10`);
  L.push("\nUSERS (most active first):");
  rows.forEach(r => L.push(`- ${r.user}: ${r.evaluations} evals, avg ${r.avg_score == null ? "—" : (Math.round(r.avg_score * 10) / 10)}/10, ${r.active_minutes} min on tool, ${r.active_days} active day(s), last ${String(r.last_seen).slice(0, 10)}${r.feedback ? `, ${r.feedback} feedback` : ""}`));
  L.push("\nRECENT FEEDBACK:");
  if (!fb.length) L.push("- (none yet)");
  fb.forEach(f => L.push(`- [${String(f.ts).slice(0, 10)}] ${f.user}: ${f.text}`));
  res.setHeader("Content-Type", "text/plain");
  res.send(L.join("\n"));
});

// the login page needs its logo before sign-in — serve it (and the favicon) without auth
app.get("/donor-listening-room-logo.png", (req, res) => res.sendFile(path.join(__dirname, "public", "donor-listening-room-logo.png")));

app.use(requireAuth);
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use(express.static(path.join(__dirname, "public")));

// time-on-tool heartbeat (each ping = ~30s of active use)
const PING_SECONDS = 30;
app.post("/api/ping", (req, res) => {
  const day = new Date().toISOString().slice(0, 10);
  try { upsertActivity.run({ user: req.userEmail || "user", day, seconds: PING_SECONDS }); } catch (e) {}
  res.json({ ok: true });
});

// ---------- config for the frontend ----------
app.get("/api/config", (req, res) => {
  res.json({ personas: PERSONAS, brandVoice: BRAND_VOICE, photography: PHOTOGRAPHY, user: req.userEmail });
});

// ---------- source extraction: URL ----------
function decodeEntities(s) {
  return (s || "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&lsquo;|&apos;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–");
}
function htmlToText(html) {
  let h = html;
  // pull a few useful hints first
  const titleMatch = h.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = h.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const ogImg = h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const ogImgAlt = h.match(/<meta[^>]+property=["']og:image:alt["'][^>]+content=["']([^"']*)["']/i);

  // collect image alt text as visual hints
  const alts = [];
  const imgRe = /<img[^>]+alt=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = imgRe.exec(h)) && alts.length < 12) {
    const a = m[1].trim();
    if (a && a.length > 2) alts.push(a);
  }

  // strip non-content elements, then all tags
  h = h.replace(/<script[\s\S]*?<\/script>/gi, " ")
       .replace(/<style[\s\S]*?<\/style>/gi, " ")
       .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
       .replace(/<!--[\s\S]*?-->/g, " ")
       .replace(/<header[\s\S]*?<\/header>/gi, " ")
       .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
       .replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  const text = decodeEntities(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

  return {
    title: titleMatch ? decodeEntities(titleMatch[1].replace(/\s+/g, " ").trim()) : "",
    description: descMatch ? decodeEntities(descMatch[1].trim()) : "",
    text,
    imageHints: alts.map(decodeEntities),
    ogImage: ogImg ? ogImg[1] : "",
    ogImageAlt: ogImgAlt ? decodeEntities(ogImgAlt[1]) : ""
  };
}

app.post("/api/extract-url", async (req, res) => {
  let { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "No URL provided." });
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    const resp = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PersonaSoundingBoard/2.0; +https://cottagehealth.org)",
        "Accept": "text/html,application/xhtml+xml,application/pdf,*/*"
      }
    });
    clearTimeout(timeout);
    if (!resp.ok) return res.status(502).json({ error: `Could not load that page (HTTP ${resp.status}).` });

    const ctype = (resp.headers.get("content-type") || "").toLowerCase();

    // URL points straight at a PDF
    if (ctype.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
      const buf = Buffer.from(await resp.arrayBuffer());
      const parsed = await pdfParse(buf);
      const text = (parsed.text || "").replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
      return res.json({
        sourceLabel: `PDF at ${url}`,
        copy: text.slice(0, MAX_SOURCE_CHARS),
        image: "",
        truncated: text.length > MAX_SOURCE_CHARS
      });
    }

    const html = await resp.text();
    const ex = htmlToText(html);
    let copy = "";
    if (ex.title) copy += ex.title + "\n\n";
    if (ex.description) copy += ex.description + "\n\n";
    copy += ex.text;
    copy = copy.slice(0, MAX_SOURCE_CHARS);

    let image = "";
    if (ex.ogImageAlt) image = ex.ogImageAlt;
    else if (ex.imageHints.length) image = "Images on the page include: " + ex.imageHints.slice(0, 6).join("; ") + ".";
    else if (ex.ogImage) image = "Page has a primary social-share image (no alt text provided).";

    res.json({
      sourceLabel: ex.title ? `Web page: ${ex.title}` : `Web page: ${url}`,
      copy,
      image,
      truncated: (ex.text || "").length > MAX_SOURCE_CHARS
    });
  } catch (e) {
    const msg = e && e.name === "AbortError" ? "The page took too long to respond." : (e && e.message) || "Fetch failed.";
    res.status(502).json({ error: "Couldn't read that URL: " + msg });
  }
});

// ---------- source extraction: PDF upload ----------
app.post("/api/extract-pdf", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No PDF uploaded." });
  try {
    const parsed = await pdfParse(req.file.buffer);
    let text = (parsed.text || "").replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
    const truncated = text.length > MAX_SOURCE_CHARS;
    text = text.slice(0, MAX_SOURCE_CHARS);
    const thin = text.length < 40;
    res.json({
      sourceLabel: `PDF: ${req.file.originalname}`,
      pages: parsed.numpages || null,
      copy: text,
      image: thin ? "This PDF has little or no extractable text — it may be image-based (a scan or a designed graphic). Describe the visual in the image box for a better read." : "",
      truncated,
      thin
    });
  } catch (e) {
    res.status(422).json({ error: "Couldn't read that PDF: " + ((e && e.message) || "parse failed") });
  }
});

// ---------- evaluation ----------
const TIER1_WORDS = "Here / Right here, Bold / Boldly, Rise, Possible, Neighbors, Belong / Belonging, Together, Brave / Bravery, Proven, Closer, Lift / Uplift, Hope, Champion, Thrive";
const TIER2_WORDS = "ACTION bank — Accelerating, Advancing, Building, Catalyzing, Championing, Creating, Daring, Delivering, Driving, Elevating, Forging, Igniting, Imagining, Innovating, Launching, Leading, Mobilizing, Powering, Reimagining, Rising, Shaping, Sparking, Transforming, Unlocking. LOCAL bank — Anchored, Backyard, Close-to-home, Coast-to-valley, Community, Familiar, Grassroots, Home, Hometown, Local, Nearby, Neighbors, Neighborhood, Ours, Place-based, Region, Rooted, Shared, Here. HUMANIZING bank — Caring, Compassionate, Comfort, Dignity, Empathy, Families, Gentle, Gratitude, Healing, Heart, Human, Kindness, Listening, Loved ones, Neighborly, Personal, Present, Real, Stories, Trusted, Warmth, Wholeness. EMPOWERING bank — Activate, Advocate, Champion, Embolden, Empower, Enable, Encourage, Energize, Equip, Fuel, Galvanize, Inspire, Invest, Lift, Mobilize, Strengthen, Support, Unleash, Uplift";
const DO_NOT_USE = "TRANSACTIONAL / SALESY (act now, limited time, last chance, don't miss out, deadline, for just $X a day, donate now as the only CTA, buy in, transaction, process your gift, we need your money, give $X or more); GUILT / FEAR-BASED (you owe, you should, don't let them down, before it's too late, without you they'll suffer, imagine the suffering, failure, shame, burden, desperate, begging, plead, victims, tragic); BOASTFUL / SUPERLATIVE (best, #1, number one, unrivaled, unmatched, unparalleled, the finest, premier, elite, revolutionary, second to none, leading the nation, proud to be the best); INAUTHENTIC / CORPORATE JARGON (synergy, leverage, best-in-class, ecosystem, stakeholders, utilize, robust, game-changer, move the needle, value-add, circle back, passionate about, committed to excellence, empty 'make a difference'); TOO HUMBLE / MOUSEY / SOFT (just, only, a little, if you can, maybe, perhaps, we hope you might, sorry to bother, we apologize, if it's not too much trouble, we're just a small foundation, would you possibly consider, hedging qualifiers, passive voice)";
const SCORING_GUIDE = `HOW TO SCORE (be encouraging, not punitive — and actively reinforce the Foundation's voice):
- Default generous. Most thoughtful nonprofit copy deserves a 5 or higher. Start around 6-7 and adjust from there.

PRIORITY & WEIGHTING — apply this hierarchy to BOTH the score and the order you raise issues (most important first):
1. INSPIRATION OVER OBLIGATION (CRITICAL) — hope and possibility, never guilt, fear, or pressure.
2. COMMUNITY FOCUS, OUTSIDE-IN (CRITICAL) — the copy should center benefit to the COMMUNITY, framed as an inclusive "we / our / us" (the donor, neighbors, and the Foundation together). Watch the word "we" closely: FLAG every institutional or exclusive "we / our / us" — Cottage, the hospital, or the health system talking about ITSELF — in "fallsFlat", quote it in "avoid", and in "fix" show how to turn it outside-in (toward the community and the donor). REWARD inclusive, community "we." This is an outside-in vs. inside-out test: it should feel like it's about the community's benefit, not the institution's.
3. WARMTH & HUMANITY (HIGH) — warm, personal, neighborly; not clinical.
4. DONOR EMPOWERMENT (HIGH) — the donor/reader is the one who makes the impact possible.
5. LOCAL RELEVANCE (HIGH) — coast-to-valley; Santa Barbara / Santa Ynez specificity.
6. AVOIDS DO-NOT-USE LANGUAGE (HIGH) — see the avoid list below.
7. RELATIONSHIP-BUILDING OVER THE ASK (HIGH) — connection, gratitude, story, and belonging count fully, even with no hard "donate."
8. ON-BRAND VOICE OVERALL (HIGH) — fits the calibration: daring-but-not-reckless, earned, quiet confidence.
9. TIER 1 CORE VOCABULARY (MEDIUM) — reward use of the core power words.
10. TIER 2 WORD BANKS (MEDIUM) — reward use of the Action / Local / Humanizing / Empowering vocabulary.
11. CLARITY & READABILITY (MEDIUM) — clear and easy to grasp.

HOW TO APPLY THE WEIGHTS:
- CRITICAL criteria move the score the MOST. Copy that truly nails inspiration and community-focus can score high even if smaller things are off; copy that fails them (guilt-driven, or institution-centric "we") should score LOW even if the vocabulary is on point.
- HIGH criteria meaningfully raise or lower the score; MEDIUM criteria only nudge it.
- In "fallsFlat" and "fix", address the HIGHEST-priority problems FIRST and don't lead with a low-priority nitpick when a higher-priority issue exists. Keep "fix" focused on the single most important change by this hierarchy.

- REWARD ON-VOICE VOCABULARY: scan the copy for the Tier 1 and Tier 2 words/themes below. Every on-voice word the copy uses EARNS points — the more it speaks in our shared vocabulary, the higher the score (copy that is genuinely rich in Tier 1 / Tier 2 language should land 8-10). List the exact on-voice words you spotted in "onVoice", and recognize them warmly in "resonates" (e.g. "love that you said 'right here' and 'neighbors'").
- TAG OFF-VOICE LANGUAGE: scan the copy for the "words & phrases to avoid" below. List EVERY offending word or phrase you find, quoted exactly, in "avoid"; also name it in "fallsFlat" and give the on-voice replacement in "fix". Using avoid-list language is the main reason to score BELOW 5.
- A great deal of philanthropy is RELATIONSHIP-BUILDING, not transactional asking for money. Copy that builds connection, gratitude, belonging, story, or community is doing its job — score it WELL even if it has no hard "donate" ask. Never mark copy down for "no clear ask," "doesn't push for a donation," or "lacks urgency."
- Rough scale: 8-10 = on-voice and uses our Tier 1 / Tier 2 vocabulary; 5-7 = solid and on-voice but could lean into the vocabulary further; below 5 = uses avoid-list language (tag which).
- Stay in character for WHAT resonates, what falls flat, and your "fix" — but apply this scoring approach to the number, the "onVoice" list, and the "avoid" list.

TIER 1 — core power words (reward these most): ${TIER1_WORDS}.
TIER 2 — word banks to reward: ${TIER2_WORDS}.
WORDS & PHRASES TO AVOID (tag every one the copy actually uses): ${DO_NOT_USE}.`;

const REGION_NOTES = {
  central: "YOUR REGION — The Central Core (Santa Barbara County): an audience balancing a high-end, leisure-oriented lifestyle with the pressure of a hyper-expensive housing market; they value wellness, prestige, and deep community roots. It spans Montecito/Hope Ranch retirees and wealthy remote workers who want premium, hyper-coordinated, concierge, high-touch and private care; UCSB/Isla Vista/Goleta tech and academic transplants who are tech-forward, independent, and want fast clinical turnarounds and telehealth; and a large, often-overlooked Santa Maria/Lompoc working class in agriculture and aerospace — family-centric, frequently bilingual (Spanish/English), and facing real geographic and economic barriers to care. React with this local lens and reward copy/imagery that feel authentic to it.",
  northern: "YOUR REGION — The Northern Reach (San Luis Obispo County): slower, more rustic, deeply tied to the outdoors, agriculture, and Cal Poly — 'SLO' balanced, unhurried living. Locals are skeptical of big-city infrastructure and fiercely loyal to local institutions, valuing down-to-earth, relational care over flashy corporate models; active outdoor enthusiasts and students focus on sports medicine, physical therapy, and rapid recovery so they can get back to hiking, surfing, and cycling. React with this local lens.",
  southern: "YOUR REGION — The Southern Reach (Ventura County): the transition zone where the relaxed Central Coast meets the fast-paced, commuter-heavy energy of greater Los Angeles. LA-spillover commuters prize efficiency, convenience, and evening/weekend availability because long commutes constrain their time; coastal suburban families navigate multi-generational care and talk in terms of school sports physicals, weekend urgent-care access, and reliable insurance coverage. React with this local lens.",
  all: ""
};
function personalizeNote(pz) {
  if (!pz || typeof pz !== "object") return "";
  const lean = pz.lean;
  const role = (pz.role || "").toString().slice(0, 80);
  const use = (pz.use || "").toString().slice(0, 80);
  const learned = (pz.learned || "").toString().slice(0, 400);
  let s = "PERSONALIZATION (tune the STYLE of your feedback to this user — but NEVER lower the bar on the Critical criteria, inspiration and community-focus): ";
  if (lean === "creative") s += "This user leans CREATIVE — favor narrative, voice, emotional craft, and bolder phrasing in your suggestions; you may push warmth, story, and inspiration harder.";
  else if (lean === "technical") s += "This user leans TECHNICAL/PRECISE — favor clarity, structure, accuracy, and on-brand discipline; keep fixes concrete and specific.";
  else s += "This user wants a BALANCED approach — blend creative voice with clarity and discipline.";
  if (use) s += ` Their primary use of this tool is ${use} — tailor examples and the "fix" to that kind of work.`;
  if (role) s += ` Their role is ${role}.`;
  if (learned) s += ` WHAT THE TOOL HAS LEARNED about this user's writing so far (use gently and only if relevant, to sound like you remember them): ${learned}`;
  return s;
}
function buildPrompt(p, atype, copy, img, hasImage, context, imageCount, region, personalize) {
  const regionNote = REGION_NOTES[region] || "";
  const pzNote = personalizeNote(personalize);
  return `You are role-playing a marketing audience persona to pressure-test a fundraising asset for the Cottage Health Foundation, which supports Santa Barbara Cottage Hospital, Santa Ynez Valley Cottage Hospital and Goleta Valley Cottage Hospital in the Santa Barbara, California area.

REACT AS THIS PERSON, in first person, honestly and specifically. Do not be polite for its own sake.

PERSONA — ${p.name}, ${p.role}.${regionNote ? `\n${regionNote}` : ""}
Background: ${p.blurb}
Lifestyle (use this to make your voice specific and concrete): you drive ${p.profile.car}; you shop at ${p.profile.shops}; brands you like: ${p.profile.brands}; personality type: ${p.profile.personality}; where you get information: ${p.profile.media}.
What moves you: ${p.motivations.join("; ")}.
What turns you off: ${p.objections.join("; ")}.
Tone you respond to: ${p.tone}
For images, you lean into: ${p.imgYes.join("; ")}. You dislike: ${p.imgNo.join("; ")}.

${BRAND_VOICE.promptSummary}${pzNote ? "\n\n" + pzNote : ""}

${SCORING_GUIDE}

${context ? `WHAT THE USER IS TESTING (their goal/context — weigh this in your reaction and your score): "${context}"\n` : ""}ASSET TYPE: ${atype}
COPY: """${copy || "(none provided)"}"""
IMAGE/VISUAL CONCEPT: """${img || "(none provided)"}"""
${hasImage ? `\n${imageCount > 1 ? `THIS IS A MULTI-PAGE PIECE — ${imageCount} page images are attached in order, along with the copy text above. Judge the WHOLE piece together (the copy AND the design/imagery across all pages) for ONE reaction and score.` : "AN ACTUAL PHOTOGRAPH IS ATTACHED."} Look at the image(s) and react to what you literally see — subject, warmth, light, composition, layout, and whether it tells a story and connects to philanthropy. Judge visual fit using your image lean-in/avoid above. ${PHOTOGRAPHY.promptBlock} For imagery, "do-not-use" means cold/clinical, sterile equipment, staged stock, faceless, or guilt-heavy shots — only those should pull the score below 5. In "resonates"/"fallsFlat" name what you actually see, and make "fix" a concrete art-direction change.\n` : ""}
React as THIS persona, then score the asset using the HOW TO SCORE rules above (generous by default; below 5 only for do-not-use language${hasImage ? "/imagery" : ""}, and reward on-voice vocabulary). Also rate, from 0 to 10, how strongly THIS asset delivers on each of these areas (used to build a heat map of strengths and weaknesses): inspiration (hope and possibility, not obligation), community (benefit framed for the whole community — inclusive "we / us / our," outside-in, NOT the institution talking about itself), warmth (warmth and humanity), empowerment (makes the donor feel they personally make the impact), local (Santa Barbara / coast-to-valley relevance), onBrand (uses the Foundation's voice and vocabulary), clarity (clear and easy to grasp). Respond with ONLY minified JSON (no markdown, no commentary) using exactly these keys:
{"score": <integer 0-10 per the HOW TO SCORE rules>, "headline": "<<=14 words, your gut reaction in first person>", "resonates": ["<short>", ...up to 3], "fallsFlat": ["<short>", ...up to 3], "onVoice": ["<exact Tier 1 / Tier 2 word or phrase the copy actually used>", ...up to 6, [] if none], "avoid": ["<exact avoid-list word or phrase the copy actually used (include institutional 'we/our/us')>", ...up to 6, [] if none], "fix": "<the single highest-priority change per the PRIORITY hierarchy>", "verdict": "<one of: Love it, Interested, Lukewarm, Not for me>", "dimensions": {"inspiration": <0-10>, "community": <0-10>, "warmth": <0-10>, "empowerment": <0-10>, "local": <0-10>, "onBrand": <0-10>, "clarity": <0-10>}}`;
}

function parseModelJSON(text) {
  if (!text) return null;
  let t = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  try { const o = JSON.parse(t); if (o && typeof o === "object") return o; } catch (e) {}
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
  return null;
}

const DIM_KEYS = ["inspiration", "community", "warmth", "empowerment", "local", "onBrand", "clarity"];
function sanitizeDims(d) {
  if (!d || typeof d !== "object") return null;
  const out = {}; let any = false;
  DIM_KEYS.forEach(k => { const v = parseInt(d[k], 10); if (!isNaN(v)) { out[k] = Math.max(0, Math.min(10, v)); any = true; } });
  return any ? out : null;
}

async function evaluateOne(persona, atype, copy, img, images, context, region, personalize) {
  const imgs = Array.isArray(images) ? images : [];
  const hasImage = imgs.length > 0;
  const promptText = buildPrompt(persona, atype, copy, img, hasImage, context, imgs.length, region, personalize);
  const content = hasImage
    ? imgs.map(im => ({ type: "image", source: { type: "base64", media_type: im.mediaType || "image/jpeg", data: im.data } })).concat([{ type: "text", text: promptText }])
    : promptText;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 600,
        messages: [{ role: "user", content }]
      });
      const text = (msg.content || []).map(b => b.text || "").join("");
      const d = parseModelJSON(text);
      if (d) {
        return {
          score: Math.max(0, Math.min(10, parseInt(d.score, 10) || 0)),
          headline: d.headline || "",
          resonates: Array.isArray(d.resonates) ? d.resonates.filter(Boolean).slice(0, 3) : [],
          fallsFlat: Array.isArray(d.fallsFlat) ? d.fallsFlat.filter(Boolean).slice(0, 3) : [],
          onVoice: Array.isArray(d.onVoice) ? d.onVoice.filter(Boolean).slice(0, 6) : [],
          avoid: Array.isArray(d.avoid) ? d.avoid.filter(Boolean).slice(0, 6) : [],
          fix: d.fix || "",
          verdict: d.verdict || "",
          dimensions: sanitizeDims(d.dimensions),
          raw: null
        };
      }
      if (attempt === 1) return { error: true, raw: (text || "").slice(0, 500) };
    } catch (e) {
      if (attempt === 1) return { error: true, raw: (e && e.message) || "API error" };
    }
  }
  return { error: true, raw: "No response." };
}

// ---------- custom "build your own" persona helpers ----------
function pStr(v, n) { return (v == null ? "" : String(v)).slice(0, n).trim(); }
function pArr(v, cnt, n) { return Array.isArray(v) ? v.map(x => pStr(x, n)).filter(Boolean).slice(0, cnt) : []; }
function pHex(v, f) { return /^#[0-9a-fA-F]{6}$/.test(String(v || "")) ? String(v) : f; }
const REGION_LABEL = { central: "Central · Santa Barbara County", northern: "Northern · San Luis Obispo County", southern: "Southern · Ventura County" };

// Reduce an incoming custom persona to only the fields the evaluator needs.
function sanitizeCustomPersona(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = pStr(raw.name, 40); if (!name) return null;
  let id = pStr(raw.id || name, 50).replace(/[^a-zA-Z0-9_-]/g, "-");
  if (!id.startsWith("custom-")) id = "custom-" + id;
  const prof = raw.profile || {};
  const mot = pArr(raw.motivations, 6, 120), obj = pArr(raw.objections, 6, 120);
  return {
    id: id.slice(0, 60),
    name,
    role: pStr(raw.role, 80) || "Custom donor persona",
    color: pHex(raw.color, "#0a5b73"),
    blurb: pStr(raw.blurb, 400) || name,
    profile: {
      car: pStr(prof.car, 120) || "—", shops: pStr(prof.shops, 120) || "—",
      brands: pStr(prof.brands, 120) || "—", personality: pStr(prof.personality, 120) || "—",
      media: pStr(prof.media, 120) || "—"
    },
    motivations: mot.length ? mot : ["—"],
    objections: obj.length ? obj : ["—"],
    tone: pStr(raw.tone, 300) || "—",
    imgYes: pArr(raw.imgYes, 6, 120),
    imgNo: pArr(raw.imgNo, 6, 120)
  };
}

// Generate a full, region-grounded persona from the builder's choices.
app.post("/api/build-persona", async (req, res) => {
  const b = req.body || {};
  const region = ["central", "northern", "southern"].includes(b.region) ? b.region : "central";
  const seed = PERSONAS.find(p => p.id === b.archetype) || null;
  const regionNote = REGION_NOTES[region] || "";
  const capacity = pStr(b.capacity, 80), motivation = pStr(b.motivation, 80), turnoff = pStr(b.turnoff, 80);
  const nameHint = pStr(b.name, 40), ageHint = pStr(b.age, 40), notes = pStr(b.notes, 600);
  const personality = pStr(b.personality, 60), factsFeelings = pStr(b.factsFeelings, 40);
  const working = pStr(b.working, 40), religion = pStr(b.religion, 60), infoSource = pStr(b.infoSource, 120);
  const kids = b.kids ? "yes" : "", grandkids = b.grandkids ? "yes" : "";
  const seedText = seed ? `Starting inspiration (create a DISTINCT new individual, do not copy verbatim): ${seed.name}, ${seed.role}. ${seed.blurb}` : "";
  const prompt = `You are designing a realistic fundraising donor persona for the Cottage Health Foundation in the Santa Barbara, California region (which spans Santa Barbara, San Luis Obispo, and Ventura counties).

${seedText}

Build a NEW, distinct persona shaped by these choices:
- Region they live in: ${REGION_LABEL[region]}. ${regionNote}
- Giving capacity: ${capacity || "unspecified"}
- What moves them most: ${motivation || "unspecified"}
- Biggest turn-off: ${turnoff || "unspecified"}
${nameHint ? `- Preferred name: ${nameHint}` : ""}
${ageHint ? `- Age / life stage: ${ageHint}` : ""}
${personality ? `- Personality type / temperament: ${personality}` : ""}
${factsFeelings ? `- Persuaded more by: ${factsFeelings}` : ""}
${kids ? `- Has children: yes` : ""}
${grandkids ? `- Has grandchildren: yes` : ""}
${working ? `- Work status: ${working}` : ""}
${religion ? `- Faith / religious affiliation: ${religion}` : ""}
${infoSource ? `- Where they get their information: ${infoSource} (reflect this in the profile "media" field)` : ""}
${notes ? `- Extra detail to honor: ${notes}` : ""}

Make them specific, believable, warm, and grounded in this region — a real individual with an inner life, NOT a caricature or a demographic stereotype. Avoid clichés about wealth, ethnicity, or age. Weave the family, faith, work, and temperament details in naturally where they'd shape how this person gives and responds.

Respond with ONLY minified JSON (no markdown, no commentary) using EXACTLY these keys:
{"name":"<first name>","role":"<short descriptor, e.g. '58, vineyard owner & longtime donor'>","blurb":"<2 sentences on who they are and how they think about giving>","profile":{"car":"<what they drive>","shops":"<where they shop>","brands":"<brands they like>","personality":"<MBTI-style tag + 2-3 words>","media":"<where they get information>"},"motivations":["<short>","<short>","<short>","<short>"],"objections":["<short>","<short>","<short>","<short>"],"tone":"<one sentence on how to speak to them>","imgYes":["<short>","<short>","<short>"],"imgNo":["<short>","<short>","<short>"],"intro":"<3-4 sentence first-person 'let me introduce myself' in their own voice>","spoken":"<1-2 sentence casual first-person line, as if speaking out loud as a local from this region>","avatar":{"skin":"<hex e.g. #e0a875>","hair":"<hex>","style":"<one of: short, bob, long, bun>","clothes":"<hex>","glasses":<true or false>},"voice":{"gender":"<female or male>","rate":<number 0.9-1.08>,"pitch":<number 0.9-1.1>},"color":"<a hex accent color>"}`;
  try {
    const msg = await anthropic.messages.create({ model: MODEL, max_tokens: 800, messages: [{ role: "user", content: prompt }] });
    const text = (msg.content || []).map(x => x.text || "").join("");
    const d = parseModelJSON(text);
    if (!d) return res.status(502).json({ error: "Couldn't shape that persona — try again." });
    const color = pHex(d.color, (seed && seed.color) || "#0a5b73");
    const av = d.avatar || {}; const vc = d.voice || {};
    const spoken = pStr(d.spoken, 400);
    const prof = d.profile || {};
    const mot = pArr(d.motivations, 6, 120), obj = pArr(d.objections, 6, 120);
    const persona = {
      id: "custom-" + Date.now().toString(36) + Math.floor(Math.random() * 1000),
      name: pStr(d.name, 40) || nameHint || "New persona",
      role: pStr(d.role, 80) || "Custom donor persona",
      color, custom: true,
      blurb: pStr(d.blurb, 400),
      profile: {
        car: pStr(prof.car, 120) || "—", shops: pStr(prof.shops, 120) || "—",
        brands: pStr(prof.brands, 120) || "—", personality: pStr(prof.personality, 120) || "—",
        media: pStr(prof.media, 120) || "—"
      },
      motivations: mot.length ? mot : ["Local impact they can see"],
      objections: obj.length ? obj : ["Anything that feels salesy"],
      tone: pStr(d.tone, 300) || "Warm, genuine, plainspoken.",
      imgYes: pArr(d.imgYes, 6, 120),
      imgNo: pArr(d.imgNo, 6, 120),
      intro: pStr(d.intro, 600),
      spoken,
      spokenRegions: { [region]: spoken },
      avatar: {
        skin: pHex(av.skin, "#e0a875"), hair: pHex(av.hair, "#3a322c"),
        style: ["short", "bob", "long", "bun"].includes(av.style) ? av.style : "short",
        clothes: pHex(av.clothes, color), glasses: !!av.glasses
      },
      voice: {
        gender: vc.gender === "male" ? "male" : "female",
        rate: Math.max(0.85, Math.min(1.12, parseFloat(vc.rate) || 1.0)),
        pitch: Math.max(0.85, Math.min(1.15, parseFloat(vc.pitch) || 1.0))
      },
      region
    };
    res.json({ persona });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || "Persona builder error." });
  }
});

app.post("/api/evaluate", async (req, res) => {
  const { atype, copy, img, context, region, personalize, personaIds, source, images, imageData, imageMediaType, customPersonas } = req.body || {};
  const cleanRegion = ["central", "northern", "southern", "all"].includes(region) ? region : "all";
  const cleanPz = (personalize && typeof personalize === "object") ? {
    lean: ["creative", "balanced", "technical"].includes(personalize.lean) ? personalize.lean : "balanced",
    use: (personalize.use || "").toString().slice(0, 80),
    role: (personalize.role || "").toString().slice(0, 80),
    learned: (personalize.learned || "").toString().slice(0, 400)
  } : null;
  const cleanContext = (context || "").trim().slice(0, 600);
  const cleanCopy = (copy || "").trim();
  const cleanImg = (img || "").trim();
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  let imgs = Array.isArray(images) ? images : [];
  if (!imgs.length && typeof imageData === "string" && imageData) imgs = [{ data: imageData, mediaType: imageMediaType }];
  imgs = imgs.filter(x => x && typeof x.data === "string" && x.data.length)
             .slice(0, 8)
             .map(x => ({ data: x.data.replace(/^data:[^,]+,/, ""), mediaType: allowedTypes.includes(x.mediaType) ? x.mediaType : "image/jpeg" }));
  const totalImgLen = imgs.reduce((n, x) => n + x.data.length, 0);
  if (totalImgLen > 18000000) return res.status(413).json({ error: "Those images are too large — try fewer pages or a smaller file." });
  if (!cleanCopy && !cleanImg && !imgs.length) return res.status(400).json({ error: "Add some copy, describe a visual, or upload an image/PDF first." });

  const custom = Array.isArray(customPersonas) ? customPersonas.map(sanitizeCustomPersona).filter(Boolean) : [];
  const pool = PERSONAS.concat(custom);
  const ids = Array.isArray(personaIds) && personaIds.length ? personaIds : PERSONAS.map(p => p.id);
  const seen = {};
  const chosen = pool.filter(p => ids.includes(p.id) && !seen[p.id] && (seen[p.id] = 1));
  if (!chosen.length) return res.status(400).json({ error: "Pick at least one persona." });

  const results = {};
  await Promise.all(chosen.map(async p => { results[p.id] = await evaluateOne(p, atype || "Other", cleanCopy, cleanImg, imgs, cleanContext, cleanRegion, cleanPz); }));

  // log every persona reaction
  const runId = crypto.randomUUID();
  const ts = new Date().toISOString();
  const user = (req.userEmail || "user");
  const tx = db.transaction(() => {
    chosen.forEach(p => {
      const r = results[p.id] || {};
      insertRow.run({
        ts, run_id: runId, user,
        atype: atype || "Other",
        source: source || "paste",
        copy_preview: cleanCopy.slice(0, 160),
        image_preview: imgs.length ? (cleanImg ? cleanImg.slice(0, 130) + ` [+${imgs.length} image(s)]` : `(${imgs.length} image/page${imgs.length > 1 ? "s" : ""})`) : cleanImg.slice(0, 160),
        persona_id: p.id, persona_name: p.name,
        score: (r && !r.error && typeof r.score === "number") ? r.score : null,
        verdict: (r && r.verdict) || "",
        fix: (r && r.fix) || ""
      });
    });
  });
  tx();

  // save the full run so the user can reopen it later (auto-saved by user)
  try {
    const scored = chosen.map(p => results[p.id]).filter(r => r && !r.error && typeof r.score === "number");
    const avg = scored.length ? scored.reduce((s, r) => s + r.score, 0) / scored.length : null;
    insertRun.run({
      run_id: runId, ts, user,
      atype: atype || "Other",
      source: source || "paste",
      context: cleanContext || "",
      copy: cleanCopy.slice(0, 20000),
      image_note: imgs.length ? (`${imgs.length} image/page${imgs.length > 1 ? "s" : ""}${cleanImg ? " + concept" : ""}`) : (cleanImg || ""),
      persona_ids: JSON.stringify(chosen.map(p => p.id)),
      results_json: JSON.stringify(results),
      avg_score: avg
    });
  } catch (e) { /* non-fatal: history is best-effort */ }

  res.json({ runId, results, personas: chosen.map(p => ({ id: p.id, name: p.name, role: p.role, color: p.color })) });
});

// ---------- photography review (single photo, no personas) ----------
app.post("/api/evaluate-photo", async (req, res) => {
  const { image, usage, personalize } = req.body || {};
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!image || typeof image.data !== "string" || !image.data) return res.status(400).json({ error: "Upload a photo first." });
  const data = image.data.replace(/^data:[^,]+,/, "");
  if (data.length > 9000000) return res.status(413).json({ error: "That image is too large — try a smaller file." });
  const mt = allowed.includes(image.mediaType) ? image.mediaType : "image/jpeg";
  const use = (usage || "").toString().slice(0, 300);
  const pz = (personalize && typeof personalize === "object") ? personalizeNote({
    lean: ["creative", "balanced", "technical"].includes(personalize.lean) ? personalize.lean : "balanced",
    use: (personalize.use || "").toString().slice(0, 80),
    role: (personalize.role || "").toString().slice(0, 80),
    learned: ""
  }) : "";
  const prompt = `You are a brand photography reviewer and art director for the Cottage Health Foundation, which serves Santa Barbara coast to valley. Judge the ATTACHED photo against the Foundation's photography principles and brand voice, for the intended use described.

${PHOTOGRAPHY.promptBlock}
Brand voice in one line: ${BRAND_VOICE.oneLine}
INTENDED USE: "${use || "(not specified)"}".
${pz ? pz + "\n" : ""}
Score from 0 to 10 how well this photo fits the Foundation's photography standard for that use. Be encouraging but honest — only go below 5 for cold/clinical, sterile-equipment, staged-stock, faceless, or guilt-heavy imagery. Name what you actually SEE in the photo. Respond with ONLY minified JSON (no markdown), exactly:
{"score":<integer 0-10>,"verdict":"<one of: Strong fit, Usable with tweaks, Off-brand>","works":["<short>", ...up to 3],"improve":["<short>", ...up to 3],"fix":"<one concrete art-direction change>","dimensions":{"story":<0-10>,"warmth":<0-10>,"authenticity":<0-10>,"local":<0-10>,"connection":<0-10>}}`;
  try {
    const msg = await anthropic.messages.create({
      model: MODEL, max_tokens: 600,
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mt, data } }, { type: "text", text: prompt }] }]
    });
    const text = (msg.content || []).map(b => b.text || "").join("");
    const d = parseModelJSON(text);
    if (!d) return res.status(502).json({ error: "Couldn't read the review — try again." });
    res.json({
      score: Math.max(0, Math.min(10, parseInt(d.score, 10) || 0)),
      verdict: d.verdict || "",
      works: Array.isArray(d.works) ? d.works.filter(Boolean).slice(0, 3) : [],
      improve: Array.isArray(d.improve) ? d.improve.filter(Boolean).slice(0, 3) : [],
      fix: d.fix || "",
      dimensions: (d.dimensions && typeof d.dimensions === "object") ? d.dimensions : null
    });
  } catch (e) { res.status(500).json({ error: (e && e.message) || "Review failed." }); }
});

// ---------- per-user history: list + reopen ----------
app.get("/api/my-history", (req, res) => {
  const user = req.userEmail || "user";
  const runs = db.prepare(`SELECT run_id, ts, atype, source, image_note, avg_score, substr(copy,1,150) AS copy_preview
    FROM runs WHERE user=? ORDER BY ts DESC LIMIT 100`).all(user);
  res.json({ user, runs });
});
app.get("/api/my-history/:id", (req, res) => {
  const user = req.userEmail || "user";
  const row = db.prepare(`SELECT * FROM runs WHERE run_id=? AND user=?`).get(req.params.id, user);
  if (!row) return res.status(404).json({ error: "That test isn't in your history (it may have been on a different sign-in)." });
  let results = {}, personaIds = [];
  try { results = JSON.parse(row.results_json || "{}"); } catch (e) {}
  try { personaIds = JSON.parse(row.persona_ids || "[]"); } catch (e) {}
  res.json({ run_id: row.run_id, ts: row.ts, atype: row.atype, source: row.source, context: row.context, copy: row.copy, image_note: row.image_note, avg_score: row.avg_score, personaIds, results });
});

// ---------- refine: follow-up conversation with the voice coach ----------
app.post("/api/chat", async (req, res) => {
  const { messages, context, personalize } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "No message provided." });
  const ctx = context || {};
  const pzChat = (personalize && typeof personalize === "object") ? personalizeNote({
    lean: ["creative", "balanced", "technical"].includes(personalize.lean) ? personalize.lean : "balanced",
    use: (personalize.use || "").toString().slice(0, 80),
    role: (personalize.role || "").toString().slice(0, 80),
    learned: (personalize.learned || "").toString().slice(0, 400)
  }) : "";
  const system = `You are the Cottage Health Foundation's philanthropy voice coach, talking with a staff member about a piece of content they just tested against six audience personas. Help them improve it through a natural back-and-forth: give specific, friendly, practical feedback and suggestions, explain the personas' reactions when useful, and when they ask, rewrite the copy in the Foundation's voice. Keep replies concise — a short paragraph or a tight list. When you provide a revised version, present it clearly (e.g. under a "Revised:" label) so it is easy to copy.
${BRAND_VOICE.promptSummary}
${SCORING_GUIDE}
${pzChat ? pzChat + "\n" : ""}${ctx.img && /image|photo/i.test(String(ctx.img)) ? PHOTOGRAPHY.promptBlock : ""}
${ctx.context ? `WHAT THEY'RE TESTING (their goal): "${String(ctx.context).slice(0, 600)}".\n` : ""}THE ASSET BEING DISCUSSED — type: ${ctx.atype || "Other"}. Copy: """${String(ctx.copy || "(none)").slice(0, 4000)}""" Visual: ${String(ctx.img || "(none)").slice(0, 300)}.
HOW THE ROOM REACTED: ${String(ctx.summary || "(not provided)").slice(0, 1500)}.`;
  const msgs = messages
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return res.status(400).json({ error: "The last message must be from you." });
  try {
    const r = await anthropic.messages.create({ model: MODEL, max_tokens: 900, system, messages: msgs });
    const reply = (r.content || []).map(b => b.text || "").join("").trim();
    res.json({ reply: reply || "(no reply)" });
  } catch (e) {
    res.status(502).json({ error: (e && e.message) || "Chat failed." });
  }
});

// ---------- usage stats ----------
app.get("/api/stats", (req, res) => {
  const totalRuns = db.prepare("SELECT COUNT(DISTINCT run_id) n FROM evaluations").get().n;
  const users = db.prepare("SELECT COUNT(DISTINCT user) n FROM evaluations").get().n;
  const overall = db.prepare("SELECT AVG(score) a FROM evaluations WHERE score IS NOT NULL").get().a;

  const byPersona = PERSONAS.map(p => {
    const row = db.prepare("SELECT AVG(score) a, COUNT(score) n FROM evaluations WHERE persona_id=? AND score IS NOT NULL").get(p.id);
    return { id: p.id, name: p.name, color: p.color, avg: row.a, n: row.n };
  });

  const byAsset = db.prepare(`
    SELECT atype, AVG(score) a, COUNT(DISTINCT run_id) n
    FROM evaluations WHERE score IS NOT NULL GROUP BY atype ORDER BY n DESC
  `).all().map(r => ({ atype: r.atype, avg: r.a, n: r.n }));

  const bySource = db.prepare(`
    SELECT source, COUNT(DISTINCT run_id) n FROM evaluations GROUP BY source ORDER BY n DESC
  `).all();

  const recent = db.prepare(`
    SELECT run_id, ts, user, atype, source, avg_score, copy_preview FROM (
      SELECT run_id, MIN(ts) ts, MAX(user) user, MAX(atype) atype, MAX(source) source,
             AVG(score) avg_score, MAX(copy_preview) copy_preview
      FROM evaluations GROUP BY run_id
    ) ORDER BY ts DESC LIMIT 40
  `).all();

  res.json({ totalRuns, users, overall, byPersona, byAsset, bySource, recent });
});

// ---------- beta feedback ----------
app.post("/api/feedback", (req, res) => {
  const text = (req.body && typeof req.body.text === "string") ? req.body.text.trim().slice(0, 4000) : "";
  if (!text) return res.status(400).json({ error: "Please enter some feedback." });
  insertFeedback.run({ ts: new Date().toISOString(), user: req.userEmail || "user", text });
  res.json({ ok: true });
});

// ---------- owner stats (in-tool table) ----------
app.get("/api/owner-stats", (req, res) => {
  res.json({ users: ownerRows() });
});

// ---------- CSV export ----------
app.get("/api/export.csv", (req, res) => {
  const rows = db.prepare("SELECT * FROM evaluations ORDER BY ts DESC").all();
  const head = ["timestamp", "run_id", "user", "asset_type", "source", "persona", "persona_score", "verdict", "fix", "copy_preview", "image_preview"];
  const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const lines = [head.join(",")];
  rows.forEach(r => lines.push([r.ts, r.run_id, r.user, r.atype, r.source, r.persona_name, r.score, r.verdict, r.fix, r.copy_preview, r.image_preview].map(q).join(",")));
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="persona-sounding-board-log.csv"');
  res.send(lines.join("\n"));
});

app.listen(PORT, () => {
  console.log(`Persona Sounding Board running on http://localhost:${PORT}`);
  console.log(`Model: ${MODEL} · DB: ${DB_PATH}`);
});
