# Railway Deployment Guide for Kuya Charts

This guide walks you through deploying the Kuya Charts full-stack application to Railway with proper secret management.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Deployment Architecture](#deployment-architecture)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Environment Variables Reference](#environment-variables-reference)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [WebSocket Configuration](#websocket-configuration)
- [Custom Domain Setup](#custom-domain-setup)
- [Post-Deployment Tasks](#post-deployment-tasks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ Railway account ([railway.app](https://railway.app))
- ✅ GitHub repository with your code
- ✅ Alpha Vantage API key ([get one here](https://www.alphavantage.co/support/#api-key))
- ✅ All `.env` files are in `.gitignore` (no secrets committed)
- ✅ Backend and frontend `.env.example` files are up to date

---

## Project Structure

```
kuya-charts/
├── backend/              # Node.js + Express API
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/             # React + Vite
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── railway.json          # Railway configuration
└── README.md
```

---

## Deployment Architecture

### Option 1: Backend on Railway, Frontend on Vercel/Netlify (Recommended)

**Pros:**
- Best performance for static frontend
- Free frontend hosting
- Optimal for React/Vite apps
- Separate scaling

**Railway:** Backend API + Database + Redis  
**Vercel/Netlify:** Frontend static site

### Option 2: Full Stack on Railway

**Pros:**
- Single platform
- Unified billing
- Easier setup

**Railway:** Backend + Frontend + Database + Redis

This guide covers **Option 1** (recommended), with notes for Option 2.

---

## Backend Deployment

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authenticate with GitHub
5. Select **`kuya-charts`** repository

### Step 2: Configure Backend Service

1. Railway will detect the monorepo structure
2. Click **"Configure"** for the service
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `npm ci && npm run build`
5. Set **Start Command**: `npm start`
6. Railway will use [`railway.json`](./railway.json) for additional config

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway automatically creates and sets `DATABASE_URL` environment variable
3. No additional configuration needed!

### Step 4: Add Redis Cache (Optional but Recommended)

1. In your Railway project, click **"New"** → **"Database"** → **"Add Redis"**
2. Railway automatically creates and sets `REDIS_URL` environment variable
3. No additional configuration needed!

### Step 5: Set Backend Environment Variables

In Railway dashboard, go to your backend service → **Variables** tab:

#### Required Variables:

```bash
NODE_ENV=production
JWT_SECRET=<generate-secure-secret>
ALPHA_VANTAGE_API_KEY=<your-api-key>
FRONTEND_URL=<your-frontend-url>
```

#### Generate JWT_SECRET:

```bash
# On macOS/Linux:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and paste it as `JWT_SECRET` value.

#### Auto-Configured by Railway (DO NOT SET):
- `PORT` - Railway assigns this dynamically
- `DATABASE_URL` - Set automatically by PostgreSQL plugin
- `REDIS_URL` - Set automatically by Redis plugin

### Step 6: Deploy Backend

1. Railway will automatically deploy on push to `main` branch
2. Monitor deployment in **"Deployments"** tab
3. Check logs for any errors
4. Once deployed, note your backend URL (e.g., `https://kuya-charts-backend.up.railway.app`)

### Step 7: Test Backend Health

Visit your backend URL + `/api/health`:
```
https://your-backend.up.railway.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "Kuya Charts API is running",
  "timestamp": "2024-xx-xxTxx:xx:xx.xxxZ"
}
```

---

## Frontend Deployment

### Option A: Deploy to Vercel (Recommended)

#### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

#### Step 2: Deploy from Frontend Directory

```bash
cd frontend
vercel
```

#### Step 3: Configure Build Settings

When prompted:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### Step 4: Set Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```bash
VITE_API_BASE_URL=https://your-backend.up.railway.app/api
VITE_WS_URL=wss://your-backend.up.railway.app/ws
VITE_ENV=production
```

**Important:** Use `wss://` (not `ws://`) for secure WebSocket in production!

#### Step 5: Redeploy

```bash
vercel --prod
```

### Option B: Deploy Frontend to Netlify

#### Step 1: Connect Repository

1. Go to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select your GitHub repository

#### Step 2: Configure Build

- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/dist`

#### Step 3: Set Environment Variables

In Netlify dashboard → Site settings → Environment variables:

```bash
VITE_API_BASE_URL=https://your-backend.up.railway.app/api
VITE_WS_URL=wss://your-backend.up.railway.app/ws
VITE_ENV=production
```

#### Step 4: Deploy

Netlify will auto-deploy on push to `main` branch.

### Option C: Deploy Frontend to Railway

#### Step 1: Add Frontend Service

1. In Railway project, click **"New"** → **"GitHub Repo"**
2. Select same repository
3. Click **"Add variables"** to configure

#### Step 2: Configure Service

- **Root Directory**: `frontend`
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npx vite preview --host 0.0.0.0 --port $PORT`

#### Step 3: Set Environment Variables

```bash
VITE_API_BASE_URL=https://your-backend.up.railway.app/api
VITE_WS_URL=wss://your-backend.up.railway.app/ws
VITE_ENV=production
```

---

## Environment Variables Reference

### Backend Variables

| Variable | Required | Source | Description |
|----------|----------|--------|-------------|
| `PORT` | Auto | Railway | Server port (Railway assigns) |
| `NODE_ENV` | Yes | Manual | Set to `production` |
| `DATABASE_URL` | Auto | PostgreSQL Plugin | PostgreSQL connection string |
| `REDIS_URL` | Auto | Redis Plugin | Redis connection string |
| `JWT_SECRET` | Yes | Manual | JWT signing key (min 32 chars) |
| `ALPHA_VANTAGE_API_KEY` | Yes | Manual | Stock data API key |
| `FRONTEND_URL` | Yes | Manual | Frontend URL for CORS |

### Frontend Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API URL with `/api` |
| `VITE_WS_URL` | Yes | WebSocket URL (use `wss://` in production) |
| `VITE_ENV` | Yes | Set to `production` |

**Important:** Frontend env vars are embedded at BUILD time, not runtime. Rebuild after changing them!

---

## Database Setup

### Initial Schema Setup

Railway PostgreSQL starts empty. You need to run migrations:

#### Option 1: Local Migration (Before Deployment)

```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Run migrations
cd backend
npm run migrate
```

#### Option 2: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run npm run migrate
```

#### Option 3: Use Railway Shell

1. In Railway dashboard, go to backend service
2. Click **"..."** menu → **"Shell"**
3. Run: `npm run migrate`

### Seed Initial Data

After migrations, seed the stocks data:

```bash
# Using Railway CLI
railway run npm run seed

# Or in Railway Shell
npm run seed
```

---

## Redis Setup

Redis is **optional** but recommended for:
- API response caching
- Rate limiting
- Session storage (future feature)

If Redis is unavailable, the app gracefully degrades (no caching).

### Verify Redis Connection

Check backend logs for:
```
✅ Redis connected successfully
```

---

## WebSocket Configuration

WebSockets work automatically on Railway with no special configuration.

### Important Notes:

1. **Use `wss://` in production** (not `ws://`)
2. Frontend WebSocket URL should match backend domain
3. Railway supports WebSocket connections by default
4. No additional ports or configuration needed

### Testing WebSocket Connection

1. Open browser DevTools → Console
2. Visit your frontend
3. Check for WebSocket connection messages
4. Should see: `[WebSocket] Connected successfully`

---

## Custom Domain Setup

### Backend Custom Domain

1. In Railway dashboard → Backend service → **Settings** → **Domains**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Add DNS records as shown (CNAME or A record)
5. Wait for DNS propagation (up to 24 hours)
6. Railway auto-provisions SSL certificate

### Frontend Custom Domain

#### On Vercel:
1. Settings → Domains → Add domain
2. Follow Vercel's DNS instructions

#### On Netlify:
1. Domain settings → Add custom domain
2. Follow Netlify's DNS instructions

### Update Environment Variables

After setting up custom domains, update:

**Backend:**
```bash
FRONTEND_URL=https://yourdomain.com
```

**Frontend:**
```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com/ws
```

Remember to redeploy frontend after changing Vite variables!

---

## Post-Deployment Tasks

### 1. Verify All Services

- [ ] Backend health check: `https://your-backend.up.railway.app/api/health`
- [ ] Frontend loads correctly
- [ ] Database connected (check backend logs)
- [ ] Redis connected (check backend logs)
- [ ] WebSocket connected (check browser console)

### 2. Test Core Features

- [ ] User registration and login
- [ ] Stock data fetching
- [ ] Chart rendering
- [ ] Real-time price updates (WebSocket)
- [ ] Watchlist functionality
- [ ] Chart configurations

### 3. Monitor Logs

**Railway Dashboard:**
- Backend service → Logs
- Look for errors or warnings

**Browser Console:**
- Check for API errors
- Verify WebSocket connection
- Check for CORS issues

### 4. Set Up Monitoring

Railway provides:
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time and historical
- **Alerts**: Set up in project settings

### 5. Configure CORS

Ensure backend `FRONTEND_URL` matches your actual frontend URL.

If using multiple domains:
```bash
# Backend .env
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com
```

Update backend CORS configuration in [`backend/src/index.ts`](./backend/src/index.ts) if needed.

---

## Troubleshooting

### Issue: "Cannot connect to backend"

**Possible Causes:**
- Backend not deployed
- Wrong `VITE_API_BASE_URL` in frontend
- CORS issues

**Solutions:**
1. Verify backend health endpoint
2. Check frontend env vars
3. Ensure `FRONTEND_URL` in backend matches frontend domain
4. Check browser console for CORS errors

---

### Issue: "Database connection failed"

**Possible Causes:**
- PostgreSQL plugin not added
- Migrations not run
- Connection string incorrect

**Solutions:**
1. Verify PostgreSQL plugin is added
2. Check `DATABASE_URL` is set automatically
3. Run migrations: `railway run npm run migrate`
4. Check backend logs for specific errors

---

### Issue: "WebSocket connection failed"

**Possible Causes:**
- Using `ws://` instead of `wss://` in production
- Backend URL incorrect
- Backend not running

**Solutions:**
1. Use `wss://` (not `ws://`) in production
2. Verify `VITE_WS_URL` in frontend env vars
3. Check backend is running and accessible
4. Test WebSocket separately: browser DevTools → Network → WS

---

### Issue: "JWT authentication errors"

**Possible Causes:**
- `JWT_SECRET` not set
- JWT_SECRET too short
- JWT_SECRET different between deployments

**Solutions:**
1. Set `JWT_SECRET` in Railway (min 32 characters)
2. Use same secret across all backend instances
3. Generate secure secret: `openssl rand -base64 32`

---

### Issue: "API rate limit exceeded"

**Possible Causes:**
- Alpha Vantage free tier limit (5 calls/minute, 500 calls/day)
- Too many requests

**Solutions:**
1. Implement request throttling in frontend
2. Use Redis caching (reduces API calls)
3. Consider Alpha Vantage premium plan
4. Cache responses longer

---

### Issue: "Build fails on Railway"

**Possible Causes:**
- Missing dependencies
- TypeScript errors
- Wrong build command

**Solutions:**
1. Check [`backend/package.json`](./backend/package.json) scripts
2. Verify TypeScript compiles locally: `npm run build`
3. Check Railway build logs for specific errors
4. Ensure `tsconfig.json` is correct
5. Try: `railway run npm ci && npm run build`

---

### Issue: "Environment variables not updating"

**Remember:** Vite env vars are embedded at BUILD time!

**Solutions:**
1. Change variables in Railway/Vercel/Netlify dashboard
2. **Trigger a rebuild** (not just restart)
3. Verify new values in deployed app
4. Clear browser cache

---

### Issue: "CORS errors in browser"

**Symptoms:**
```
Access to fetch at 'https://backend.railway.app/api/...' from origin 
'https://frontend.vercel.app' has been blocked by CORS policy
```

**Solutions:**
1. Set `FRONTEND_URL` in backend to match frontend domain
2. Include protocol (`https://`)
3. No trailing slash
4. For multiple domains, comma-separate them
5. Redeploy backend after changing CORS settings

---

### Issue: "502 Bad Gateway"

**Possible Causes:**
- Backend crashed
- Wrong start command
- Port binding issue

**Solutions:**
1. Check backend logs in Railway
2. Verify start command: `npm start`
3. Ensure backend uses `process.env.PORT`
4. Check for application errors in logs

---

## Useful Commands

### Railway CLI Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# View logs
railway logs

# Run command in Railway environment
railway run <command>

# SSH into service
railway shell

# View environment variables
railway variables

# Set environment variable
railway variables set KEY=value
```

### Local Testing with Production Variables

```bash
# Create .env.production locally (DO NOT COMMIT)
cp backend/.env.example backend/.env.production

# Edit with production values
# Then run:
NODE_ENV=production npm run dev
```

---

## Security Checklist

Before going live, verify:

- [ ] All `.env` files are in `.gitignore`
- [ ] No hardcoded API keys in code
- [ ] `JWT_SECRET` is strong (32+ characters)
- [ ] Using HTTPS (not HTTP) for all URLs
- [ ] Using WSS (not WS) for WebSocket in production
- [ ] `NODE_ENV=production` set in backend
- [ ] CORS configured with actual frontend domain
- [ ] Database credentials not exposed
- [ ] Redis credentials not exposed (if used)
- [ ] Alpha Vantage API key secure
- [ ] No sensitive data in logs
- [ ] Railway services have appropriate access controls

---

## Cost Estimation

### Railway (Backend + Database + Redis)

**Starter Plan:**
- $5/month credit
- Pay for usage beyond that
- Typical usage: $5-20/month for small apps

**Pro Plan:**
- $20/month for team features
- Better for production apps

### Vercel/Netlify (Frontend)

**Free Tier:**
- Generous limits for personal projects
- Automatic SSL
- CDN included

**Pro Tier:**
- ~$20/month
- Higher limits
- Better for production

### Alpha Vantage API

**Free Tier:**
- 5 API calls per minute
- 500 API calls per day
- Good for development/testing

**Premium:**
- Starts at $49.99/month
- Higher rate limits
- Required for production

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Add PostgreSQL and Redis plugins
3. ✅ Set environment variables
4. ✅ Run database migrations
5. ✅ Deploy frontend to Vercel/Netlify
6. ✅ Configure custom domains (optional)
7. ✅ Test all features
8. ✅ Set up monitoring
9. ✅ Configure alerts
10. ✅ Document your deployment

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [Alpha Vantage API Docs](https://www.alphavantage.co/documentation/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review Railway/Vercel/Netlify logs
3. Check browser console for frontend errors
4. Verify environment variables are set correctly
5. Test backend health endpoint directly

---

**Happy Deploying! 🚀**
