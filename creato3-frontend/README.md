# Creato3 Frontend

Creato3 is a creator-membership appchain on Initia. This frontend showcases:

- AI pricing + revenue insights (off-chain)
- Interwoven Bridge button for one‑click onboarding
- .init username display
- Auto‑signing subscriptions on the EVM rollup

## Local dev

```bash
npm install
npm run dev
```

## Vercel envs for the current Creato3 chain

Use these exact chain-specific values in Vercel for the deployment this repo is currently wired to:

```env
VITE_PROFILE_CONTRACT=0xc3a2dd5085c2E74FE0A3e3Ce6e10d72581888de9
VITE_SUBSCRIPTION_CONTRACT=0xb459aF522fDae51FCf7654Adc0B00E97F74CfFdF
VITE_TREASURY_CONTRACT=0x23B115b2cc1a31E959446034890B5dA9c75A7e28
VITE_CHAIN_ID=creato3-1
VITE_NATIVE_DENOM=GAS
VITE_NATIVE_SYMBOL=GAS
VITE_NATIVE_NAME=GAS
VITE_AI_MODE=claude
VITE_ANTHROPIC_API_URL=/api/claude
VITE_BOOTSTRAP_API_URL=/api/account/bootstrap

BOOTSTRAP_ENABLED=true
BOOTSTRAP_PROVIDER=mnemonic
BOOTSTRAP_CHAIN_ID=creato3-1
BOOTSTRAP_ADDRESS_PREFIX=init
BOOTSTRAP_AMOUNT=auto
BOOTSTRAP_FEE_DENOM=GAS
```

You still need to supply the public network endpoints for that same chain before Vercel can actually work:

```env
VITE_EVM_RPC=https://your-public-evm-rpc.example.com
VITE_COSMOS_RPC=https://your-public-cosmos-rpc.example.com
VITE_REST_API=https://your-public-rest-api.example.com
VITE_INDEXER_URL=https://your-public-indexer.example.com
BOOTSTRAP_COSMOS_RPC=https://your-public-cosmos-rpc.example.com
```

You also need the production secrets:

```env
ANTHROPIC_API_KEY=...
GAS_STATION_MNEMONIC=...
```

If you do not want the Vercel function to hold a mnemonic, switch bootstrap to a remote sponsor service instead:

```env
BOOTSTRAP_PROVIDER=remote
BOOTSTRAP_SPONSOR_API_URL=https://your-sponsor-backend.example.com/api/bootstrap
BOOTSTRAP_SPONSOR_API_TOKEN=...
```

Recommended Vercel project settings:

- Root Directory: `creato3-frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

## Interwoven Bridge note (local testing)

The Interwoven modal only lists **registered chain IDs**. Local appchains may
not show in the dropdown during local testing. This is expected behavior — the
Bridge button should still open the modal. Explain the full flow in your demo
video and README when submitting.

## .init username setup

1. Go to `app.testnet.initia.xyz/usernames`
2. Connect wallet (Keplr or Leap)
3. Register a name and **set it as primary**
4. The app will display `username.init` instead of a hex address

If you skip the primary-name step, `useInterwovenKit().username` can stay `null`
even though the registration succeeded.
