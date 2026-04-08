# CORS & Communication Fixes Applied

## Issues Fixed

### 1. ✅ CORS Configuration (Backend)
**File:** `backend/src/main.py`

**Before:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Too permissive
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**After:**
```python
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)
```

**Why:** Specific origins prevent browser security errors and are more secure than wildcard.

---

### 2. ✅ Axios Configuration (Frontend)
**File:** `frontend/lib/axios.ts`

**Before:**
```typescript
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})
```

**After:**
```typescript
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Enable credentials for CORS
})
```

**Why:** `withCredentials: true` ensures cookies and auth headers are sent with cross-origin requests.

---

### 3. ✅ Frontend Environment Variables
**File:** `frontend/.env.local`

Already correctly configured:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
```

---

## How to Start Fresh

### Terminal 1 - Backend
```bash
cd D:\sp\KN-KITCHEN\backend
python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2 - Frontend (wait 5 seconds after backend starts)
```bash
cd D:\sp\KN-KITCHEN\frontend
npm run dev
```

### Browser
1. Clear cache: `Ctrl+Shift+Delete`
2. Open: `http://localhost:3000`
3. Check DevTools (F12) → Network tab for any errors

---

## Verification Checklist

- [ ] Backend running on `http://127.0.0.1:8000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Backend health check returns `{"status":"healthy",...}`
- [ ] No CORS errors in browser console
- [ ] API calls from frontend to backend succeed
- [ ] Images load from backend
- [ ] Login/authentication works

---

## Key Changes Summary

| Component | Change | Reason |
|-----------|--------|--------|
| CORS Origins | `["*"]` → specific origins | Prevent browser security errors |
| CORS Methods | `["*"]` → explicit list | Better security & compatibility |
| Axios Config | Added `withCredentials: true` | Enable credential-based requests |
| CORS Headers | Added `expose_headers` | Allow frontend to read response headers |
| CORS Max Age | Added `max_age=3600` | Cache preflight requests for 1 hour |

---

## If Issues Persist

1. **Hard refresh browser:** `Ctrl+Shift+Delete` then `Ctrl+F5`
2. **Check browser console:** F12 → Console tab for error messages
3. **Verify ports:** Run `verify.bat` in project root
4. **Check network requests:** F12 → Network tab, look for failed requests
5. **Restart both servers:** Kill both processes and start fresh

---

## Files Modified

- `backend/src/main.py` - CORS configuration
- `frontend/lib/axios.ts` - Axios credentials
- `frontend/.env.local` - Already correct (no changes needed)

---

## Created Helper Files

- `STARTUP_GUIDE.md` - Detailed startup instructions
- `verify.bat` - Quick verification script
- `CORS_FIXES.md` - This file
