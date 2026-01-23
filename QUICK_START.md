# Quick Start Guide - KN KITCHEN

## 🚀 Start the Application

### 1. Start Backend
```bash
cd backend
uvicorn src.main:app --reload
```

**Expected Output:**
```
✓ DATABASE_URL is set
✓ BETTER_AUTH_SECRET is set
⚠ Cloudinary NOT configured - Image uploads will fail
  → See CLOUDINARY_SETUP.md for instructions
```

Backend running at: **http://localhost:8000**

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

Frontend running at: **http://localhost:3000**

---

## 🔑 Login Credentials

**ADMIN Account:**
- Email: `knadmin@test.com`
- Password: `admin@123`
- Role: ADMIN (Full access)

---

## ✅ What Works RIGHT NOW (Without Cloudinary)

### User Management
- ✅ Login/Signup
- ✅ Create new users (ADMIN only)
- ✅ Delete users (ADMIN only)
- ✅ Role-based access control

### Items Management
- ✅ Create items WITHOUT images
- ✅ Edit items
- ✅ Delete items (ADMIN only)
- ✅ Unit types: per KG, per Piece, per Liter

### Orders Management
- ✅ Create orders
- ✅ Track orders
- ✅ Generate PDF invoices
- ✅ Payment tracking (advance/balance)

### Features
- ✅ Logo in navbar
- ✅ Logo in invoice PDFs
- ✅ Local banner slider (fallback)

---

## ⚠️ Requires Cloudinary Setup

### Cannot Work Without Cloudinary:
- ❌ Items with images
- ❌ Banner uploads
- ❌ Gallery albums

### Setup Cloudinary (5 minutes):
1. Go to https://cloudinary.com
2. Sign up for free account
3. Get credentials from dashboard
4. Update `backend/.env`
5. Restart backend
6. See **CLOUDINARY_SETUP.md** for detailed guide

---

## 📁 Admin Pages

**Access:** http://localhost:3000/admin (must be logged in as ADMIN)

### Available Pages:
- `/admin` - Dashboard
- `/admin/users` - Manage Users (ADMIN only)
- `/admin/items` - Manage Menu Items
- `/admin/orders` - View Orders
- `/admin/gallery` - Manage Photo Albums
- `/admin/banners` - Manage Homepage Banners

---

## 🧪 Quick Test Scenarios

### Test 1: Create Item (No Image)
1. Login as ADMIN
2. Go to /admin/items
3. Click "Add New Item"
4. Enter:
   - Name: "Biryani"
   - Price: 500
   - Unit: per KG
5. Leave image blank
6. Click "Add Item"
7. ✅ Should save successfully with placeholder icon

### Test 2: Create STAFF User
1. Login as ADMIN
2. Go to /admin/users
3. Click "Add New User"
4. Enter:
   - Name: "Staff User"
   - Email: "staff@test.com"
   - Password: "staff123"
   - Role: STAFF
5. Click "Create User"
6. ✅ Should appear in users list
7. Logout and login as staff@test.com
8. ✅ Should NOT see delete buttons

### Test 3: Generate Invoice
1. Create an order (any user can do this)
2. Login as ADMIN
3. Go to /admin/orders
4. Click "Download Invoice"
5. ✅ PDF should download with logo

---

## 🔧 Troubleshooting

### "Failed to fetch users"
**Fix:**
1. Ensure backend is running
2. Check if logged in as ADMIN (not STAFF)
3. Check browser console for errors
4. Verify JWT token exists: localStorage.getItem('token')

### "Upload failed: Must supply api_key"
**Fix:**
- Cloudinary not configured
- See CLOUDINARY_SETUP.md
- Items can still be created without images

### "Could not validate credentials"
**Fix:**
- Token expired or invalid
- Logout and login again
- Clear localStorage and retry

### Backend won't start
**Fix:**
1. Check if port 8000 is already in use
2. Verify DATABASE_URL in .env
3. Run: `cd backend && python -m alembic upgrade head`

### Frontend build fails
**Fix:**
1. Run: `cd frontend && npm install`
2. Check if Node.js 18+ installed
3. Delete `.next` folder and rebuild

---

## 📚 Documentation Files

- `BUG_FIXES_SUMMARY.md` - All bugs fixed and how
- `CLOUDINARY_SETUP.md` - Cloudinary setup guide
- `DEPLOYMENT.md` - Production deployment
- `LOGIN_CREDENTIALS.md` - All login details
- `QUICK_START.md` - This file

---

## 🎯 Production Checklist

- [ ] Configure Cloudinary
- [ ] Change ADMIN password
- [ ] Set strong JWT secret
- [ ] Configure CORS for production domain
- [ ] Deploy backend to Railway/Render
- [ ] Deploy frontend to Vercel
- [ ] Test all features in production
- [ ] Enable SSL/HTTPS

---

## 🆘 Need Help?

1. Check `BUG_FIXES_SUMMARY.md` for detailed solutions
2. Check browser console for frontend errors
3. Check backend terminal for API errors
4. Verify .env file has all required values
5. Restart both servers after .env changes

---

**System Status:** 🟢 Core features working | 🟡 Images need Cloudinary
