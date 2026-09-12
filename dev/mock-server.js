// mock-server.js — dependency-free stand-in for the API so the front end can be exercised
// in a browser without an API key or database. NOT used in production.
const http = require("http"), fs = require("fs"), path = require("path");
const { PERSONAS } = require("../personas");
const { BRAND_VOICE, PHOTOGRAPHY } = require("../brand-voice");
const PUB = path.join(__dirname, "..", "public");
const ME = { email: "mike@accordantphilanthropy.com", name: "Michael Beall", tier: "admin", isAdmin: true, role: "Communications / Marketing", use: "Content development", lean: "creative" };
let projects = [], msgs = {}, files = {}, assets = {};
const now = () => new Date().toISOString();
function json(res, code, o) { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); }
const MIME = { html: "text/html", png: "image/png", jpg: "image/jpeg", mp3: "audio/mpeg", js: "text/javascript", css: "text/css" };
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"); const p = u.pathname;
  let body = ""; req.on("data", d => body += d); req.on("end", () => {
    let b = {}; try { b = JSON.parse(body || "{}"); } catch (e) {}
    if (p === "/api/config") return json(res, 200, { personas: PERSONAS, brandVoice: BRAND_VOICE, photography: PHOTOGRAPHY, user: ME });
    if (p === "/api/me") return json(res, 200, { user: ME });
    if (p === "/api/ping") return json(res, 200, { ok: true });
    if (p === "/api/my-history") return json(res, 200, { user: ME.email, runs: [] });
    if (p === "/api/projects") return json(res, 200, { user: ME.email, projects: [], templates: [] });
    if (p === "/api/stats") return json(res, 200, { totalRuns: 3, users: 2, overall: 7.2, byPersona: [], byAsset: [], bySource: [], recent: [] });
    if (p === "/api/owner-stats") return json(res, 200, { users: [] });
    if (p === "/api/admin/users" && req.method === "GET") return json(res, 200, { accessCode: "cottage2026", users: [
      { email: ME.email, name: ME.name, tier: "admin", role: ME.role, hasPassword: true, evaluations: 12, lastLogin: now() },
      { email: "k1greene@sbch.org", name: "", tier: "admin", role: "", hasPassword: false, evaluations: 0, lastLogin: null },
      { email: "staff@cottagehealth.org", name: "Sam Staff", tier: "curate", role: "Annual giving", hasPassword: true, evaluations: 4, lastLogin: now() }] });
    if (p === "/api/create/projects" && req.method === "GET") return json(res, 200, { model: "mock", personas: PERSONAS.map(x => ({ id: x.id, name: x.name, role: x.role, color: x.color })), projects: projects.map(pr => ({ ...pr, messages: (msgs[pr.id] || []).length, assets: (assets[pr.id] || []).length, files: (files[pr.id] || []).length })) });
    if (p === "/api/create/projects" && req.method === "POST") { const pr = { id: "cp" + Date.now(), title: b.title || "Untitled project", brief: b.brief || "", settings: { region: "all", research: true, atype: "", personas: [] }, created: now(), updated: now() }; projects.unshift(pr); msgs[pr.id] = []; files[pr.id] = []; assets[pr.id] = []; return json(res, 200, { project: pr }); }
    let m;
    if ((m = p.match(/^\/api\/create\/projects\/([^/]+)$/))) {
      const pr = projects.find(x => x.id === m[1]); if (!pr) return json(res, 404, { error: "nope" });
      if (req.method === "GET") return json(res, 200, { project: pr, messages: msgs[pr.id], files: files[pr.id], assets: assets[pr.id] });
      if (req.method === "PUT") { Object.assign(pr, { title: b.title || pr.title, brief: b.brief != null ? b.brief : pr.brief, settings: { ...pr.settings, ...(b.settings || {}) }, updated: now() }); return json(res, 200, { project: pr }); }
      if (req.method === "DELETE") { projects = projects.filter(x => x !== pr); return json(res, 200, { ok: true }); }
    }
    if ((m = p.match(/^\/api\/create\/projects\/([^/]+)\/files$/))) { const f = { id: "cf" + Date.now(), name: "uploaded-sample.docx", kind: "Word document", chars: 1234, is_image: false, ts: now() }; files[m[1]].push(f); return json(res, 200, { added: [f], failed: [], files: files[m[1]] }); }
    if ((m = p.match(/^\/api\/create\/projects\/([^/]+)\/chat$/))) {
      const id = m[1]; msgs[id].push({ id: Date.now(), role: "user", text: b.message, attachments: [], ts: now() });
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const reply = "# Year-End Letter to Valley Neighbors\n\nDear neighbor,\n\nRight here in the Valley, the hospital stayed open all night in January because people like you decided it should. **That decision** was yours.\n\n## What your gift did\n\n- Kept the ER staffed through fire season\n- Brought a second triage nurse on weekends\n\n## The ask\n\n1. Give again this year\n2. Bring a neighbor to the open house\n\n> [VERIFY: number of overnight ER visits, Jan 2026]\n\nWith gratitude,\nThe Cottage Health Foundation";
      let i = 0; res.write("event: status\ndata: {\"text\":\"Searching the web…\"}\n\n");
      const t = setInterval(() => { if (i >= reply.length) { clearInterval(t); msgs[id].push({ id: Date.now(), role: "assistant", text: reply, ts: now() }); res.write("event: done\ndata: " + JSON.stringify({ text: reply }) + "\n\n"); res.end(); return; } const chunk = reply.slice(i, i + 12); i += 12; res.write("event: delta\ndata: " + JSON.stringify({ text: chunk }) + "\n\n"); }, 20);
      return;
    }
    if ((m = p.match(/^\/api\/create\/projects\/([^/]+)\/assets$/))) { const a = { id: "ca" + Date.now(), title: b.title || (b.content.match(/^#\s+(.+)$/m) || [])[1] || "Untitled", kind: "draft", content: b.content, created: now(), updated: now() }; assets[m[1]].unshift(a); return json(res, 200, { asset: a, assets: assets[m[1]] }); }
    if ((m = p.match(/^\/api\/create\/assets\/([^/]+)$/))) { for (const k in assets) { const a = assets[k].find(x => x.id === m[1]); if (a) { if (req.method === "PUT") { Object.assign(a, b); return json(res, 200, { ok: true, assets: assets[k] }); } if (req.method === "DELETE") { assets[k] = assets[k].filter(x => x !== a); return json(res, 200, { ok: true, assets: assets[k] }); } return json(res, 200, { asset: a }); } } return json(res, 404, {}); }
    if (p.startsWith("/api/")) return json(res, 200, { ok: true });
    let f = p === "/" ? "/index.html" : p; const fp = path.join(PUB, f);
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) { res.writeHead(200, { "Content-Type": MIME[f.split(".").pop()] || "application/octet-stream" }); return fs.createReadStream(fp).pipe(res); }
    res.writeHead(404); res.end("nf");
  });
}).listen(3999, () => console.log("mock on 3999"));
