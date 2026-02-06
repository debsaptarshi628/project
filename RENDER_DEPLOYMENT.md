# Render Deployment Guide - Backend Server

## 🚀 Deploy Backend to Render

### Step 1: Prepare Repository

Make sure all files are committed and pushed to GitHub:
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 2: Deploy on Render

1. **Go to Render Dashboard:** https://dashboard.render.com
2. **Sign up/Login** with your GitHub account
3. **Click:** "New +" → "Web Service"
4. **Connect Repository:**
   - Select: `MdKaif123-art/pill-final`
   - Click "Connect"

5. **Configure Service:**
   - **Name:** `seniorpill-email-server`
   - **Region:** Choose closest to you (e.g., `Oregon (US West)`)
   - **Branch:** `main`
   - **Root Directory:** `server` ⚠️ **IMPORTANT!**
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

6. **Environment Variables:**
   Click "Advanced" → "Add Environment Variable" and add:
   
   ```
   GMAIL_USER = debsaptarshi628@gmail.com
   GMAIL_APP_PASSWORD = ibpuailqtknxsepv
   FIREBASE_PROJECT_ID = pill-81bf4
   FIREBASE_API_KEY = AIzaSyBwDWBlbqBi2rfrjOXhvab55u73dO0LVGI
   ```

7. **Click:** "Create Web Service"

### Step 3: Wait for Deployment

- Render will build and deploy automatically
- This takes 2-5 minutes
- Watch the logs for any errors

### Step 4: Get Your Backend URL

After deployment succeeds, you'll see:
- **URL:** `https://seniorpill-email-server.onrender.com` (or similar)
- **Copy this URL** - you'll need it for Netlify

### Step 5: Test Backend

Open in browser or use curl:
```bash
curl https://seniorpill-email-server.onrender.com/api/health
```

Should return:
```json
{"status":"ok","message":"Email API server is running","method":"Gmail SMTP"}
```

## 🔗 Connect Frontend to Backend

### Step 1: Add Environment Variable in Netlify

1. **Go to Netlify Dashboard:** https://app.netlify.com
2. **Select your site:** `seniorpill`
3. **Go to:** Site settings → Environment variables
4. **Click:** "Add variable"
5. **Add:**
   - **Key:** `VITE_API_URL`
   - **Value:** `https://seniorpill-email-server.onrender.com` (use your actual Render URL)
6. **Click:** "Save"
7. **Trigger rebuild:** Go to "Deploys" → "Trigger deploy" → "Deploy site"

### Step 2: Verify Connection

1. **Open your site:** https://seniorpill.netlify.app
2. **Open browser console** (F12)
3. **Login and test email functionality**
4. **Check console** for API calls to your Render backend

## ✅ Verification Checklist

- [ ] Backend deployed on Render
- [ ] Backend health check works (`/api/health`)
- [ ] Netlify environment variable `VITE_API_URL` set
- [ ] Netlify site rebuilt with new environment variable
- [ ] Frontend can connect to backend (check browser console)
- [ ] Email sending works (test with caregiver account)

## 🔧 Troubleshooting

### Backend Won't Start

**Check Render logs:**
1. Go to Render dashboard → Your service → "Logs"
2. Look for errors

**Common issues:**
- Missing environment variables → Add them in Render dashboard
- Wrong root directory → Should be `server`
- Port issues → Render sets `PORT` automatically, don't override

### CORS Errors

The backend is configured to allow:
- `https://seniorpill.netlify.app`
- `http://localhost:3000` (for local dev)

If you see CORS errors, check:
1. Backend CORS configuration in `server/index.js`
2. Frontend is using correct `VITE_API_URL`

### Emails Not Sending

1. **Check Render logs** for email errors
2. **Verify Gmail credentials** are correct
3. **Test backend directly:**
   ```bash
   curl -X POST https://seniorpill-email-server.onrender.com/api/email/reminder \
     -H "Content-Type: application/json" \
     -d '{"caregiverEmail":"test@example.com","patientId":"U1","doseType":"morning","scheduledTime":"09:00"}'
   ```

### Frontend Can't Connect

1. **Check Netlify environment variable** is set correctly
2. **Verify backend URL** is accessible (try in browser)
3. **Check browser console** for fetch errors
4. **Rebuild Netlify site** after setting environment variable

## 📝 Notes

- **Render Free Tier:** Services sleep after 15 minutes of inactivity. First request may take 30-60 seconds to wake up.
- **Upgrade to Paid:** For always-on service, upgrade Render plan ($7/month)
- **Custom Domain:** You can add custom domain in Render dashboard if needed

## 🎉 Success!

Once deployed, your setup will be:
- **Frontend:** https://seniorpill.netlify.app (Netlify)
- **Backend:** https://seniorpill-email-server.onrender.com (Render)
- **Emails:** Sent via Gmail SMTP

Both services will auto-deploy on every push to `main` branch!
