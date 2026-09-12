// auth.js — user accounts, tiers, and sign-in for Our Voice Lab.
//
// Two tiers:
//   curate — the standard tool (test your message, personas, projects, history)
//   admin  — everything in curate, plus the Create workspace and team management
//
// Sign-in is email + password. A person's profile (name, role, primary use, feedback
// lean) is collected once, the first time they sign in, and stored server-side so the
// tool recognizes them on any device. New users can create an account with the team
// access code (LOGIN_PASSWORD); admins can also invite people directly.

const crypto = require("crypto");

const TIERS = ["curate", "admin"];
const LEANS = ["creative", "balanced", "technical"];
const MIN_PW = 8;
const COOKIE = "pb_auth";
const COOKIE_DAYS = 30;

function normEmail(e) { return String(e || "").trim().toLowerCase(); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function str(v, n) { return (v == null ? "" : String(v)).trim().slice(0, n); }

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}
function checkPassword(password, user) {
  if (!user || !user.pw_hash || !user.pw_salt) return false;
  const h = Buffer.from(hashPassword(password, user.pw_salt), "hex");
  const s = Buffer.from(user.pw_hash, "hex");
  return h.length === s.length && crypto.timingSafeEqual(h, s);
}
function recommendLean(use) {
  if (["Storytelling", "Content development", "Social & digital"].includes(use)) return "creative";
  if (["Grant writing"].includes(use)) return "technical";
  return "balanced";
}

