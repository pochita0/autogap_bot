# Frontend Deployment Guide (Vercel)

## Prerequisites
- [Vercel Account](https://vercel.com/) (Sign up with GitHub)
- Backend deployed on Railway (get the URL first)

## Step 1: Deploy to Vercel

### Option A: Deploy via Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (run in frontend directory)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? gap-dashboard (or your choice)
# - Directory? ./ (just press enter)
# - Override settings? No
```

### Option B: Deploy via GitHub
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Import Project"
4. Select your repository
5. Vercel will auto-detect Vite and configure build settings

## Step 2: Configure Environment Variables

After first deployment, go to:
**Project Settings → Environment Variables**

Add this variable:
```bash
VITE_API_URL=https://your-backend.up.railway.app
```

Important:
- Replace `your-backend.up.railway.app` with your actual Railway backend URL
- Make sure to include `https://` prefix
- Don't add trailing slash

## Step 3: Update Backend CORS

After getting your Vercel URL (e.g., `https://gap-dashboard.vercel.app`):

1. Go to Railway Dashboard
2. Open your backend project
3. Go to Variables
4. Update `CORS_ORIGIN`:
```bash
CORS_ORIGIN=https://gap-dashboard.vercel.app
```

5. Click "Deploy" to apply changes

## Step 4: Redeploy Frontend

After setting environment variable:
```bash
vercel --prod
```

Or in Vercel Dashboard:
**Deployments → ... → Redeploy**

## Step 5: Test Your App

Visit your Vercel URL:
```
https://gap-dashboard.vercel.app
```

Check:
- ✅ Dashboard loads
- ✅ Premium opportunities display
- ✅ Modal opens and execution works
- ✅ No CORS errors in browser console

## Vercel Free Tier
- Unlimited deployments
- 100GB bandwidth per month
- Automatic HTTPS
- Global CDN
- Preview deployments for every git push

## Troubleshooting

### API calls fail / CORS errors
1. Check browser console for errors
2. Verify `VITE_API_URL` in Vercel environment variables
3. Verify `CORS_ORIGIN` in Railway matches your Vercel URL
4. Make sure both URLs use `https://`

### Environment variable not working
- Environment variables only update on new deployments
- Redeploy after adding/changing variables
- Check spelling: `VITE_API_URL` (must start with `VITE_`)

### Build fails
- Check Vercel build logs
- Test build locally: `npm run build`
- Verify all dependencies are in `package.json`

### Blank page after deployment
- Check browser console for errors
- Verify `vercel.json` rewrites are configured
- Check if build output directory is correct (`dist`)

## Monitoring
- View deployments: Vercel Dashboard → Deployments
- Logs: Click on any deployment → View Function Logs
- Analytics: Vercel Dashboard → Analytics (on Pro plan)

## Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `CORS_ORIGIN` in Railway with new domain
