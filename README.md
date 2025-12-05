<!--
  README.md for BlockPost
  This file provides a unified overview for the entire project: frontend, backend, and smart-contracts.
  Keep it up-to-date as the project evolves.
-->

# BlockPost — Decentralized Content & Verification Platform

BlockPost is a decentralized content platform that stores media and metadata on IPFS, verifies originality using a multi-layer hashing approach (VideoGuard verification), and records ownership/verification evidence on-chain (Polygon). The project combines a React + Vite frontend, TypeScript Node backend, and Solidity smart contracts.

---

## Table of contents

- **Project overview**
- **Key features**
- **Architecture & components**
- **Tech stack**
- **Getting started** (backend / frontend / contracts)
- **Environment variables**
- **Development & testing**
- **Troubleshooting**
- **Contributing**
- **License & contacts**

---

## Project overview

BlockPost enables creators to upload content (video/image/audio), store the content and metadata on IPFS, compute robust hashes (exact + perceptual + audio), and optionally register verification proofs on-chain. It is designed for transparency, redundancy, and low cost.

Use cases:

- Copyright registration & evidence
- Duplicate/repost detection across the network
- Creator profiles with linked wallets and on-chain proof

---

## Key features

- Multi-layer duplicate detection: SHA-256 (exact), perceptual hash (visual), and audio fingerprinting
- Dual IPFS pinning (Pinata + Web3.Storage) with gateway URLs for retrieval
- Optional on-chain registration & verification (Polygon testnet)
- React frontend with MetaMask integration, feed, profiles, and upload UI
- Backend API for upload, metadata management, and verification endpoints

---

## Architecture & components

- `frontend/` — React + Vite application (UI, feed, profiles, create-post modal)
- `backend/` — Node + TypeScript Express API (upload handling, hash engine, IPFS, contract interactions)
- `contracts/` — Solidity smart contract(s) (VideoGuard contract for registrations and verification)
- `docs/` — Project documentation and deployment notes

High-level flow:

1. User uploads media through the frontend.
2. Backend computes hashes, pins media & metadata to IPFS, and returns gateway URLs.
3. Backend optionally calls the smart contract to register verification proof on-chain.
4. Frontend displays posts from the backend (which loads pinned posts on server startup).

---

## Tech stack

- Frontend: React, Vite, Tailwind CSS, React Router, ethers.js
- Backend: Node.js, TypeScript, Express, Multer, axios
- IPFS: Pinata (primary), Web3.Storage (backup)
- Blockchain: Solidity contract(s), Polygon Mumbai testnet, ethers.js

---

## Getting started

The repository contains three main folders: `frontend`, `backend`, and `contracts`.

Prerequisites

- Node.js 18+ and npm/yarn
- MetaMask (for local testing with Polygon Mumbai)

### Backend

1. Install dependencies

```powershell
cd backend
npm install
```

2. Create and populate `.env` (see **Environment variables** below)

3. Run development server (hot-reload)

```powershell
npm run dev
```

4. Build & production

```powershell
npm run build
npm start
```

> Note: Backend startup will attempt to load pinned metadata from Pinata (if credentials are provided) so the feed can show previously pinned posts.

### Frontend

1. Install and run

```powershell
cd frontend
npm install
npm run dev
```

2. Open the app: `http://localhost:5173` (default Vite port)

### Contracts (Hardhat)

1. Compile & deploy

```powershell
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy-Mumbai.js --network mumbai
```

2. After deployment, update `backend/.env` with `CONTRACT_ADDRESS` and `POLYGON_RPC`.

---

## Environment variables

Create a `.env` file in `backend/` using `.env.example` as a template. Common variables:

- `PINATA_API_KEY` — Pinata API key (optional if using JWT)
- `PINATA_API_SECRET` — Pinata secret (optional)
- `PINATA_JWT` — Pinata JWT token (recommended)
- `WEB3STORAGE_TOKEN` — Web3.Storage API token (optional)
- `POLYGON_RPC` — Polygon/Alchemy/Infura RPC URL
- `CONTRACT_ADDRESS` — Deployed VideoGuard contract (optional)
- `PORT` — Backend port (default 3001)

Keep secrets out of version control.

---

## Development notes & tips

- Backend loads posts from Pinata on startup (if credentials provided). If feed appears empty, ensure the backend was restarted after adding Pinata credentials.
- Use the MetaMask account selector during login/connect to switch wallets; the frontend persists connected wallet in `localStorage` to survive refreshes.
- For faster local iteration, run frontend and backend separately and point frontend to `VITE_API_BASE_URL`.

---

## Troubleshooting

- Feed empty after adding posts: Restart backend so it re-loads pinned metadata from Pinata, or call the `/assets` endpoint directly to debug.
- MetaMask not connecting: Ensure MetaMask is installed and the site is allowed. Use the account selector to change accounts.
- Pinata errors: Verify `PINATA_JWT` or API keys and check rate-limiting/permissions.

---

## Contributing

Contributions are welcome. Typical flow:

```powershell
# Create branch
git checkout -b feature/your-feature

# Work and commit
git add .
git commit -m "feat: description"

# Push
git push origin feature/your-feature
# Create PR on GitHub
```

Please ensure linting and basic tests pass before opening a PR.

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.

---

## Maintainers & Contact

- GitHub: `https://github.com/VTG56/BlockPost`
- Project lead: BlockPost Team

---

_This README replaces older or duplicate README files. If you'd like a trimmed or more marketing-focused README, tell me what sections to emphasize._
