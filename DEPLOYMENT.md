# 🚀 Gap Dashboard Deployment Guide

Complete guide to deploy Gap Dashboard to the cloud using Railway (Backend) + Vercel (Frontend).

## 📋 Overview

- **Backend**: Node.js + Fastify → Railway
- **Frontend**: React + Vite → Vercel
- **Cost**: 100% Free tier available
- **Time**: ~15 minutes

## 🎯 Quick Start (5 Steps)

### Step 1: Deploy Backend to Railway (5 min)

```bash
# Navigate to backend directory
cd backend

# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

After deployment, copy your Railway URL:
```
https://your-backend.up.railway.app
```

**Configure environment variables in Railway Dashboard:**
- `CORS_ORIGIN` = (leave empty for now, update after frontend deployment)

### Step 2: Deploy Frontend to Vercel (5 min)

```bash
# Navigate to frontend directory
cd ../frontend

# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel
```

Follow the prompts and copy your Vercel URL:
```
https://gap-dashboard.vercel.app
```

### Step 3: Configure Environment Variables

**In Vercel Dashboard** (Project → Settings → Environment Variables):
```bash
VITE_API_URL=https://your-backend.up.railway.app
```

**In Railway Dashboard** (Project → Variables):
```bash
CORS_ORIGIN=https://gap-dashboard.vercel.app
```

### Step 4: Redeploy Both Services

Backend (Railway):
- Railway Dashboard → Deploy (automatic on variable change)

Frontend (Vercel):
```bash
vercel --prod
```

### Step 5: Test Your Deployment ✅

Visit your Vercel URL and check:
- [ ] Dashboard loads without errors
- [ ] Premium opportunities display
- [ ] Click on FRAX → Modal opens
- [ ] Click execution button → Steps progress
- [ ] No CORS errors in browser console (F12)

## 📁 Project Structure

```
arbi/
├── backend/              # Node.js + Fastify API
│   ├── src/
│   ├── railway.json      # ✨ Railway config (created)
│   ├── DEPLOYMENT.md     # ✨ Backend guide (created)
│   └── package.json
│
├── frontend/             # React + Vite
│   ├── src/
│   ├── vercel.json       # ✨ Vercel config (created)
│   ├── .env.example      # ✨ Environment template (created)
│   ├── .gitignore        # ✨ Git ignore (created)
│   ├── DEPLOYMENT.md     # ✨ Frontend guide (created)
│   └── package.json
│
└── DEPLOYMENT.md         # ✨ This file
```

## 🆓 Free Tier Limits

### Railway
- $5 credit per month (~500 hours)
- Auto-sleep after 5 min inactivity
- Instant wake on request
- 1GB RAM, 1 vCPU

### Vercel
- Unlimited deployments
- 100GB bandwidth/month
- Global CDN
- Automatic HTTPS
- Preview deployments

## 🔧 Troubleshooting

### CORS Error
**Symptoms**: API calls fail with CORS error in console

**Fix**:
1. Check `CORS_ORIGIN` in Railway matches your Vercel URL exactly
2. Make sure both URLs use `https://`
3. No trailing slash in URLs
4. Redeploy backend after changing variables

### Environment Variable Not Working
**Symptoms**: API calls go to `localhost:4000`

**Fix**:
1. Verify `VITE_API_URL` is set in Vercel
2. Variable name must start with `VITE_`
3. Redeploy frontend after adding variables

### Build Fails
**Backend**:
```bash
# Test locally
cd backend
npm install
npm run build
npm start
```

**Frontend**:
```bash
# Test locally
cd frontend
npm install
npm run build
```

## 📚 Detailed Guides

- **Backend**: See `backend/DEPLOYMENT.md`
- **Frontend**: See `frontend/DEPLOYMENT.md`

## 🔐 Security Checklist

- [ ] `.env` files are in `.gitignore`
- [ ] CORS is configured (not `*`)
- [ ] API keys are in environment variables (not hardcoded)
- [ ] HTTPS is enabled (automatic on Railway/Vercel)

## 📊 Monitoring

### Railway (Backend)
- Logs: Dashboard → Deployments → View Logs
- Metrics: Dashboard → Metrics
- Health: `curl https://your-backend.up.railway.app/opportunities`

### Vercel (Frontend)
- Logs: Dashboard → Deployments → Function Logs
- Analytics: Dashboard → Analytics (Pro plan)
- Health: Visit your Vercel URL in browser

## 🎉 Success!

Your Gap Dashboard is now live!

**Backend**: https://your-backend.up.railway.app
**Frontend**: https://gap-dashboard.vercel.app

Share your deployment URL and start monitoring premium opportunities in real-time!

## 🚧 Next Steps

### Custom Domain
1. **Vercel**: Project Settings → Domains → Add
2. **Update Railway CORS**: Add custom domain to `CORS_ORIGIN`

### Continuous Deployment
Both platforms auto-deploy when you push to GitHub:
- Railway: Watches `main` branch
- Vercel: Watches all branches (with preview URLs)

### Production Database (Future)
Replace mock data with real exchange APIs:
1. Add API keys to Railway environment variables
2. Update `FxRateService` to use live data
3. Implement real exchange connectors

---

Need help? Check the detailed guides in `backend/DEPLOYMENT.md` and `frontend/DEPLOYMENT.md`.
