# Deployment Guide - BlockPost

This guide explains how to deploy BlockPost on **Vercel** (frontend) and **Render** (backend).

---

## 🚀 Quick Deployment Overview

- **Frontend**: Deploy on Vercel (React + Vite)
- **Backend**: Deploy on Render (Node.js + TypeScript)
- **Contracts**: Already deployed on Polygon Amoy testnet

---

## 📦 Vercel Deployment (Frontend)

### Step 1: Prepare Repository
The frontend is already configured with `vercel.json` for proper routing.

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository: `VTG56/BlockPost`
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Add Environment Variables on Vercel

Go to **Project Settings → Environment Variables** and add:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyC2B41pYtvbQUIsphi29yYk9plnbWxKvQ4
VITE_FIREBASE_AUTH_DOMAIN=blockpost-504cf.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=blockpost-504cf
VITE_FIREBASE_STORAGE_BUCKET=blockpost-504cf.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=916530851124
VITE_FIREBASE_APP_ID=1:916530851124:web:fc74bc8198794649734961

# Backend API (UPDATE THIS AFTER DEPLOYING BACKEND ON RENDER)
VITE_API_BASE_URL=https://your-backend-app.onrender.com

# Blockchain Configuration
VITE_POLYGON_RPC=https://polygon-amoy.g.alchemy.com/v2/5qwXrPZjOnyOXfEaaCYrG
VITE_CONTRACT_ADDRESS=0xdEff8efC99eA0685A9E2aA8c51DE70d4bc72EB8E
VITE_CHAIN_ID=80002
```

**Important**: After deploying backend on Render (Step 4 below), come back and update `VITE_API_BASE_URL` with your Render backend URL.

### Step 4: Deploy
Click **"Deploy"**. Vercel will build and deploy your frontend. You'll get a URL like `https://blockpost.vercel.app`.

---

## 🖥️ Render Deployment (Backend)

### Step 1: Prepare Backend
The backend is already configured with TypeScript build setup in `package.json`:
- `npm run build` → Compiles TypeScript to JavaScript
- `npm start` → Runs compiled code from `dist/`

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `VTG56/BlockPost`
4. Configure service:
   - **Name**: `blockpost-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `loadfeed` (or `main`)
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

### Step 3: Add Environment Variables on Render

Go to **Environment** tab and add these variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# CORS - Add your Vercel frontend URL here
CORS_ORIGIN=https://your-frontend-app.vercel.app,http://localhost:5173

# IPFS/Pinata Configuration
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4OTYxMmRkMi03NzZjLTRjOWItYTg4Zi1lMGQzMTNhMDhhOWQiLCJlbWFpbCI6InR1c2hhcnByYWRlZXAyNEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZWViMzhkMWFjMDQxMmFkOTgxNmUiLCJzY29wZWRLZXlTZWNyZXQiOiIwYzZhYTU3ZTQ4YzFiMGJmMGRmYzE5MGUzN2YyNThhMzVlMGY3NGU4YWEwOTg2ZGY4YjVkZjcxZDhkMWZiMWM5IiwiZXhwIjoxNzk2NDEzNjI1fQ.ro4_6ome8VIBtdHrFUjhGp0cOhF3sRNMIPzgw9P0Efc

# Legacy Pinata credentials (for backward compatibility)
PINATA_API_KEY=eeb38d1ac0412ad9816e
PINATA_API_SECRET=0c6aa57e48c1b0bf0dfc190e37f258a35e0f74e8aa0986df8b5df71d8d1fb1c9

# Blockchain Configuration
POLYGON_RPC=https://polygon-amoy.g.alchemy.com/v2/5qwXrPZjOnyOXfEaaCYrG
CONTRACT_ADDRESS=0xdEff8efC99eA0685A9E2aA8c51DE70d4bc72EB8E
BACKEND_PRIVATE_KEY=aa19cadd3c031e25028cd7e079a5108912a70d64e86c0b07b0dd48b4411f94e3

# Blockchain Mode
BLOCKCHAIN_MODE=frontend

# JWT Secret (generate a new secure random string for production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**⚠️ Important Security Notes**:
- Generate a new `JWT_SECRET` for production (use a random 64+ character string)
- Consider rotating `BACKEND_PRIVATE_KEY` if sharing this repository publicly
- Never commit `.env` files to git

### Step 4: Deploy
Click **"Create Web Service"**. Render will build and deploy your backend. You'll get a URL like `https://blockpost-backend.onrender.com`.

