# Netlify Deployment Guide

## Prerequisites
- GitHub account with repository access
- Netlify account (free tier works)
- Node.js 18+ installed locally (for testing builds)

## Deployment Steps

### 1. Push to GitHub

If you haven't pushed yet, authenticate and push:

```bash
# Make sure you're authenticated with GitHub
git remote set-url origin https://github.com/debsaptarshi628/project.git

# Add, commit, and push
git add .
git commit -m "Ready for Netlify deployment"
git push -u origin main
```

**Note:** If you get permission errors, you may need to:
- Use a Personal Access Token (PAT) with `repo` scope
- Or use SSH authentication instead of HTTPS

### 2. Deploy to Netlify

#### Option A: Connect via GitHub (Recommended)

1. Go to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account
5. Select repository: `debsaptarshi628/project`
6. Netlify will auto-detect settings from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
7. Click **"Deploy site"**

#### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### 3. Environment Variables (if needed)

If you need to set environment variables in Netlify:

1. Go to **Site settings** → **Environment variables**
2. Add any required variables (currently none needed - Firebase config is in code)

### 4. Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow the DNS configuration instructions

## Build Configuration

The project uses:
- **Build command:** `npm run build` (defined in `netlify.toml`)
- **Publish directory:** `dist` (Vite output)
- **Node version:** 18 (specified in `netlify.toml`)

## SPA Routing

The `_redirects` file in `public/` ensures all routes redirect to `index.html` for React Router to work correctly.

## Troubleshooting

### Build Fails
- Check Netlify build logs
- Ensure Node.js version is 18+
- Verify all dependencies are in `package.json`

### Routes Not Working
- Verify `public/_redirects` file exists
- Check `netlify.toml` has redirects configured

### Authentication Issues
- Ensure GitHub token has `repo` scope
- Try using SSH instead of HTTPS for git remote

## Post-Deployment

After successful deployment:
1. Your site will be available at `https://your-site-name.netlify.app`
2. Every push to `main` branch will trigger automatic deployment
3. You can enable branch previews for pull requests in Netlify settings
