# BlockPost Deployment Guide

## Overview
This document outlines the deployment process for all components of BlockPost.

**PERSON 4**: Complete this document with deployment instructions.

---

## Prerequisites
- Node.js v18+
- MetaMask wallet with Mumbai testnet MATIC
- IPFS node or Pinata account
- MongoDB or PostgreSQL instance

---

## 1. Smart Contract Deployment

### Deploy to Mumbai Testnet
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy-Mumbai.js --network mumbai
```

### Verify Contract
```bash
npx hardhat verify --network mumbai <CONTRACT_ADDRESS>
```

**TODO**: Document deployed contract address and ABI location.

---

## 2. Backend Deployment

### Local Development
```bash
cd backend
npm install
cp .env.example .env
# Fill in .env with your configuration
npm run dev
```

### Production Deployment
**TODO**: Add instructions for deploying to:
- Railway / Render / Heroku
- AWS / Azure / GCP
- Docker container

---

## 3. Frontend Deployment

### Build for Production
```bash
cd frontend
npm install
npm run build
```

### Deploy to Vercel/Netlify
**TODO**: Add deployment instructions

---

## 4. Environment Configuration

### Required Environment Variables
**TODO**: List all required env vars for production

---

## 5. Post-Deployment Checklist
- [ ] Smart contract deployed and verified
- [ ] Backend API accessible
- [ ] Frontend connected to backend
- [ ] Wallet connection working
- [ ] IPFS uploads functional
- [ ] Blockchain writes working

---

## Troubleshooting
**TODO**: Add common issues and solutions
