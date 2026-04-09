# Deployment Checklist - KN KITCHEN

## Pre-Deployment Verification (Completed ✓)

### Backend Files Status
- [x] `backend/src/main.py` - All routers configured including quotations
- [x] `backend/src/database.py` - Models imported in create_db_and_tables()
- [x] `backend/src/api/quotations.py` - All endpoints implemented with discount field
- [x] `backend/src/models/quotation.py` - Model with all required fields
- [x] `backend/src/config.py` - Settings configured for environment variables
- [x] `backend/alembic/versions/a1b2c3d4e5f6_create_quotations_table.py` - Migration file exists
- [x] Database schema fixed - discount column added via fix_quotation_schema.py

### Frontend Files Status
- [x] `frontend/services/quotationService.ts` - All API methods implemented
- [x] `frontend/types/Quotation.ts` - Type definitions with discount field
- [x] `frontend/app/admin/quotations/page.tsx` - Full quotation management UI
- [x] `frontend/app/admin/page.tsx` - Quotations card added to dashboard
- [x] `frontend/lib/axios.ts` - Axios client configured with JWT interceptor

### PDF Generation
- [x] `backend/src/utils/pdf_quotation_generator.py` - Discount display in summary
- [x] Footer message updated to: "Thank you for your interest in KN KITCHEN / Please confirm to proceed with this quotation"
- [x] Discount shows as: Subtotal → Discount → Total Quotation Amount

### Environment Configuration
- [x] `backend/.env` - DATABASE_URL and BETTER_AUTH_SECRET configured
- [x] `frontend/.env.local` - NEXT_PUBLIC_API_URL set to http://localhost:8000

---

## Render Backend Deployment Steps

1. **Push code to GitHub**
   ```bash
   git add -A
   git commit -m "Add quotation management system with discount feature"
   git push origin main
   ```

2. **On Render Dashboard:**
   - Create new Web Service
   - Connect GitHub repository
   - Set Build Command: `pip install -r requirements.txt`
   - Set Start Command: `uvicorn src.main:app --host 0.0.0.0 --port 8000`
   - Add Environment Variables:
     - `DATABASE_URL` = (from Neon PostgreSQL)
     - `BETTER_AUTH_SECRET` = (from .env)
     - `CLOUDINARY_CLOUD_NAME` = (from .env)
     - `CLOUDINARY_API_KEY` = (from .env)
     - `CLOUDINARY_API_SECRET` = (from .env)

3. **Verify Backend:**
   - Check `/health` endpoint returns `{"status": "healthy", "database": "connected"}`
   - Check `/quotations/` endpoint returns quotations list (may be empty initially)

---

## Vercel Frontend Deployment Steps

1. **Update frontend environment for production:**
   - In Vercel Dashboard, set Environment Variables:
     - `NEXT_PUBLIC_API_URL` = `https://your-render-backend-url.onrender.com`
     - `NEXTAUTH_URL` = `https://your-vercel-frontend-url.vercel.app`
     - `BETTER_AUTH_SECRET` = (same as backend)

2. **Deploy to Vercel:**
   - Connect GitHub repository
   - Vercel auto-deploys on push to main
   - Or manually trigger deployment from Vercel Dashboard

3. **Verify Frontend:**
   - Navigate to `/admin/quotations`
   - Should load quotations list (may be empty initially)
   - Create button should work
   - PDF download should work

---

## Critical Configuration Points

### CORS Configuration
- Backend CORS is configured in `src/main.py` for:
  - `http://localhost:3000` (development)
  - `https://kn-kitchen.vercel.app` (production)
  - Update with your actual Vercel URL if different

### Database Connection
- Uses Neon PostgreSQL with SSL required
- Connection string format: `postgresql://user:password@host/database?sslmode=require`
- Quotations table auto-created on backend startup via `create_db_and_tables()`

### API Endpoints
- All quotation endpoints require admin authentication
- JWT token passed via Authorization header
- Axios client auto-includes JWT token from localStorage

---

## Testing Checklist (After Deployment)

- [ ] Backend health check: `GET /health` returns connected
- [ ] Frontend loads without errors
- [ ] Can navigate to `/admin/quotations`
- [ ] Can create a new quotation
- [ ] Can edit pending quotation
- [ ] Can delete pending quotation
- [ ] Can download quotation PDF with discount displayed
- [ ] Can approve quotation (converts to order)
- [ ] Approved quotation appears in orders list
- [ ] Discount amount preserved in order

---

## Troubleshooting

### Backend Issues
- **500 Error on /quotations/**: Check if quotations table exists in database
  - Run: `python backend/fix_quotation_schema.py` to add missing columns
  
- **CORS Error**: Verify frontend URL is in CORS origins in `src/main.py`

- **Database Connection Failed**: Verify DATABASE_URL is correct and Neon is accessible

### Frontend Issues
- **API calls failing**: Check NEXT_PUBLIC_API_URL is set correctly
- **Quotations not loading**: Check browser console for errors
- **PDF download not working**: Verify backend is running and accessible

---

## Files Modified/Created

### Backend
- `src/api/quotations.py` - NEW
- `src/models/quotation.py` - NEW
- `src/utils/pdf_quotation_generator.py` - NEW
- `src/models/__init__.py` - MODIFIED (added Quotation import)
- `src/main.py` - MODIFIED (added quotations router)
- `src/database.py` - MODIFIED (added model imports in create_db_and_tables)
- `alembic/versions/a1b2c3d4e5f6_create_quotations_table.py` - NEW
- `fix_quotation_schema.py` - NEW (utility script)

### Frontend
- `app/admin/quotations/page.tsx` - NEW
- `services/quotationService.ts` - NEW
- `types/Quotation.ts` - NEW
- `app/admin/page.tsx` - MODIFIED (added quotations card)

---

## Deployment Status

- Backend: Ready for Render deployment
- Frontend: Ready for Vercel deployment
- Database: Schema verified and fixed
- All tests: Passed locally

**Last Updated:** 2026-04-09
**Status:** Ready for Production Deployment
