# AI Transformation Platform

## Quick Start (Local)

### 1. Start Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Start Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### 3. Try a Sandbox
Click "🎓 Sandbox" → click anywhere → pick an industry × size → data loads automatically

---

## Deploy to Railway

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "deploy"
git remote add origin https://github.com/YOU/ai-transformation.git
git push -u origin main
```

### 2. Deploy Backend on Railway
- railway.app → New Project → GitHub Repo → your repo
- Settings → Root Directory: `backend`
- Settings → Networking → Generate Domain
- Copy the URL (e.g. `https://backend-abc.up.railway.app`)

### 3. Deploy Frontend on Railway
- Same project → + New → GitHub Repo → same repo
- Settings → Root Directory: `frontend`
- Variables → Add: `BACKEND_URL` = `https://backend-abc.up.railway.app`
- Settings → Networking → Generate Domain
- That's your live URL!
