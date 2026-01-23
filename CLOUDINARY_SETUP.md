# Cloudinary Setup Guide

## Why Cloudinary?
Cloudinary is used for storing all uploaded images (items, banners, gallery photos) instead of storing them locally or in the database.

## Current Status
⚠️ **Cloudinary is NOT configured** - Images cannot be uploaded until credentials are set.

## Setup Instructions

### 1. Create a Cloudinary Account
1. Go to https://cloudinary.com
2. Click "Sign Up for Free"
3. Complete registration

### 2. Get Your Credentials
1. Login to https://cloudinary.com/console
2. You'll see your dashboard with credentials:
   - **Cloud Name** (e.g., "dxxxxx123")
   - **API Key** (e.g., "123456789012345")
   - **API Secret** (e.g., "abcdefghijklmnopqrstuvwxyz")

### 3. Update .env File
Open `backend/.env` and replace the placeholder values:

```env
# Replace these with your actual Cloudinary credentials
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

### 4. Restart Backend Server
```bash
cd backend
uvicorn src.main:app --reload
```

You should see: `✓ Cloudinary initialized successfully: your_cloud_name`

## What Happens Without Cloudinary?

### Items Management
- ✅ Items can be created **WITHOUT images**
- ✅ Name, price, and unit type will be saved
- ❌ Image upload will fail gracefully
- ℹ️ Items will display with placeholder icon

### Gallery & Banners
- ❌ Cannot upload images (hard requirement)
- ❌ Will show error message with setup instructions

## Free Tier Limits
Cloudinary Free Plan includes:
- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month

This is more than enough for a small-to-medium catering business.

## Test After Setup

1. Go to **Manage Items** → Click "Add New Item"
2. Upload an image
3. If successful, you'll see the image in the item list
4. Check Cloudinary console to see uploaded image

## Troubleshooting

**Error: "Must supply api_key"**
- Cloudinary credentials not set in .env
- Double-check spelling and no spaces in .env

**Error: "Upload failed"**
- Invalid credentials
- Re-copy from Cloudinary console
- Ensure no extra quotes or spaces

**Images don't load**
- Check if URL starts with `https://res.cloudinary.com/`
- Verify CLOUDINARY_CLOUD_NAME matches your account

## Need Help?
- Cloudinary Docs: https://cloudinary.com/documentation
- Support: https://support.cloudinary.com
