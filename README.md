# Creato3

Creato3 is an AI-powered creator monetization platform built on the Initia EVM appchain `creato3-1`.
Creators launch subscription tiers, subscribers pay on-chain, and creators keep 100% of subscription revenue.

## Initia Hackathon Submission

- **Project Name**: Creato3

### Project Overview

Creato3 helps creators launch paid communities without giving up revenue to platform fees.
Creators publish tiers, fans subscribe on-chain, and AI pricing guidance helps creators choose plans that fit their niche, audience size, and premium content mix.

### Implementation Detail

- **Custom Implementation**: `creato3/` contains the Solidity contracts that power creator registration, tier management, subscriptions, and treasury withdrawals.
- **Native Feature**: `creato3-frontend/` integrates Initia auto-signing, Initia usernames, and Interwoven Bridge for smoother onboarding and subscriptions.
- **Revenue Model**: Creato3 takes zero platform fees. Subscription payments go fully to the creator treasury and creators withdraw the full amount.

### Repository Structure

- `creato3/src/CreatorProfile.sol`
- `creato3/src/CreatorTreasury.sol`
- `creato3/src/SubscriptionManager.sol`
- `creato3-frontend/src/components/SubscribeFlow.jsx`
- `.initia/submission.json`

### Deployed Contracts

- `PROFILE_ADDR`: `0xc3a2dd5085c2E74FE0A3e3Ce6e10d72581888de9`
- `TREASURY_ADDR`: `0x23B115b2cc1a31E959446034890B5dA9c75A7e28`
- `SUB_ADDR`: `0xb459aF522fDae51FCf7654Adc0B00E97F74CfFdF`

### How to Run Locally

1. Start the local Initia appchain and confirm the chain ID is `creato3-1`.
2. Run contract checks:

```bash
cd creato3
forge build
forge test -vvv --offline
```

3. Start the frontend:

```bash
cd creato3-frontend
npm install
npm run dev
```

4. Open `http://localhost:5173`, connect an Initia wallet, register a creator profile, and test subscribe and withdraw flows.

### Automatic First-Time Account Bootstrap

When the frontend runs in dev mode, it now exposes a local sponsor endpoint that can auto-create
missing `creato3-1` accounts before the first transaction is sent. This uses the local
`gas-station` key from `minitiad`.

Prerequisites:

- `minitiad` must be installed and available in `PATH`
- the `gas-station` key must exist in `minitiad keys list --keyring-backend test`
- the gas station account must have at least one positive bank balance on `creato3-1`

Optional server-side env vars:

- `GAS_STATION_KEY_NAME` (default: `gas-station`)
- `GAS_STATION_KEYRING_BACKEND` (default: `test`)
- `BOOTSTRAP_AMOUNT` (default: `auto`, which picks a positive bank denom from `gas-station`)
- `BOOTSTRAP_COSMOS_RPC` (defaults to `VITE_COSMOS_RPC`)
- `VITE_NATIVE_DENOM` (default: `GAS` for this local chain)
- `VITE_NATIVE_SYMBOL` / `VITE_NATIVE_NAME` (optional UI/display labels)

### Vercel Deployment

The frontend is now structured for Vercel:

- `creato3-frontend/vercel.json` adds SPA rewrites so `BrowserRouter` paths refresh correctly.
- `creato3-frontend/api/claude.js` is a serverless proxy for Anthropic using server-side env vars.
- `creato3-frontend/api/account/bootstrap.js` is a serverless bootstrap endpoint for first-time account activation.
- Production endpoint fallbacks no longer silently point to `localhost`.

Recommended Vercel project settings:

1. Set the Root Directory to `creato3-frontend`.
2. Build Command: `npm run build`
3. Output Directory: `dist`

Required client env vars in Vercel:

- `VITE_PROFILE_CONTRACT`
- `VITE_SUBSCRIPTION_CONTRACT`
- `VITE_TREASURY_CONTRACT`
- `VITE_CHAIN_ID`
- `VITE_EVM_RPC`
- `VITE_COSMOS_RPC`
- `VITE_REST_API`
- `VITE_INDEXER_URL`

Recommended client env vars:

- `VITE_NATIVE_DENOM`
- `VITE_NATIVE_SYMBOL`
- `VITE_NATIVE_NAME`
- `VITE_AI_MODE=claude` if you want production AI pricing, otherwise keep `local`
- `VITE_ANTHROPIC_API_URL=/api/claude`
- `VITE_BOOTSTRAP_API_URL=/api/account/bootstrap`

Required server env vars for Claude:

- `ANTHROPIC_API_KEY`

Choose one bootstrap strategy for production:

- `BOOTSTRAP_PROVIDER=mnemonic`
  Use this when Vercel should sponsor accounts directly.
  Required:
  `GAS_STATION_MNEMONIC`, `BOOTSTRAP_COSMOS_RPC`, `BOOTSTRAP_CHAIN_ID`

- `BOOTSTRAP_PROVIDER=remote`
  Use this when you already have a separate sponsor backend.
  Required:
  `BOOTSTRAP_SPONSOR_API_URL`
  Optional:
  `BOOTSTRAP_SPONSOR_API_TOKEN`

- `BOOTSTRAP_PROVIDER=disabled`
  Use this when you do not want production auto-bootstrap.

Example production assumptions:

- all RPC/REST/EVM/indexer URLs must be public and browser-reachable
- the gas-station account must hold a positive balance on the target chain
- the public chain must match the deployed contract addresses

### Notes for Demo Recording

- Confirm the relayer and executor are healthy before recording.
- Restart the frontend after editing `creato3-frontend/.env`.
- Fill `repo_url`, `commit_sha`, and `demo_video_url` in `.initia/submission.json` before submission.
