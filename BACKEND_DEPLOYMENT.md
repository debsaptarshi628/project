# Backend Server Deployment Guide

## ⚠️ Important: Backend Must Be Deployed Separately

The **frontend** is deployed on **Netlify** (static hosting), but the **backend email server** needs to be deployed on a **Node.js hosting service** like Railway, Render, or Heroku.

## Quick Deployment Options

### Option 1: Railway (Recommended - Easiest)

1. **Go to:** https://railway.app
2. **Sign up** with GitHub
3. **Click:** "New Project" → "Deploy from GitHub repo"
4. **Select:** `MdKaif123-art/pill-final`
5. **Set root directory:** `server`
6. **Add Environment Variables:**
   - `GMAIL_USER` = `debsaptarshi628@gmail.com`
   - `GMAIL_APP_PASSWORD` = `ibpuailqtknxsepv`
   - `FIREBASE_PROJECT_ID` = `pill-81bf4`
   - `FIREBASE_API_KEY` = `AIzaSyBwDWBlbqBi2rfrjOXhvab55u73dO0LVGI`
7. **Deploy** - Railway will auto-detect Node.js and deploy
8. **Copy the URL** (e.g., `https://your-app.railway.app`)

### Option 2: Render (Free Tier Available)

1. **Go to:** https://render.com
2. **Sign up** with GitHub
3. **Click:** "New +" → "Web Service"
4. **Connect:** GitHub repo `MdKaif123-art/pill-final`
5. **Settings:**
   - **Name:** `seniorpill-email-server`
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** `Node`
6. **Add Environment Variables:**
   - `GMAIL_USER` = `debsaptarshi628@gmail.com`
   - `GMAIL_APP_PASSWORD` = `ibpuailqtknxsepv`
   - `FIREBASE_PROJECT_ID` = `pill-81bf4`
   - `FIREBASE_API_KEY` = `AIzaSyBwDWBlbqBi2rfrjOXhvab55u73dO0LVGI`
7. **Deploy** - Render will build and deploy automatically
8. **Copy the URL** (e.g., `https://seniorpill-email-server.onrender.com`)

### Option 3: Heroku

1. **Install Heroku CLI:** https://devcenter.heroku.com/articles/heroku-cli
2. **Login:** `heroku login`
3. **Create app:** `heroku create seniorpill-email-server`
4. **Set buildpack:** `heroku buildpacks:set heroku/nodejs`
5. **Set root:** `heroku config:set PROJECT_PATH=server`
6. **Add environment variables:**
   ```bash
   heroku config:set GMAIL_USER=debsaptarshi628@gmail.com
   heroku config:set GMAIL_APP_PASSWORD=ibpuailqtknxsepv
   heroku config:set FIREBASE_PROJECT_ID=pill-81bf4
   heroku config:set FIREBASE_API_KEY=AIzaSyBwDWBlbqBi2rfrjOXhvab55u73dO0LVGI
   ```
7. **Deploy:** `git push heroku main`
8. **Get URL:** `heroku info` or check dashboard

## After Backend Deployment

### Step 1: Get Your Backend URL

After deployment, you'll get a URL like:
- Railway: `https://your-app.railway.app`
- Render: `https://seniorpill-email-server.onrender.com`
- Heroku: `https://seniorpill-email-server.herokuapp.com`

### Step 2: Update Netlify Environment Variables

1. **Go to Netlify Dashboard** → Your site → **Site settings** → **Environment variables**
2. **Add:**
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-backend-url.com` (use your actual backend URL)
3. **Save** - This will trigger a new build

### Step 3: Verify Backend is Running

Test your backend API:
```bash
curl https://your-backend-url.com/api/health
```

Should return: `{"status":"ok","message":"Email API server is running"}`

## Testing Email Functionality

1. **Open your Netlify site**
2. **Login as caregiver**
3. **Load a patient**
4. **Try sending a test email** (if you have a test button)
5. **Check browser console** for any API errors

## Troubleshooting

### Emails Not Sending

1. **Check backend logs** (Railway/Render dashboard)
2. **Verify Gmail App Password** is correct
3. **Check CORS** - backend should allow your Netlify domain
4. **Verify environment variables** are set correctly

### CORS Errors

The backend already has `app.use(cors())` which allows all origins. If you need to restrict:
```javascript
app.use(cors({
  origin: ['https://your-netlify-site.netlify.app']
}));
```

### Backend Not Starting

- Check Node.js version (should be 18+)
- Verify `package.json` has correct start script
- Check logs for missing dependencies

## Security Notes

⚠️ **Important:** The Gmail credentials are currently hardcoded as fallbacks. For production:
1. **Remove hardcoded credentials** from `server/index.js`
2. **Always use environment variables**
3. **Never commit `.env` files** to GitHub

## Local Development

To test locally:

```bash
cd server
npm install
# Create .env file with your credentials
npm start
```

Frontend will connect to `http://localhost:3001` automatically.
