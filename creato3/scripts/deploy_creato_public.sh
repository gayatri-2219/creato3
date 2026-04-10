#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/out"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PRIVATE_KEY="${PRIVATE_KEY:-${GAS_STATION_PK:-}}"
CHAIN_ID="${CHAIN_ID:-}"
EVM_RPC="${EVM_RPC:-${PUBLIC_EVM_RPC:-}}"
COSMOS_RPC="${COSMOS_RPC:-}"
PUBLIC_EVM_RPC="${PUBLIC_EVM_RPC:-}"
PUBLIC_REST_API="${PUBLIC_REST_API:-}"
PUBLIC_INDEXER_URL="${PUBLIC_INDEXER_URL:-}"
PUBLIC_GAS_PRICE="${PUBLIC_GAS_PRICE:-${TX_GAS_PRICE:-${EVM_GAS_PRICE:-}}}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

usage() {
  cat <<'EOF'
Deploy the 3 Creato contracts using the compiled artifacts already present in ./out.

Required env vars:
  CHAIN_ID=<public chain id>
  EVM_RPC=<public EVM JSON-RPC endpoint>
  PRIVATE_KEY=<0x... deployer private key>

Optional env vars:
  COSMOS_RPC=<public Cosmos RPC endpoint>
  OWNER_ADDRESS=<0x... treasury owner address, defaults to deployer private key address>
  PUBLIC_GAS_PRICE=<non-zero public gas price, used for deploy txs and printed for Vercel>
  PUBLIC_EVM_RPC=<public EVM JSON-RPC endpoint>
  PUBLIC_REST_API=<public REST/LCD endpoint>
  PUBLIC_INDEXER_URL=<public indexer endpoint>

Example:
  CHAIN_ID=minievm-2 \
  EVM_RPC=https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz \
  PUBLIC_GAS_PRICE=REPLACE_WITH_PUBLIC_MIN_GAS_PRICE \
  PRIVATE_KEY=0x... \
  PUBLIC_REST_API=https://rest-evm-1.anvil.asia-southeast.initia.xyz \
  PUBLIC_INDEXER_URL=https://rollytics-api-evm-1.anvil.asia-southeast.initia.xyz \
  ./scripts/deploy_creato_public.sh
EOF
}

for cmd in jq cast minitiad mktemp; do
  require_cmd "$cmd"
done

if [[ -z "$CHAIN_ID" || -z "$EVM_RPC" || -z "$PRIVATE_KEY" ]]; then
  usage
  exit 1
fi

PROFILE_ARTIFACT="$OUT_DIR/CreatorProfile.sol/CreatorProfile.json"
TREASURY_ARTIFACT="$OUT_DIR/CreatorTreasury.sol/CreatorTreasury.json"
SUBSCRIPTION_ARTIFACT="$OUT_DIR/SubscriptionManager.sol/SubscriptionManager.json"

for artifact in "$PROFILE_ARTIFACT" "$TREASURY_ARTIFACT" "$SUBSCRIPTION_ARTIFACT"; do
  if [[ ! -f "$artifact" ]]; then
    echo "Missing artifact: $artifact" >&2
    echo "Run forge build in creato3 once the full contract project is available." >&2
    exit 1
  fi
done

extract_bytecode() {
  local artifact="$1"
  jq -r '.bytecode.object' "$artifact" | tr -d '\n' | sed 's/^0x//'
}

build_bin() {
  local artifact="$1"
  local output="$2"
  shift 2

  extract_bytecode "$artifact" > "$output"

  if [[ "$#" -gt 0 ]]; then
    local constructor_sig="$1"
    shift
    cast abi-encode "$constructor_sig" "$@" | tr -d '\n' | sed 's/^0x//' >> "$output"
  fi
}

CAST_GAS_PRICE_ARGS=()
if [[ -n "$PUBLIC_GAS_PRICE" ]]; then
  CAST_GAS_PRICE_ARGS+=(--gas-price "$PUBLIC_GAS_PRICE")
fi