### Step 5: Update Frontend with Backend URL
1. Go back to Vercel project settings
2. Update `VITE_API_BASE_URL` environment variable with your Render backend URL
3. Redeploy frontend (Vercel → Deployments → Redeploy)

---

## 🔗 Post-Deployment Configuration

### Update CORS on Backend
After getting your Vercel frontend URL, update the `CORS_ORIGIN` environment variable on Render:

```env
CORS_ORIGIN=https://your-actual-app.vercel.app,http://localhost:5173
```

This allows your frontend to communicate with the backend.

### Test the Deployment
1. Visit your Vercel frontend URL
2. Try logging in with Firebase auth
3. Connect MetaMask wallet
4. Upload a test post
5. Check if posts load from Pinata

---

## 📝 Environment Variables Summary

### Frontend (.env on Vercel)
| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_BASE_URL` | Backend API endpoint | `https://backend.onrender.com` |
| `VITE_FIREBASE_*` | Firebase auth config | From Firebase console |
| `VITE_POLYGON_RPC` | Polygon RPC URL | Alchemy/Infura URL |
| `VITE_CONTRACT_ADDRESS` | Smart contract address | `0xdEff...` |
| `VITE_CHAIN_ID` | Polygon chain ID | `80002` (Amoy testnet) |

### Backend (.env on Render)
| Variable | Purpose | Required? |
|----------|---------|-----------|
| `PORT` | Server port | No (defaults to 3001) |
| `NODE_ENV` | Environment | Yes (`production`) |
| `CORS_ORIGIN` | Allowed frontend URLs | Yes |
| `PINATA_JWT` | Pinata auth token | Yes |
| `PINATA_API_KEY` | Legacy Pinata key | Optional |
| `PINATA_API_SECRET` | Legacy Pinata secret | Optional |
| `POLYGON_RPC` | Polygon RPC endpoint | Yes |
| `CONTRACT_ADDRESS` | Smart contract address | Yes |
| `BACKEND_PRIVATE_KEY` | Wallet private key | Yes (if blockchain_mode=backend) |
| `BLOCKCHAIN_MODE` | Transaction signing mode | Yes (`frontend` or `backend`) |
| `JWT_SECRET` | JWT signing secret | Yes |

---

## 🐛 Troubleshooting

### Frontend Issues

**Error: "Network Error" when uploading**
- Check `VITE_API_BASE_URL` points to correct Render backend URL
- Verify backend CORS includes your Vercel frontend URL

**MetaMask not connecting**
- Ensure you're on Polygon Amoy testnet (Chain ID: 80002)
- Check `VITE_CONTRACT_ADDRESS` matches deployed contract

**Posts not loading**
- Backend loads posts from Pinata on startup
- Check Render logs: Dashboard → Logs
- Verify `PINATA_JWT` is correct

### Backend Issues

**Build fails on Render**
- Check build command: `npm install && npm run build`
- Verify `tsconfig.json` exists in backend folder
- Check Render logs for TypeScript errors

**CORS errors in browser**
- Update `CORS_ORIGIN` on Render with your Vercel URL
- Restart backend service after updating env vars
- Clear browser cache

**Posts not persisting**
- Backend uses in-memory storage + Pinata IPFS
- Posts load from Pinata on server restart
- Check Pinata dashboard for pinned files

---

## 🎉 Success Checklist

- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on Render  
- [ ] Frontend `VITE_API_BASE_URL` points to Render backend
- [ ] Backend `CORS_ORIGIN` includes Vercel frontend URL
- [ ] All environment variables configured on both platforms
- [ ] Can login with Firebase authentication
- [ ] Can connect MetaMask wallet
- [ ] Can upload posts
- [ ] Can view posts in feed
- [ ] Posts persist after backend restart (loaded from Pinata)

---

## 📞 Support

If you encounter issues during deployment:
1. Check Vercel/Render logs for error messages
2. Verify all environment variables are set correctly
3. Test API endpoints directly using Postman/curl
4. Check browser console for frontend errors

---

**Note**: The first deployment on Render free tier may take 2-3 minutes to start. Subsequent requests will be faster once the service is warm.