module.exports = function setupAuth({ db, app, SESSION_SECRET, LOGIN_PASSWORD, ADMIN_EMAILS }) {
  // ---------- schema ----------
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT,
      tier TEXT NOT NULL DEFAULT 'curate',
      pw_hash TEXT, pw_salt TEXT,
      pw_ver INTEGER NOT NULL DEFAULT 0,
      job_role TEXT, use_case TEXT, lean TEXT,
      created TEXT, last_login TEXT, invited_by TEXT
    );
  `);
  const getUser = db.prepare(`SELECT * FROM users WHERE email=?`);
  const insertUser = db.prepare(`INSERT INTO users (email, name, tier, created, invited_by) VALUES (@email, @name, @tier, @created, @invited_by)`);
  const setTier = db.prepare(`UPDATE users SET tier=? WHERE email=?`);
  const setPassword = db.prepare(`UPDATE users SET pw_hash=?, pw_salt=?, pw_ver=pw_ver+1 WHERE email=?`);
  const clearPassword = db.prepare(`UPDATE users SET pw_hash=NULL, pw_salt=NULL, pw_ver=pw_ver+1 WHERE email=?`);
  const setProfile = db.prepare(`UPDATE users SET name=@name, job_role=@job_role, use_case=@use_case, lean=@lean WHERE email=@email`);
  const touchLogin = db.prepare(`UPDATE users SET last_login=? WHERE email=?`);
  const listUsers = db.prepare(`SELECT email, name, tier, job_role, use_case, created, last_login, invited_by,
      (pw_hash IS NOT NULL) AS has_password FROM users ORDER BY (tier='admin') DESC, COALESCE(last_login, created) DESC`);
  const deleteUser = db.prepare(`DELETE FROM users WHERE email=?`);

  // seed / promote admins listed in the environment
  const now = new Date().toISOString();
  (ADMIN_EMAILS || []).map(normEmail).filter(validEmail).forEach(email => {
    if (!getUser.get(email)) insertUser.run({ email, name: null, tier: "admin", created: now, invited_by: "env" });
    else setTier.run("admin", email);
  });

  // ---------- session tokens (HMAC-signed; a password reset invalidates them) ----------
  function sign(v) { return crypto.createHmac("sha256", SESSION_SECRET).update(v).digest("hex"); }
  function makeToken(email, pwv) {
    const payload = Buffer.from(email).toString("base64url") + "." + String(pwv | 0);
    return payload + "." + sign(payload);
  }
  function verifyToken(token) {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[0] + "." + parts[1];
    if (sign(payload) !== parts[2]) return null;
    try { return { email: Buffer.from(parts[0], "base64url").toString("utf8"), pwv: parseInt(parts[1], 10) || 0 }; }
    catch (e) { return null; }
  }
  function getCookie(req, name) {
    const raw = req.headers.cookie || "";
    const hit = raw.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  }
  function setCookie(res, token) {
    res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * COOKIE_DAYS}`);
  }
  function clearCookie(res) { res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`); }

  // Resolve the signed-in user for a request (null if none / stale token).
  function currentUser(req) {
    const t = verifyToken(getCookie(req, COOKIE));
    if (!t) return null;
    const u = getUser.get(t.email);
    if (!u || !u.pw_hash || (u.pw_ver | 0) !== t.pwv) return null;
    return u;
  }
  function publicUser(u) {
    return {
      email: u.email, name: u.name || "", tier: u.tier || "curate", isAdmin: u.tier === "admin",
      role: u.job_role || "", use: u.use_case || "", lean: LEANS.includes(u.lean) ? u.lean : "balanced"
    };
  }
  function requireAuth(req, res, next) {
    const u = currentUser(req);
    if (!u) {
      if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Not signed in." });
      return res.redirect("/login.html");
    }
    req.user = u; req.userEmail = u.email; req.isAdmin = u.tier === "admin";
    next();
  }
  function requireAdmin(req, res, next) {
    if (!req.user || req.user.tier !== "admin") return res.status(403).json({ error: "This area is for administrators." });
    next();
  }

  // ---------- sign-in ----------
  app.post("/api/login", (req, res) => {
    const email = normEmail(req.body && req.body.email);
    const password = String((req.body && req.body.password) || "");
    if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
    const u = getUser.get(email);
    if (!u) return res.status(404).json({ code: "unknown", error: "We don't have an account for that email yet." });
    if (!u.pw_hash) return res.status(409).json({ code: "setup", name: u.name || "", error: "Welcome! Set your password to finish setting up your account." });
    if (!checkPassword(password, u)) return res.status(401).json({ error: "That password doesn't match." });
    touchLogin.run(new Date().toISOString(), email);
    setCookie(res, makeToken(email, u.pw_ver));
    res.json({ ok: true, user: publicUser(u) });
  });

  // First-time setup: an invited user sets their password + profile; a brand-new user
  // also needs the team access code.
  app.post("/api/register", (req, res) => {
    const b = req.body || {};
    const email = normEmail(b.email);
    const password = String(b.password || "");
    const name = str(b.name, 80);
    if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (!name) return res.status(400).json({ error: "Please tell us your name." });
    if (password.length < MIN_PW) return res.status(400).json({ error: `Choose a password of at least ${MIN_PW} characters.` });
    let u = getUser.get(email);
    if (u && u.pw_hash) return res.status(409).json({ error: "That account is already set up. Sign in with your password, or ask an administrator to reset it." });
    if (!u) {
      if (!LOGIN_PASSWORD || String(b.accessCode || "") !== LOGIN_PASSWORD) {
        return res.status(403).json({ code: "code", error: "That team access code isn't right. Ask your administrator for the code, or to add you directly." });
      }
      insertUser.run({ email, name, tier: "curate", created: new Date().toISOString(), invited_by: "self" });
      u = getUser.get(email);
    }
    const use = str(b.use, 80), role = str(b.role, 80);
    const lean = LEANS.includes(b.lean) ? b.lean : recommendLean(use);
    setProfile.run({ email, name, job_role: role, use_case: use, lean });
    const salt = crypto.randomBytes(16).toString("hex");
    setPassword.run(hashPassword(password, salt), salt, email);
    u = getUser.get(email);
    touchLogin.run(new Date().toISOString(), email);
    setCookie(res, makeToken(email, u.pw_ver));
    res.json({ ok: true, user: publicUser(u) });
  });

  app.post("/api/logout", (req, res) => { clearCookie(res); res.json({ ok: true }); });

  // ---------- signed-in user: profile ----------
  app.get("/api/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
  app.put("/api/me", requireAuth, (req, res) => {
    const b = req.body || {}, u = req.user;
    setProfile.run({
      email: u.email,
      name: str(b.name, 80) || u.name || "",
      job_role: b.role != null ? str(b.role, 80) : (u.job_role || ""),
      use_case: b.use != null ? str(b.use, 80) : (u.use_case || ""),
      lean: LEANS.includes(b.lean) ? b.lean : (u.lean || "balanced")
    });
    res.json({ user: publicUser(getUser.get(u.email)) });
  });
  app.post("/api/me/password", requireAuth, (req, res) => {
    const b = req.body || {};
    if (!checkPassword(String(b.current || ""), req.user)) return res.status(401).json({ error: "Your current password doesn't match." });
    const next = String(b.next || "");
    if (next.length < MIN_PW) return res.status(400).json({ error: `Choose a password of at least ${MIN_PW} characters.` });
    const salt = crypto.randomBytes(16).toString("hex");
    setPassword.run(hashPassword(next, salt), salt, req.user.email);
    const u = getUser.get(req.user.email);
    setCookie(res, makeToken(u.email, u.pw_ver));
    res.json({ ok: true });
  });

  // ---------- admin: team & access ----------
  app.get("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
    const evals = {};
    try { db.prepare(`SELECT user, COUNT(DISTINCT run_id) n, MAX(ts) last FROM evaluations GROUP BY user`).all().forEach(r => evals[r.user] = r); } catch (e) {}
    const users = listUsers.all().map(u => ({
      email: u.email, name: u.name || "", tier: u.tier, role: u.job_role || "", use: u.use_case || "",
      created: u.created, lastLogin: u.last_login, invitedBy: u.invited_by || "",
      hasPassword: !!u.has_password,
      evaluations: (evals[u.email] || {}).n || 0, lastEval: (evals[u.email] || {}).last || null
    }));
    res.json({ users, accessCode: LOGIN_PASSWORD || "" });
  });
  app.post("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
    const b = req.body || {};
    const email = normEmail(b.email);
    if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
    const tier = TIERS.includes(b.tier) ? b.tier : "curate";
    if (getUser.get(email)) return res.status(409).json({ error: "That person already has an account. Change their access level in the list instead." });
    insertUser.run({ email, name: str(b.name, 80) || null, tier, created: new Date().toISOString(), invited_by: req.user.email });
    res.json({ ok: true });
  });
  app.put("/api/admin/users/:email", requireAuth, requireAdmin, (req, res) => {
    const email = normEmail(req.params.email);
    const u = getUser.get(email);
    if (!u) return res.status(404).json({ error: "No such user." });
    const b = req.body || {};
    if (TIERS.includes(b.tier)) {
      if (email === req.user.email && b.tier !== "admin") return res.status(400).json({ error: "You can't remove your own admin access." });
      setTier.run(b.tier, email);
    }
    if (b.name != null) setProfile.run({ email, name: str(b.name, 80), job_role: u.job_role || "", use_case: u.use_case || "", lean: u.lean || "balanced" });
    res.json({ ok: true });
  });
  // Reset: clears the password so the person sets a new one the next time they sign in.
  app.post("/api/admin/users/:email/reset", requireAuth, requireAdmin, (req, res) => {
    const email = normEmail(req.params.email);
    if (!getUser.get(email)) return res.status(404).json({ error: "No such user." });
    if (email === req.user.email) return res.status(400).json({ error: "Change your own password from My setup instead." });
    clearPassword.run(email);
    res.json({ ok: true });
  });
  app.delete("/api/admin/users/:email", requireAuth, requireAdmin, (req, res) => {
    const email = normEmail(req.params.email);
    if (email === req.user.email) return res.status(400).json({ error: "You can't remove yourself." });
    const info = deleteUser.run(email);
    if (!info.changes) return res.status(404).json({ error: "No such user." });
    res.json({ ok: true });
  });

  return { requireAuth, requireAdmin, currentUser, publicUser, getUser, recommendLean };
};
