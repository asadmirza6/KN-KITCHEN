# 🔐 KN KITCHEN - Admin Login Information

## ✅ System Status
- **Backend Server:** http://localhost:8000 - ✅ Running
- **Frontend Server:** http://localhost:3000 - ✅ Running
- **Database:** Neon PostgreSQL - ✅ Connected

---

## 🎯 Admin Login Credentials

### Login URL
**http://localhost:3000/login**

### Admin Account Details
```
Email:    knadmin@test.com
Password: admin@123
Role:     ADMIN (Full Access)
```

---

## 📱 Quick Access Links

### Main Pages
- **Login Page:** http://localhost:3000/login
- **Admin Dashboard:** http://localhost:3000/admin
- **Orders Management:** http://localhost:3000/admin/orders
- **Items Management:** http://localhost:3000/admin/items
- **Users Management:** http://localhost:3000/admin/users
- **Gallery Management:** http://localhost:3000/admin/gallery
- **Banners Management:** http://localhost:3000/admin/banners

### API & Documentation
- **API Health Check:** http://localhost:8000/health
- **API Documentation:** http://localhost:8000/docs
- **API Base URL:** http://localhost:8000

---

## 🎯 Admin Features Available

### 📊 Dashboard
- View today's orders and revenue statistics
- See total pending collections
- Monitor order status (Pending, Partial, Paid)
- Quick access to all management features

### 📋 Orders Management
- ✅ Create new orders (customer details, items, payment)
- ✅ View all orders with filters (Today, Week, Month, Status)
- ✅ Edit existing orders
- ✅ Update payment status
- ✅ Mark orders as paid
- ✅ Download PDF invoices (Pakistan Rupees format)
- ✅ Cancel orders
- ✅ Track which staff member created each order

### 🍽️ Items Management
- ✅ Add new menu items with images (Cloudinary upload)
- ✅ Edit item names and prices (Rs/kg)
- ✅ Delete items (removes from database and Cloudinary)
- ✅ View all menu items with images

### 👥 Users Management (ADMIN Only)
- ✅ Create new ADMIN users
- ✅ Create new STAFF users
- ✅ View all users with role badges
- ✅ Delete users (cannot delete yourself)
- ✅ Control access levels (ADMIN vs STAFF)

### 🖼️ Gallery Management
- ✅ Upload gallery images to Cloudinary
- ✅ View all gallery images
- ✅ Delete gallery images
- ✅ Images stored in `gallery/` folder

### 🎨 Banners Management
- ✅ Upload banner images (Desktop: 1920x600, Mobile: 1080x1350)
- ✅ Set active banner (only one active at a time)
- ✅ View and manage banners
- ✅ Images stored in `banners/` folder

---

## 🔒 User Roles & Permissions

### ADMIN (Full Access)
- ✅ All features available
- ✅ Create and manage users
- ✅ View all orders and financial stats
- ✅ Manage items, gallery, banners
- ✅ Download invoices
- ✅ Update payments

### STAFF (Limited Access)
- ✅ Create orders only
- ❌ Cannot view order history
- ❌ Cannot manage items, users, gallery, banners
- ❌ Cannot view financial statistics

---

## 📝 How to Create STAFF Users

1. Login as ADMIN
2. Go to: http://localhost:3000/admin/users
3. Click "Add New User" button
4. Fill in details:
   - Name: Staff member's full name
   - Email: Their email address
   - Password: Set a secure password (min 6 characters)
   - Role: Select **STAFF**
5. Click "Create User"
6. Give the staff member their credentials
7. Staff can login and create orders

---

## 💡 Tips & Best Practices

### Creating Orders
1. Fill customer details (name, email, phone)
2. Add items from the menu (select quantity in kg)
3. Advance payment is optional (can be 0)
4. Add delivery date if needed
5. Add notes for special instructions
6. Order automatically tracks who created it

### Managing Payments
1. View order details
2. Click "Update Payment" to add advance payment
3. Or click "Mark as Paid" to complete payment
4. Status updates automatically:
   - **Pending:** No payment received
   - **Partial:** Some payment received
   - **Paid:** Fully paid

### Downloading Invoices
1. Go to Orders page
2. Click "PDF" button next to any order
3. Or open order details and click "Download Invoice PDF"
4. Professional invoice downloads with Pakistan Rupees formatting

---

## 🔧 Starting the Servers

### If servers are stopped:

**Backend:**
```bash
cd backend
uvicorn src.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Verify servers are running:
```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend (open in browser)
http://localhost:3000
```

---

## 🆘 Troubleshooting

### Cannot Login?
- Verify backend is running: http://localhost:8000/health
- Clear browser cache and cookies
- Try using the exact credentials above
- Check browser console for errors (F12)

### Orders Page Not Loading?
- Ensure you're logged in as ADMIN
- STAFF users can only create orders, not view them
- Check that backend is connected to database

### Images Not Uploading?
- Verify Cloudinary credentials in backend `.env` file
- Check file size (max 10MB recommended)
- Supported formats: JPEG, PNG, GIF, WebP

### Database Connection Issues?
- Check `backend/.env` file has correct `DATABASE_URL`
- Verify Neon PostgreSQL database is running
- Check internet connection

---

## 📞 System Information

### Technology Stack
- **Frontend:** Next.js 16 + React 18 + TypeScript + Tailwind CSS
- **Backend:** FastAPI + Python 3.12 + SQLModel
- **Database:** Neon PostgreSQL (Serverless)
- **Storage:** Cloudinary (Images)
- **Auth:** JWT with Better Auth pattern
- **PDF:** ReportLab

### Database Schema
- **users:** User accounts with ADMIN/STAFF roles
- **items:** Menu items with prices
- **orders:** Customer orders with payment tracking
- **media_assets:** Gallery and banner images

---

## 🎉 You're All Set!

Your KN KITCHEN system is ready for production use!

**Next Steps:**
1. Login with the credentials above
2. Explore the admin dashboard
3. Create your menu items
4. Add staff users if needed
5. Start taking orders!

**Happy Managing! 🍽️**

---

*Last Updated: January 21, 2026*
*System Version: Phase 3 - Production Ready*