submit_create() {
  local name="$1"
  local bin_file="$2"
  local bytecode
  local txhash

  bytecode="$(tr -d '\n' < "$bin_file")"

  echo "Deploying $name..." >&2
  txhash="$(cast send \
    --rpc-url "$EVM_RPC" \
    --private-key "$PRIVATE_KEY" \
    --legacy \
    "${CAST_GAS_PRICE_ARGS[@]}" \
    --async \
    --create "0x$bytecode" | tail -n 1 | tr -d '[:space:]')"

  if [[ -z "$txhash" ]]; then
    echo "Could not extract txhash for $name deployment" >&2
    exit 1
  fi

  cast receipt "$txhash" contractAddress --rpc-url "$EVM_RPC" | tr -d '[:space:]'
}

submit_call() {
  local name="$1"
  local target="$2"
  shift 2

  echo "Calling $name on $target..." >&2
  cast send \
    --rpc-url "$EVM_RPC" \
    --private-key "$PRIVATE_KEY" \
    --legacy \
    "${CAST_GAS_PRICE_ARGS[@]}" \
    --async \
    "$target" "$@" | tail -n 1 | tr -d '[:space:]'
}

DEPLOYER_ADDRESS="$(cast wallet address --private-key "$PRIVATE_KEY" | tr -d '[:space:]')"
OWNER_ADDRESS="${OWNER_ADDRESS:-$DEPLOYER_ADDRESS}"

PROFILE_BIN="$TMP_DIR/CreatorProfile.bin"
TREASURY_BIN="$TMP_DIR/CreatorTreasury.bin"
SUBSCRIPTION_BIN="$TMP_DIR/SubscriptionManager.bin"

build_bin "$PROFILE_ARTIFACT" "$PROFILE_BIN"
build_bin "$TREASURY_ARTIFACT" "$TREASURY_BIN" "constructor(address)" "$OWNER_ADDRESS"

PROFILE_ADDR="$(submit_create "CreatorProfile" "$PROFILE_BIN")"
TREASURY_ADDR="$(submit_create "CreatorTreasury" "$TREASURY_BIN")"

build_bin "$SUBSCRIPTION_ARTIFACT" "$SUBSCRIPTION_BIN" "constructor(address,address)" "$PROFILE_ADDR" "$TREASURY_ADDR"
SUBSCRIPTION_ADDR="$(submit_create "SubscriptionManager" "$SUBSCRIPTION_BIN")"

AUTH_TXHASH="$(submit_call "setAuthorizedCaller" "$TREASURY_ADDR" "setAuthorizedCaller(address)" "$SUBSCRIPTION_ADDR")"

NATIVE_DENOM="GAS"
if [[ -n "$COSMOS_RPC" ]]; then
  NEXT_DENOM="$(minitiad q evm params --node "$COSMOS_RPC" --output json 2>/dev/null | jq -r '.params.fee_denom // empty' || true)"
  if [[ -n "$NEXT_DENOM" && "$NEXT_DENOM" != "null" ]]; then
    NATIVE_DENOM="$NEXT_DENOM"
  fi
fi

echo
echo "Deployments complete."
echo "CreatorProfile:      $PROFILE_ADDR"
echo "CreatorTreasury:     $TREASURY_ADDR"
echo "SubscriptionManager: $SUBSCRIPTION_ADDR"
echo "setAuthorizedCaller tx: $AUTH_TXHASH"
echo
echo "Paste these into Vercel:"
echo "VITE_CHAIN_ID=$CHAIN_ID"
echo "VITE_EVM_RPC=${PUBLIC_EVM_RPC:-$EVM_RPC}"
echo "VITE_COSMOS_RPC=${COSMOS_RPC:-<set-public-cosmos-rpc>}"
echo "VITE_REST_API=${PUBLIC_REST_API:-<set-public-rest-api>}"
echo "VITE_INDEXER_URL=${PUBLIC_INDEXER_URL:-<set-public-indexer>}"
echo "VITE_PROFILE_CONTRACT=$PROFILE_ADDR"
echo "VITE_SUBSCRIPTION_CONTRACT=$SUBSCRIPTION_ADDR"
echo "VITE_TREASURY_CONTRACT=$TREASURY_ADDR"
echo "VITE_NATIVE_DENOM=$NATIVE_DENOM"
echo "VITE_NATIVE_SYMBOL=$NATIVE_DENOM"
echo "VITE_NATIVE_NAME=$NATIVE_DENOM"
echo "VITE_GAS_PRICE=${PUBLIC_GAS_PRICE:-<set-public-gas-price>}"
echo "BOOTSTRAP_PROVIDER=disabled"
