# Backend Deployment Guide (Railway)

## Prerequisites
- [Railway Account](https://railway.app/) (Sign up with GitHub)
- Git repository

## Step 1: Deploy to Railway

### Option A: Deploy via Railway CLI (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project (run in backend directory)
railway init

# Deploy
railway up
```

### Option B: Deploy via GitHub
1. Push your code to GitHub
2. Go to [Railway Dashboard](https://railway.app/dashboard)
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Select your repository
6. Railway will auto-detect Node.js and deploy

## Step 2: Configure Environment Variables

In Railway Dashboard → Variables, add:

```bash
PORT=4000                    # Railway will override this automatically
HOST=0.0.0.0                 # Listen on all interfaces
CORS_ORIGIN=https://your-frontend-domain.vercel.app  # Update after frontend deployment
```

## Step 3: Get Your Backend URL

After deployment, Railway will provide a URL like:
```
https://your-backend.up.railway.app
```

Copy this URL - you'll need it for frontend deployment.

## Step 4: Test Your Backend

```bash
curl https://your-backend.up.railway.app/opportunities
curl https://your-backend.up.railway.app/premiums
```

## Railway Free Tier
- $5 credit per month
- ~500 hours of execution time
- Auto-sleep after 5 minutes of inactivity (wakes on request)

## Troubleshooting

### Build fails
- Check Railway logs in dashboard
- Verify `package.json` has correct scripts
- Ensure all dependencies are in `dependencies`, not `devDependencies`

### CORS errors
- Update `CORS_ORIGIN` environment variable with your Vercel domain
- Make sure to include `https://` prefix

### Port issues
- Railway automatically sets `PORT` environment variable
- Make sure your code uses `process.env.PORT`

## Monitoring
- View logs: Railway Dashboard → Deployments → View Logs
- Metrics: Railway Dashboard → Metrics
