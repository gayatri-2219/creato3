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

Use [`.env.example`](./.env.example) as the local reference for the bundled local Initia stack.

## Vercel envs for the current Creato3 chain

Use [`.env.vercel.example`](./.env.vercel.example) as the copy-paste checklist when filling Vercel Project Settings -> Environment Variables.

Use these exact chain-specific values in Vercel for the deployment this repo is currently wired to:

```env
VITE_PROFILE_CONTRACT=0x109544311B0A7a6E75a22d07E1137FeF9eC4c4F9
VITE_SUBSCRIPTION_CONTRACT=0x9776152A4d9A7f0e04db5F6e4ED0f0001dEddF87
VITE_TREASURY_CONTRACT=0x398442C384949b7b8E2F3F5332B5b76672b841De
VITE_CHAIN_ID=evm-1
VITE_EVM_RPC=https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz
VITE_COSMOS_RPC=https://rpc-evm-1.anvil.asia-southeast.initia.xyz
VITE_REST_API=https://rest-evm-1.anvil.asia-southeast.initia.xyz
VITE_INDEXER_URL=https://rollytics-api-evm-1.anvil.asia-southeast.initia.xyz
VITE_NATIVE_DENOM=evm/2eE7007DF876084d4C74685e90bB7f4cd7c86e22
VITE_NATIVE_SYMBOL=GAS
VITE_NATIVE_NAME=Gas Token
VITE_GAS_PRICE=150000
VITE_AI_MODE=local
VITE_BOOTSTRAP_API_URL=/api/account/bootstrap
VITE_BACKEND_URL=https://your-backend.example.com

BOOTSTRAP_ENABLED=true
BOOTSTRAP_PROVIDER=evm_private_key
BOOTSTRAP_CHAIN_ID=evm-1
BOOTSTRAP_COSMOS_RPC=https://your-public-cosmos-rpc.example.com
BOOTSTRAP_EVM_RPC=https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz
BOOTSTRAP_FEE_DENOM=evm/2eE7007DF876084d4C74685e90bB7f4cd7c86e22
BOOTSTRAP_FEE_TOKEN_ADDRESS=0x2eE7007DF876084d4C74685e90bB7f4cd7c86e22
BOOTSTRAP_EVM_AMOUNT_WEI=1000000000000000
BOOTSTRAP_EVM_PRIVATE_KEY=0xYOUR_FUNDED_EVM_PRIVATE_KEY
AGENT_BOOTSTRAP_EVM_AMOUNT_WEI=1000000000000000
```

Recommended Vercel project settings:

- Root Directory: `creato3-frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

If you see Vercel's `404: NOT_FOUND` page after deployment, the first thing to verify is the
project root. This repo is a monorepo and the deployable frontend lives in
`my-initia-project/creato3-frontend`, so Vercel must use `creato3-frontend` as the Root Directory.
If the Root Directory is left at `my-initia-project`, Vercel will not read this frontend's
`vercel.json`, `package.json`, or `dist` output, and direct visits to routes like `/discover` or
`/creator/:id` will fail even if every file is committed to Git.

Important:

- Do not use `localhost` or `127.0.0.1` for any `VITE_*RPC*`, `VITE_REST_API`, or `VITE_INDEXER_URL` value in Vercel.
- Do not mix chains. Your RPC, REST, indexer, fee denom, fee token address, and contract addresses must all belong to the same deployed chain.
- Do not leave the public chain gas price at `0`. Set `VITE_GAS_PRICE` to the target chain's non-zero minimum gas price or `requestTxSync` will broadcast a zero-fee transaction and fail with `insufficient fees`.
- Vercel reads variables from its dashboard at build and runtime. Editing only your local `.env` file will not update the deployed site.
- `BOOTSTRAP_PROVIDER=evm_private_key` sponsors the real rollup fee token so first-time users can complete registration without manually bridging gas first.
- The `/agents` page can now call Vercel serverless routes directly for AI agent drafts and on-chain agent registration. If `BOOTSTRAP_EVM_PRIVATE_KEY` is configured, the serverless agent route can also auto-fund a generated testnet agent wallet before sending the registration transaction.
- `VITE_BACKEND_URL` is optional. Without it, Vercel serverless routes handle agent drafts and on-chain agent registration; with it, the separate Express API can provide MongoDB-backed content, MCP, and richer backend workflows.
- If you prefer not to keep a private key in Vercel, switch bootstrap to a remote sponsor service instead:

```env
BOOTSTRAP_PROVIDER=remote
BOOTSTRAP_SPONSOR_API_URL=https://your-sponsor-backend.example.com/api/bootstrap
BOOTSTRAP_SPONSOR_API_TOKEN=...
```

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
