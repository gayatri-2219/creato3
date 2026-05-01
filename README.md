<div align="center">

# Creato3

### **The Zero-Fee Subscription Layer for Creators**

*Where creators launch paid communities, fans subscribe on-chain, and AI helps price tiers in INIT on Initia.*

[![Initia](https://img.shields.io/badge/Initia-Appchain-00D4AA)](https://initia.xyz)
[![MiniEVM](https://img.shields.io/badge/MiniEVM-Solidity-8B5CF6)](https://initia.xyz)
[![InterwovenKit](https://img.shields.io/badge/InterwovenKit-Wallet%20UX-60A5FA)](https://docs.initia.xyz)
[![Groq](https://img.shields.io/badge/AI-Groq-F472B6)](https://console.groq.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com)

[Architecture Diagram](./creato3/architecture_diagram.md) | [Public Deploy Guide](./creato3/DEPLOY_PUBLIC.md) | [Demo Script](./creato3/demo_video_script.md) | [Frontend Guide](./creato3-frontend/README.md)

</div>

---

## What Is Creato3?

https://creato3-frontend.vercel.app/
Patreon takes a cut. Substack takes a cut. Creato3 is designed to take zero.

Creato3 is a creator monetization product built on an Initia appchain where:

- creators register an on-chain profile with a readable `.init` identity
- creators launch paid membership tiers priced in `INIT`
- fans subscribe through Initia-native wallet flows
- every important action can be proved with a transaction hash
- AI helps creators pick pricing, package premium content, and explain the reasoning behind the recommendation

The result is a creator-first subscription product with direct ownership, verifiable payments, and smoother onboarding than a typical crypto app.

## Initia Hackathon Submission

**Project Name:** Creato3

### Project Overview

Creato3 solves a familiar creator problem: creators do the hard work of building an audience, but when it is time to monetize, centralized platforms take a meaningful cut.

Creato3 replaces that platform tax with direct on-chain subscriptions. Creators create a profile, launch one or more paid tiers, and fans subscribe through a guided Initia flow. Subscription state and payouts live on-chain, while AI stays off-chain where it can iterate quickly and help with pricing, revenue forecasting, and content strategy.

The result is a creator product first, not just a protocol demo: cleaner onboarding, direct ownership, zero platform fees, and a smoother appchain experience.

## Custom Implementation

Creato3 implements a complete creator subscription stack:

- `CreatorProfile` stores creator identity and tier configuration on-chain
- `SubscriptionManager` handles new subscriptions and renewals
- `CreatorTreasury` preserves the zero-platform-fee payout path
- the frontend ABI-encodes contract calls and sends them as Initia `MsgCall` transactions to miniEVM
- the launch flow includes an AI pricing agent that returns three `INIT/month` tiers plus human-readable reasoning
- first-time users are supported with appchain account bootstrap before their first important transaction
- the UI now surfaces transaction hashes after profile creation, tier launch, and subscription so demo viewers can verify actions on Initia

## Native Feature

Creato3's primary Initia native feature is **auto-signing**.

Subscriptions need to feel like a consumer product, not a wallet-popup ritual. With InterwovenKit auto-sign enabled, repeat actions can feel dramatically smoother, which is exactly what a creator membership product needs.

Creato3 also uses other Initia-native capabilities directly in the product:

- `.init` usernames for readable creator identity
- Interwoven Bridge for moving funds from Initia L1 into the appchain flow
- MiniEVM for Solidity-based contract execution
- appchain-aware wallet and transaction UX through InterwovenKit

## Why This Matters

| Today | With Creato3 |
| --- | --- |
| Creators lose 10% to platform fees | Creators keep 100% of subscription revenue |
| Fans hit wallet, gas, and bridge friction | Bridge support, bootstrap, and guided flows reduce onboarding pain |
| Creator pricing is guesswork | AI suggests tiers, positioning, and revenue expectations |
| Crypto addresses feel impersonal | `.init` usernames make creator identity readable |
| Recurring subscriptions feel clunky on-chain | Auto-signing makes repeat actions feel more product-like |

## Demo-Ready Product Flow

1. Creator connects a wallet and registers a creator profile on-chain.
2. Creator opens the launch flow, uploads premium content, and runs AI pricing.
3. AI returns a three-tier INIT breakdown with source and reasoning.
4. Creator launches or updates a paid tier on-chain.
5. Fan opens the creator page and subscribes on-chain.
6. The UI shows a transaction hash for each critical step so the action can be verified externally.

## How It Works

```text
Creator / Fan
     |
     v
Creato3 Frontend
- Landing, Discover, Create Profile, Launch, Subscribe
- AI pricing + reasoning + demo proof panels
- Tx hash visibility for verification
     |
     v
Initia UX Layer
- InterwovenKit wallet flow
- .init usernames
- Interwoven Bridge
- Auto-sign
     |
     v
Initia Appchain (creato3-1) + MiniEVM
- MsgCall transaction execution
- On-chain creator + subscription state
     |
     v
Smart Contracts
- CreatorProfile
- SubscriptionManager
- CreatorTreasury
```

### Main Subscription Flow

```text
Creator creates profile -> Creator launches a tier -> Fan opens creator page
-> Fan bridges or bootstraps if needed -> Fan subscribes on-chain
-> SubscriptionManager records access -> Funds route to CreatorTreasury
-> Creator withdraws full revenue later
```

## Why Initia

| Initia Feature | How Creato3 Uses It |
| --- | --- |
| Own appchain | The product is built around `creato3-1`, so the chain can feel purpose-built for creator subscriptions |
| MiniEVM | Core business logic runs in Solidity contracts |
| Auto-signing | Makes repeated subscription actions smoother |
| Interwoven Bridge | Helps fans fund the appchain flow from Initia L1 |
| `.init` usernames | Turns raw wallet addresses into human-readable creator identity |
| InterwovenKit | Provides wallet, bridge, chain registration, and appchain-aware UX |

## What You Can Do

### As a Creator

- create an on-chain profile with display name, bio, category, and username
- launch paid membership tiers
- use AI to choose pricing and estimate revenue upside versus Web2 platforms
- receive subscription revenue and withdraw it without platform-fee deductions

### As a Fan

- discover creators
- fund the appchain path through bridge or sponsored first-transaction setup
- subscribe to creators on-chain
- return later to manage active subscriptions

### As the Product Team

- run local appchain development on `creato3-1`
- point the frontend at public Initia MiniEVM networks when needed
- deploy the frontend to Vercel and keep contract deployment separate

## Local Runbook

### 1. Install everything

```bash
cd my-initia-project
npm run install:all
```

### 2. Configure env files

```bash
cp backend/.env.example backend/.env
cp creato3-frontend/.env.example creato3-frontend/.env
cp agents/.env.example agents/.env
cp mcp-server/.env.example mcp-server/.env
```

Minimum useful setup:

- `backend/.env`: `MONGO_URI`, `GROQ_API_KEY`, chain values, contract addresses
- `creato3-frontend/.env`: `VITE_BACKEND_URL`, chain values, contract addresses
- optional: `VITE_TX_EXPLORER_BASE_URL=https://scan.testnet.initia.xyz/tx`

### 3. Start backend and frontend

```bash
npm run dev:backend:simple
```

In a second terminal:

```bash
npm run dev:frontend
```

### 4. Smoke-test the API

```bash
curl -s http://localhost:3001/health
curl -s -X POST http://localhost:3001/api/ai/pricing-advice \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"Demo","category":"music","followers":2500,"bio":"Producer","contentSummary":"Stems + monthly livestream"}'
```

### 5. Demo the UI

Open `http://localhost:5173` and walk through:

1. `Create Profile`
2. `Launch`
3. `AI pricing agent`
4. `Creator page`
5. `Subscribe`
6. `Agents` for AI agent draft, disposable wallet generation, optional sponsor funding, and on-chain agent registration

After each on-chain action, copy the transaction hash and verify it on Initia.

### AI agent demo

The `Agents` page supports a complete testnet agent flow:

1. generate an AI creator-agent profile and launch kit
2. generate a disposable testnet wallet for that agent
3. optionally auto-fund the wallet from the configured sponsor key
4. register the agent as an on-chain creator through `CreatorProfile`
5. store the agent profile, launch post, suggested tier, and transaction proof in browser storage for the demo

For the deployed Vercel app, set the same public chain env values as the frontend plus a funded testnet-only `BOOTSTRAP_EVM_PRIVATE_KEY` if you want auto-funding. For local backend/MCP demos, start the backend and point `VITE_BACKEND_URL` or `mcp-server/.env` at it.

## Public Deployment

This snapshot includes a helper script that deploys the three Creato3 contracts from compiled artifacts under `creato3/out/`.

```bash
cd creato3

CHAIN_ID=minievm-2 \
EVM_RPC=https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz \
PUBLIC_GAS_PRICE=REPLACE_WITH_PUBLIC_MIN_GAS_PRICE \
GAS_STATION_PK=0x... \
PUBLIC_REST_API=https://rest-evm-1.anvil.asia-southeast.initia.xyz \
PUBLIC_INDEXER_URL=https://rollytics-api-evm-1.anvil.asia-southeast.initia.xyz \
./scripts/deploy_creato_public.sh
```

The script deploys contracts in this order:

1. `CreatorProfile`
2. `CreatorTreasury`
3. `SubscriptionManager`
4. `CreatorTreasury.setAuthorizedCaller(subscription)`

For the full public-network checklist, see [creato3/DEPLOY_PUBLIC.md](./creato3/DEPLOY_PUBLIC.md).

## Deployed Contracts

### Local `creato3-1` Defaults

| Contract | Address |
| --- | --- |
| `CreatorProfile` | `0xc3a2dd5085c2E74FE0A3e3Ce6e10d72581888de9` |
| `CreatorTreasury` | `0x23B115b2cc1a31E959446034890B5dA9c75A7e28` |
| `SubscriptionManager` | `0xb459aF522fDae51FCf7654Adc0B00E97F74CfFdF` |

### Public `evm-1` Frontend Example

These are the current public example values documented in `creato3-frontend/README.md`:

| Contract | Address |
| --- | --- |
| `CreatorProfile` | `0x109544311B0A7a6E75a22d07E1137FeF9eC4c4F9` |
| `CreatorTreasury` | `0x398442C384949b7b8E2F3F5332B5b76672b841De` |
| `SubscriptionManager` | `0x9776152A4d9A7f0e04db5F6e4ED0f0001dEddF87` |

## Repository Structure

```text
my-initia-project/
├── .initia/
│   └── submission.json
├── README.md
├── creato3/
│   ├── DEPLOY_PUBLIC.md
│   ├── architecture_diagram.md
│   ├── demo_video_script.md
│   ├── info.md
│   ├── scripts/
│   │   └── deploy_creato_public.sh
│   ├── out/                      # compiled contract artifacts
│   └── cache/                    # Solidity build metadata
└── creato3-frontend/
    ├── README.md
    ├── api/                      # Vercel/serverless helpers
    ├── src/app/pages/            # landing, discover, profile, subscribe flows
    ├── src/api/creatorAI.js      # pricing, revenue, and content strategy
    ├── src/utils/msgCall.js      # Initia MsgCall execution path
    └── src/utils/accountBootstrap.js
```

## Demo Notes

- Groq-backed AI is live when `GROQ_API_KEY` is set on the backend.
- X posting is optional; without credits or keys, you can keep demo mode on and still show the rest of the stack.
- For public testnet verification, set `VITE_TX_EXPLORER_BASE_URL` so success screens link directly to Initia scan pages.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Appchain | Initia appchain `creato3-1` with MiniEVM |
| Frontend | React 19, Vite, React Router, Tailwind CSS |
| Wallet UX | InterwovenKit, auto-signing, Interwoven Bridge, `.init` usernames |
| Smart Contracts | Solidity contract artifacts for `CreatorProfile`, `SubscriptionManager`, `CreatorTreasury` |
| AI Layer | Local/mock modes, LM Studio support, Claude API option |
| Deployment | Vercel-ready frontend plus public contract deployment helper |

## Submission Metadata

- Repo: `https://github.com/gayatri-2219/creato3`
- Rollup chain ID: `creato3-1`
- VM: `evm`
- Native feature: `auto-signing`
- Submission file: `.initia/submission.json`
