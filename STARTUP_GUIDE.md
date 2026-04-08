# KN KITCHEN - Local Development Startup Guide

## Prerequisites
- Python 3.8+ installed
- Node.js 18+ installed
- Both backend and frontend dependencies installed

## Step-by-Step Startup

### 1. Clear Cache & Stop Any Running Servers
```bash
# If servers are running, stop them (Ctrl+C in their terminals)
# Clear browser cache: Ctrl+Shift+Delete in Chrome/Edge
```

### 2. Start Backend (Terminal 1)
```bash
cd D:\sp\KN-KITCHEN\backend
python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

**Wait for this output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**Verify backend is working:**
```bash
# In another terminal, run:
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"healthy","database":"connected","message":"API and database are operational"}
```

### 3. Start Frontend (Terminal 2 - ONLY AFTER backend is ready)
```bash
cd D:\sp\KN-KITCHEN\frontend
npm run dev
```

**Wait for this output:**
```
▲ Next.js 16.1.3
- Local:        http://localhost:3000
```

### 4. Access the Application
Open your browser and go to: **http://localhost:3000**

---

## Configuration Verification

### Backend CORS Configuration ✅
- File: `backend/src/main.py`
- Allows: `http://localhost:3000`, `http://127.0.0.1:3000`
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Credentials: Enabled

### Frontend API Configuration ✅
- File: `frontend/.env.local`
- API URL: `http://localhost:8000`
- Auth URL: `http://localhost:3000`

### Axios Configuration ✅
- File: `frontend/lib/axios.ts`
- Base URL: `http://localhost:8000`
- Credentials: Enabled

---

## Troubleshooting

### Error: "Unsafe attempt to load URL http://localhost:3000/"
**Solution:**
1. Ensure backend is running on port 8000
2. Hard refresh frontend: `Ctrl+Shift+Delete` then `Ctrl+F5`
3. Check browser console (F12) for actual error messages
4. Verify `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`

### Error: "Cannot connect to database"
**Solution:**
1. Check `DATABASE_URL` in `backend/.env`
2. Verify internet connection (Neon PostgreSQL is cloud-hosted)
3. Check if Neon database is active

### Error: "Module not found" or "Dependencies missing"
**Solution:**
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Port Already in Use
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

---

## Development Tips

- Backend auto-reloads on file changes (thanks to `--reload`)
- Frontend auto-reloads on file changes (Next.js dev mode)
- API docs available at: http://localhost:8000/docs
- Check browser DevTools (F12) for network requests and errors

---

## Quick Health Check Commands

```bash
# Check backend health
curl http://localhost:8000/health

# Check if backend is responding
curl http://localhost:8000/docs

# Check frontend is running
curl http://localhost:3000
```
