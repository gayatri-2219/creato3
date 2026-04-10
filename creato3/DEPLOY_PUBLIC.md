# Deploy Creato To A Public Initia EVM Chain

This project already contains compiled artifacts for the 3 on-chain Creato contracts:

- `CreatorProfile`
- `CreatorTreasury`
- `SubscriptionManager`

The public deployment order is:

1. Deploy `CreatorProfile`
2. Deploy `CreatorTreasury(owner)`
3. Deploy `SubscriptionManager(profile, treasury)`
4. Call `CreatorTreasury.setAuthorizedCaller(subscription)`

The helper script at [`scripts/deploy_creato_public.sh`](./scripts/deploy_creato_public.sh) performs those steps using the compiled artifacts under `creato3/out`, your EVM private key, and the public Initia RPC endpoints.

## Prerequisites

- `cast` installed
- `jq` installed
- `minitiad` installed if you want the script to query the fee denom from Cosmos RPC
- a funded deployer EVM private key
- a public Initia MiniEVM chain to target

To export the private key from your local keyring, your project guide suggests:

```bash
minitiad keys export gas-station --keyring-backend test
```

Save that value as `GAS_STATION_PK` or `PRIVATE_KEY` and do not commit it.

## Example: `minievm-2`

This is the simplest public-network starter:

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

Official references for these public endpoints:

- JSON-RPC example on MiniEVM docs:
  https://docs.initia.xyz/developers/developer-guides/vm-specific-tutorials/evm/creating-custom-erc20s
- REST example on MiniEVM docs:
  https://docs.initia.xyz/developers/developer-guides/vm-specific-tutorials/evm/creating-standard-erc20s
- Indexer example on API docs:
  https://docs.initia.xyz/api-reference/transactions/get-transaction-by-hash

If your treasury should be owned by a different wallet, also set an EVM address:

```bash
OWNER_ADDRESS=0x...
```

The script will print the 3 deployed contract addresses and a Vercel-ready env block.

On public Initia chains, make sure `PUBLIC_GAS_PRICE` is a non-zero value. The frontend now also expects the printed `VITE_GAS_PRICE` env in Vercel so `requestTxSync` does not broadcast a zero-fee transaction during profile creation, launch, or subscribe flows.

## Important Notes

- Vercel deploys only the frontend. These contracts must be live first.
- `BOOTSTRAP_PROVIDER=disabled` is the easiest production setting.
- `CreatorTreasury` must authorize the deployed `SubscriptionManager` before subscriptions can move funds into the treasury.
- If you switch to a different public chain, all RPC/REST/indexer URLs and all 3 contract addresses must belong to that same chain.
