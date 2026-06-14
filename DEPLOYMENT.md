# Deploying Dexter

Two pieces deploy independently:

| Piece | Where | Needed for |
|---|---|---|
| **Frontend** (Vite/React) | Vercel **or** Netlify | The whole app — 3D Live Sky, Scenario, Time Machine. **Works fully on its own** (TLE + SATCAT data are bundled). |
| **Backend** (FastAPI) | Render | The **AI Agent panel** only. |

**Deploy order: backend first, then frontend** — the frontend bakes the backend URL in at build time, so you need the Render URL before building the frontend. (If you don't care about AI yet, you can deploy only the frontend; the AI panel just shows "offline".)

All config files are already in the repo. Push to GitHub first:

```bash
git add -A && git commit -m "chore: add deployment config" && git push
```

---

## 1. Backend → Render

The AI provider **cannot be Ollama** in the cloud (Ollama is local-only), so the backend is configured to use **Gemini** (free tier). You need a Gemini API key from https://aistudio.google.com/app/apikey.

1. Render dashboard → **New +** → **Blueprint**.
2. Connect this GitHub repo. Render reads [`render.yaml`](render.yaml) and creates the **dexter-backend** web service automatically (root dir `backend`, build `pip install -r requirements.txt`, start `uvicorn api.main:app --host 0.0.0.0 --port $PORT`).
3. When prompted (or in the service's **Environment** tab), set the secret:
   - `GEMINI_API_KEY` = your key
   - *(To use OpenAI instead: set `AI_PROVIDER=openai` and `OPENAI_API_KEY=...`.)*
4. Deploy. When it's live you get a URL like `https://dexter-backend.onrender.com`. **Copy it** — the frontend needs it.
5. Sanity check: open `https://dexter-backend.onrender.com/` → `{"service":"dexter-ai","status":"ok"}`, and `/docs` for the API.

**Expected in the cloud (by design, not a bug):**
- ✅ AI chat + structured analysis work (via Gemini).
- ⚠️ **No RAG document grounding** — the DB2 host is IBM-internal and unreachable from Render. The app degrades gracefully (answers without citing the policy docs). To re-enable, point the `DB2_*` env vars (commented in `render.yaml`) at a publicly reachable Db2.
- ℹ️ Free tier **cold-starts** (~50s) after inactivity, so the first AI request after idle is slow. Upgrade the plan to avoid this.

---

## 1b. Backend → Railway (alternative to Render)

Railway reads [`backend/railway.json`](backend/railway.json) and pins Python via [`backend/.python-version`](backend/.python-version).

1. Railway → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Open the service → **Settings** → set **Root Directory** to `backend` (so Nixpacks finds `requirements.txt`, not the frontend's `package.json`).
3. **Variables** tab — add these manually (Railway does **not** read `render.yaml`, so unlike Render you set all three, not just the key):
   - `AI_PROVIDER` = `gemini`
   - `GEMINI_MODEL` = `gemini-2.5-flash`
   - `GEMINI_API_KEY` = your key (secret)
4. **Networking** → **Generate Domain** to get a public URL (`https://…up.railway.app`). Railway injects `$PORT` automatically; the start command in `railway.json` uses it.
5. Same cloud behaviour/limits as the Render section above (AI works via Gemini; DB2/RAG off; do **not** set `DB2_*` or `OLLAMA_*`).

> Whichever host you keep (Render *or* Railway), use **its** URL as the frontend's `VITE_AI_API_URL`.

---

## 2. Frontend → Vercel **or** Netlify

Pick one. Both configs are included and both handle the SPA fallback.

### Option A — Vercel
1. Vercel → **Add New** → **Project** → import this repo.
2. It auto-detects Vite from [`vercel.json`](vercel.json) (build `npm run build`, output `dist`).
3. **Settings → Environment Variables**, add:
   - `VITE_AI_API_URL` = your Render backend URL (e.g. `https://dexter-backend.onrender.com`)
4. Deploy.

### Option B — Netlify
1. Netlify → **Add new site** → **Import an existing project** → pick this repo.
2. It reads [`netlify.toml`](netlify.toml) (build `npm run build`, publish `dist`, SPA redirect via [`public/_redirects`](public/_redirects)).
3. **Site settings → Environment variables**, add:
   - `VITE_AI_API_URL` = your Render backend URL
4. Deploy.

> `VITE_AI_API_URL` is read at **build time** ([src/integration/agent/client.ts](src/integration/agent/client.ts)). If you change it later, trigger a rebuild. Leaving it unset is fine — the 3D app still works, the AI panel just shows "offline".

---

## Files added for deployment

- [`render.yaml`](render.yaml) — Render Blueprint for the backend.
- [`vercel.json`](vercel.json) — Vercel build + SPA rewrite.
- [`netlify.toml`](netlify.toml) — Netlify build + SPA redirect.
- [`public/_redirects`](public/_redirects) — Netlify SPA fallback (`/* → /index.html 200`).
- [`.nvmrc`](.nvmrc) — pins Node 20 for the frontend build.

## Troubleshooting

- **Backend build fails on `ibm-db`** — it's only used for DB2/RAG, which is disabled in the cloud anyway. Comment out `ibm-db` in [`backend/requirements.txt`](backend/requirements.txt) and redeploy; everything else still works.
- **AI panel says "offline"** — check `VITE_AI_API_URL` is set and matches the Render URL (no trailing slash), and that `GEMINI_API_KEY` is set on Render. The Render free tier may also be cold-starting (wait ~50s).
- **Blank 3D scene / no satellites** — confirm `public/tle/TLE.txt` and `public/satcat.json` are committed (they are) so the build includes them.
- **AI returns `429 ... limit: 0, model: gemini-*-pro`** — the Gemini **free tier allows 0 requests for `pro` models**. Set `GEMINI_MODEL=gemini-2.5-flash` (or `gemini-2.0-flash`) on the host and restart.
