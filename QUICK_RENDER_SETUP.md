# 🚀 Quick Render Deployment - Step by Step

## Backend Deployment on Render

### 1️⃣ Go to Render Dashboard
**URL:** https://dashboard.render.com

### 2️⃣ Sign Up / Login
- Click "Get Started for Free"
- Sign up with **GitHub** (recommended)

### 3️⃣ Create New Web Service
1. Click **"New +"** button (top right)
2. Select **"Web Service"**

### 4️⃣ Connect Repository
1. Click **"Connect account"** if not connected
2. Select repository: **`MdKaif123-art/pill-final`**
3. Click **"Connect"**

### 5️⃣ Configure Service Settings

**Basic Settings:**
- **Name:** `seniorpill-email-server`
- **Region:** Choose closest (e.g., `Oregon (US West)`)
- **Branch:** `main`
- **Root Directory:** `server` ⚠️ **CRITICAL - Must be `server`**
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Environment Variables (Click "Advanced"):**
Add these 4 variables:

```
GMAIL_USER = debsaptarshi628@gmail.com
GMAIL_APP_PASSWORD = ibpuailqtknxsepv
FIREBASE_PROJECT_ID = pill-81bf4
FIREBASE_API_KEY = AIzaSyBwDWBlbqBi2rfrjOXhvab55u73dO0LVGI
```

### 6️⃣ Deploy
- Click **"Create Web Service"**
- Wait 2-5 minutes for build to complete
- Watch the logs for any errors

### 7️⃣ Get Your Backend URL
After deployment, you'll see:
- **URL:** `https://seniorpill-email-server.onrender.com` (or similar)
- **Copy this URL!**

### 8️⃣ Test Backend
Open this URL in browser:
```
https://seniorpill-email-server.onrender.com/api/health
```

Should show:
```json
{"status":"ok","message":"Email API server is running","method":"Gmail SMTP"}
```

---

## Connect Frontend (Netlify) to Backend (Render)

### 1️⃣ Go to Netlify Dashboard
**URL:** https://app.netlify.com

### 2️⃣ Select Your Site
- Click on **`seniorpill`** site

### 3️⃣ Add Environment Variable
1. Go to: **Site settings** → **Environment variables**
2. Click **"Add variable"**
3. Add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://seniorpill-email-server.onrender.com` (use YOUR actual Render URL)
4. Click **"Save"**

### 4️⃣ Trigger Rebuild
1. Go to **"Deploys"** tab
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for rebuild to complete

### 5️⃣ Test Connection
1. Open: https://seniorpill.netlify.app
2. Open browser console (F12)
3. Login as caregiver
4. Check console for API calls to Render backend

---

## ✅ Verification

**Backend Working:**
- ✅ Health check works: `https://your-backend.onrender.com/api/health`
- ✅ Backend logs show "Email API server running"

**Frontend Connected:**
- ✅ Browser console shows API calls to Render URL
- ✅ No CORS errors
- ✅ Email functionality works

---

## 🆘 Troubleshooting

**Backend won't start?**
- Check Root Directory is set to `server`
- Verify all environment variables are set
- Check Render logs for errors

**CORS errors?**
- Backend is configured to allow `https://seniorpill.netlify.app`
- Check backend URL is correct in Netlify env vars

**Emails not sending?**
- Check Render logs for email errors
- Verify Gmail credentials are correct
- Test backend directly with curl

---

## 📝 Important Notes

- **Render Free Tier:** Service sleeps after 15 min inactivity. First request may take 30-60s to wake up.
- **Always-On:** Upgrade Render plan ($7/month) for 24/7 uptime
- **Auto-Deploy:** Both services auto-deploy on every push to `main` branch

---

## 🎉 Done!

Your setup:
- **Frontend:** https://seniorpill.netlify.app ✅
- **Backend:** https://seniorpill-email-server.onrender.com ✅
- **Emails:** Working via Gmail SMTP ✅
