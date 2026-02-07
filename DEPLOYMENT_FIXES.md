# Railway Deployment Fixes

## Issue Summary

Railway deployment was failing during the TypeScript compilation step with the following errors:

### TypeScript Compilation Errors (TS6133)
```
src/services/realtimePriceService.ts(41,20): error TS6133: 'MIN_PRICE_CHANGE_PERCENT' is declared but its value is never read.
src/services/realtimePriceService.ts(104,37): error TS6133: 'interval' is declared but its value is never read.
src/services/realtimePriceService.ts(224,11): error TS6133: 'previousPrice' is declared but its value is never read.
src/services/websocketService.ts(76,20): error TS6133: 'HEARTBEAT_TIMEOUT_MS' is declared but its value is never read.
src/services/websocketService.ts(403,27): error TS6133: 'client' is declared but its value is never read.
```

### Node.js Version Mismatch Warning
```
npm warn EBADENGINE Unsupported engine {
  package: 'react-router@7.13.0',
  required: { node: '>=20.0.0' },
  current: { node: 'v18.20.5', npm: '10.8.2' }
}
```

## Root Causes

1. **Unused Variables**: Development code included variables declared for future use but never actually utilized in the current implementation
2. **Node Version**: Railway's Nixpacks auto-detected Node 18, but react-router 7.x requires Node 20+

## Fixes Applied

### 1. Fixed TypeScript Unused Variables

#### File: `backend/src/services/realtimePriceService.ts`

**Line 41-43**: Removed unused `MIN_PRICE_CHANGE_PERCENT` constant
```typescript
// Before:
private readonly UPDATE_INTERVAL_MS = 4000; // 4 seconds
private readonly MIN_PRICE_CHANGE_PERCENT = 0.001; // 0.1%
private readonly MAX_PRICE_CHANGE_PERCENT = 0.02; // 2%

// After:
private readonly UPDATE_INTERVAL_MS = 4000; // 4 seconds
private readonly MAX_PRICE_CHANGE_PERCENT = 0.02; // 2%
```

**Line 104**: Prefixed unused `interval` parameter with underscore
```typescript
// Before:
this.updateIntervals.forEach((interval, symbol) => {

// After:
this.updateIntervals.forEach((_interval, symbol) => {
```

**Line 224**: Removed unused `previousPrice` variable
```typescript
// Before:
const newPrice = this.simulatePriceMovement(state);
const previousPrice = state.currentPrice;

// After:
const newPrice = this.simulatePriceMovement(state);
```

#### File: `backend/src/services/websocketService.ts`

**Line 76**: Removed unused `HEARTBEAT_TIMEOUT_MS` constant
```typescript
// Before:
private readonly MAX_SUBSCRIPTIONS_PER_CLIENT = 50;
private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
private readonly HEARTBEAT_TIMEOUT_MS = 5000; // 5 seconds

// After:
private readonly MAX_SUBSCRIPTIONS_PER_CLIENT = 50;
private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
```

**Line 403**: Prefixed unused `client` parameter with underscore
```typescript
// Before:
this.clients.forEach((client, ws) => {

// After:
this.clients.forEach((_client, ws) => {
```

### 2. Set Node.js Version Requirements

#### File: `backend/package.json`

Added `engines` field to specify Node 20+ requirement:
```json
{
  "name": "kuya-charts-backend",
  "version": "1.0.0",
  "description": "Backend API for Kuya Charts stock charting application",
  "main": "dist/index.js",
  "type": "module",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    // ...
  }
}
```

This ensures:
- Railway will use Node 20+ during deployment
- Local developers are warned if using incompatible Node version
- Aligns with react-router@7.13.0 requirements

## Verification

Build verification completed successfully:
```bash
$ cd backend && npm run build
> kuya-charts-backend@1.0.0 build
> tsc

✅ Build completed with exit code 0 (no errors)
```

## Next Steps for Deployment

1. **Commit these changes** to your Git repository:
   ```bash
   cd /Users/allanbranstiter/Documents/GitHub/kuya-charts
   git add .
   git commit -m "fix: Remove unused TypeScript variables and set Node 20+ requirement for Railway deployment"
   git push origin main
   ```

2. **Redeploy on Railway**:
   - Railway will automatically detect the new commit and redeploy
   - Or trigger manual redeploy from Railway dashboard
   - Railway will now use Node 20+ based on the engines field

3. **Monitor the deployment**:
   - Check Railway logs to verify successful build
   - Verify all environment variables are set correctly in Railway dashboard
   - Test the deployed application endpoints

## Environment Variables Checklist

Before deploying, ensure these are set in Railway:

### Backend Service
- ✅ `DATABASE_URL` - PostgreSQL connection string (Railway will provide this)
- ✅ `REDIS_URL` - Redis connection string (Railway will provide this)
- ✅ `JWT_SECRET` - Random secure string (generate with: `openssl rand -base64 32`)
- ✅ `ALPHA_VANTAGE_API_KEY` - Your Alpha Vantage API key
- ✅ `FRONTEND_URL` - Your frontend Railway URL (e.g., `https://your-app.railway.app`)
- ✅ `NODE_ENV` - Set to `production`
- ⚠️ `PORT` - Railway sets this automatically

### Frontend Service
- ✅ `VITE_API_BASE_URL` - Your backend Railway URL (e.g., `https://your-backend.railway.app`)
- ✅ `VITE_WS_URL` - WebSocket URL (e.g., `wss://your-backend.railway.app`)
- ✅ `VITE_ENV` - Set to `production`

## References

- TypeScript TS6133 Error: https://typescript-errors.com/ts6133
- Railway Node.js Deployment: https://docs.railway.app/guides/nodejs
- Node Version Specification: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#engines

---

**Status**: ✅ All deployment blockers resolved  
**Date**: 2026-02-07  
**Build Status**: Passing ✓
