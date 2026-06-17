# Persona Sounding Board — Hosted Version

A web app version of the Cottage Health Foundation Persona Sounding Board. Paste copy, **pull copy straight from a web page URL**, or **upload a PDF** — then get reactions and fit scores from six Santa Barbara–area personas. It runs on your own server, calls the Anthropic API to generate the reactions, and records every evaluation across all users in a central database so you can track usage and improve the tool.

Plain-English summary: you don't "host on the Anthropic API." You run this small app somewhere on the internet, and the app quietly calls the Anthropic API (Claude) each time someone clicks **Get reactions**. You pay Anthropic per use (cheap with the Haiku model). The deployment steps below get it live.

---

## What's new in this version

- **From URL** — paste a link (campaign page, news article, even a PDF link) and the server fetches the page, strips out the navigation/scripts, and drops the readable copy into the evaluation box. It also pulls image alt-text and the social-share image as a visual hint.
- **From PDF** — upload an appeal letter, case statement, or brochure PDF and the server extracts the text for evaluation. (Image-only/scanned PDFs have no extractable text — the tool will tell you and ask you to describe the visual instead.)
- **Shareable output** — after a run, **Copy summary** (for email/Slack) and **Download report** (a clean HTML page you can save as PDF for a creative review).
- **Team usage charts** — the Usage log now shows average fit score by persona and by asset type, plus which source types (paste / URL / PDF) are being used.

---

## What's in here

| File | What it does |
| --- | --- |
| `server.js` | The backend — serves the page, gates it behind a password, calls the Anthropic API, fetches URLs, parses PDFs, logs every run |
| `personas.js` | The six personas (edit this to tweak them — single source of truth) |
| `brand-voice.js` | The Foundation's brand-voice calibration (shown in the app + fed to the AI) |
| `public/index.html` | The tool's interface (the page people use) |
| `public/login.html` | The sign-in page |
| `.env.example` | Template for your secret key and settings — copy to `.env` |
| `package.json` | The app's dependencies |

---

## What you need

1. **An Anthropic API key.** Create one at <https://console.anthropic.com> → Settings → API Keys. Billed pay-as-you-go; each evaluation is a few hundred tokens on Haiku, so it's a fraction of a cent per persona reaction. Watch usage if you open it to the public.
2. **Node.js 18 or newer** (only if running locally — hosts install it for you). Node 18+ is required because the URL-fetching feature uses the built-in `fetch`.
3. **A hosting account** to put it online (Render is the easiest; see below).

---

## Run it on your own computer first (5 minutes)

```
# 1. install dependencies
npm install

# 2. add your key
cp .env.example .env
# then open .env and paste your real key after ANTHROPIC_API_KEY=
# (optionally change LOGIN_PASSWORD and SESSION_SECRET)

# 3. start it
npm start
```

Open <http://localhost:3000>. Sign in with any name and the shared password from your `.env` (`LOGIN_PASSWORD`, default `cottage2026`). That's the full tool, running locally.

---

## Put it online so others can use it (recommended: Render)

1. **Put the code on GitHub.** Create a new repository and upload this folder (do **not** upload your `.env` — the included `.gitignore` already excludes it).
2. Go to <https://render.com> → **New → Web Service** → connect your repo.
3. Render auto-detects Node. Confirm:
   - Build command: `npm install`
   - Start command: `npm start`
4. Under **Environment**, add variables:
   - `ANTHROPIC_API_KEY` = your real key
   - `LOGIN_PASSWORD` = the shared password your team will use
   - `SESSION_SECRET` = any long random string
5. **For tracking to persist (important):** add a **Persistent Disk** (Render → your service → Disks), mount it at `/data`, then add:
   - `DB_PATH` = `/data/evaluations.db`

   Without a persistent disk, the usage log resets whenever the service restarts or redeploys.
6. Click **Deploy**. When it finishes, Render gives you a public URL — share that link and the password.

Other hosts work too (Railway, Fly.io, a small VPS). The only rules: run `npm start`, set the environment variables above, and point `DB_PATH` at storage that survives restarts. Plain Vercel/Netlify are trickier because they don't keep a writable database file between requests — if you go that route, swap SQLite for a hosted database.

> **Note on `better-sqlite3`:** it's a native module that compiles on install. Render, Railway, Fly.io, and standard VPS hosts handle this automatically.

---

## How the URL & PDF features work (and their limits)

- **URL:** the server does a server-side fetch (so there are no browser cross-origin limits), strips scripts/styles/nav/footer, and keeps the readable text (capped at ~16,000 characters). Some sites render their content with JavaScript after load — for those, a plain fetch may return little text. If a page comes back thin, copy the text manually into the paste box.
- **PDF:** text is extracted with `pdf-parse`. Works great for normal text PDFs (letters, case statements). Scanned or fully-designed image PDFs have no text layer to read — the tool detects this and asks you to describe the visual instead. (OCR is not included.)
- Both features just **fill the copy/visual boxes** — you can always review and edit before getting reactions.

---

## Tracking & improving the tool

- The **Usage log** tab shows total evaluations, users, overall average score, average score by persona and by asset type, and which sources are used — pulled live from the server across all users.
- **Export CSV** (button on that tab, or visit `/api/export.csv`) downloads the full dataset: one row per persona per evaluation, with score, verdict, the suggested fix, source type, and a preview of the copy tested.
- Every record is stored in the SQLite database at `DB_PATH`.

## Brand voice

The **Brand voice** tab shows the Foundation's voice calibration (eight dimensions, scores, vocabulary). That same calibration is fed to the AI on every evaluation, so the "fix" suggestions nudge copy toward the intended voice. Edit `brand-voice.js` to update it.

## Tuning the personas

Open `personas.js` and edit any persona's motivations, objections, tone, or image checklist. Redeploy and the change shows up everywhere. This is the main lever for constant improvement — as you learn what real donors respond to, sharpen the personas.

## A couple of cautions

- **Keep your API key secret.** It lives only in the server environment, never in the browser. Don't paste it into the frontend or commit `.env` to GitHub.
- **Login is a shared password**, meant as a light gate for a trusted team — not bank-grade security. Change `LOGIN_PASSWORD` and `SESSION_SECRET` before sharing, and rotate the password if it leaks.
- This tool is a **directional gut check**, not a substitute for real donor conversations.

_Prepared by Accordant Philanthropy._
