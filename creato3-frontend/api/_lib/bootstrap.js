import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { fromBech32 } from '@cosmjs/encoding'
import { GasPrice, SigningStargateClient, StargateClient } from '@cosmjs/stargate'
import { Contract, JsonRpcProvider, Wallet, getAddress } from 'ethers'
import { getOptionalEnv } from './http.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const DEFAULT_EVM_BOOTSTRAP_AMOUNT_WEI = '1000000000000000'
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
]

const parseCoinAmount = (value) => {
  try {
    return BigInt(String(value || '0'))
  } catch {
    return 0n
  }
}

const isValidInitiaAddress = (value) => String(value || '').trim().startsWith('init1')

const parseBigIntAmount = (value, fallback = 0n) => {
  try {
    return BigInt(String(value || '').trim())
  } catch {
    return fallback
  }
}

const feeDenomToEvmTokenAddress = (denom) => {
  const match = /^evm\/(0x)?([0-9a-fA-F]{40})$/.exec(String(denom || '').trim())

  if (!match) {
    return ''
  }

  return getAddress(`0x${match[2]}`)
}

const initiaToEvmAddress = (address) => {
  const { data } = fromBech32(address)

  if (data.length !== 20) {
    throw new Error(`Initia address ${address} does not map to a 20-byte EVM address.`)
  }

  return getAddress(`0x${Buffer.from(data).toString('hex')}`)
}

const chooseBootstrapDenom = (balances) => {
  const positive = balances.filter((balance) => parseCoinAmount(balance?.amount) > 0n)

  if (!positive.length) {
    return ''
  }

  const plain = positive.find((balance) => /^[A-Za-z0-9]+$/.test(String(balance?.denom || '')))
  return String((plain || positive[0])?.denom || '').trim()
}

const parseCoinString = (value) => {
  const match = /^(\d+)([A-Za-z0-9/._-]+)$/.exec(String(value || '').trim())

  if (!match) {
    throw new Error(
      `Invalid BOOTSTRAP_AMOUNT value "${value}". Expected a coin string like "1GAS" or use "auto".`
    )
  }

  return {
    amount: match[1],
    denom: match[2]
  }
}

const getBootstrapConfig = () => {
  const provider = getOptionalEnv(
    'BOOTSTRAP_PROVIDER',
    process.env.BOOTSTRAP_SPONSOR_API_URL
      ? 'remote'
      : process.env.GAS_STATION_MNEMONIC
        ? 'mnemonic'
        : process.env.BOOTSTRAP_EVM_PRIVATE_KEY
          ? 'evm_private_key'
        : 'disabled'
  )

  return {
    enabled: getOptionalEnv('BOOTSTRAP_ENABLED', 'true') !== 'false',
    provider,
    sponsorUrl: getOptionalEnv('BOOTSTRAP_SPONSOR_API_URL'),
    sponsorToken: getOptionalEnv('BOOTSTRAP_SPONSOR_API_TOKEN'),
    mnemonic: getOptionalEnv('GAS_STATION_MNEMONIC'),
    chainId: getOptionalEnv('BOOTSTRAP_CHAIN_ID', getOptionalEnv('VITE_CHAIN_ID', 'creato3-1')),
    rpc: getOptionalEnv('BOOTSTRAP_COSMOS_RPC', getOptionalEnv('VITE_COSMOS_RPC')),
    evmRpc: getOptionalEnv('BOOTSTRAP_EVM_RPC', getOptionalEnv('VITE_EVM_RPC')),
    evmPrivateKey: getOptionalEnv('BOOTSTRAP_EVM_PRIVATE_KEY'),
    addressPrefix: getOptionalEnv('BOOTSTRAP_ADDRESS_PREFIX', 'init'),
    amount: getOptionalEnv('BOOTSTRAP_AMOUNT', 'auto'),
    feeDenom: getOptionalEnv('BOOTSTRAP_FEE_DENOM'),
    feeTokenAddress: getOptionalEnv('BOOTSTRAP_FEE_TOKEN_ADDRESS'),
    evmBootstrapAmount: getOptionalEnv(
      'BOOTSTRAP_EVM_AMOUNT_WEI',
      DEFAULT_EVM_BOOTSTRAP_AMOUNT_WEI
    ),
    maxAttempts: Number(getOptionalEnv('BOOTSTRAP_POLL_ATTEMPTS', '20')),
    pollDelayMs: Number(getOptionalEnv('BOOTSTRAP_POLL_DELAY_MS', '1000'))
  }
}

const ensureBootstrapConfig = (config) => {
  if (!config.enabled || config.provider === 'disabled') {
    throw new Error(
      'Automatic account bootstrap is disabled in this deployment. Configure a sponsor backend or gas-station mnemonic first.'
    )
  }

  if (config.provider === 'remote' && !config.sponsorUrl) {
    throw new Error('BOOTSTRAP_SPONSOR_API_URL is required when BOOTSTRAP_PROVIDER=remote.')
  }

  if (config.provider === 'mnemonic') {
    if (!config.rpc) {
      throw new Error('BOOTSTRAP_COSMOS_RPC is required when BOOTSTRAP_PROVIDER=mnemonic.')
    }

    if (!config.mnemonic) {
      throw new Error('GAS_STATION_MNEMONIC is required when BOOTSTRAP_PROVIDER=mnemonic.')
    }
  }

  if (config.provider === 'evm_private_key') {
    if (!config.evmRpc) {
      throw new Error('BOOTSTRAP_EVM_RPC is required when BOOTSTRAP_PROVIDER=evm_private_key.')
    }

    if (!config.evmPrivateKey) {
      throw new Error(
        'BOOTSTRAP_EVM_PRIVATE_KEY is required when BOOTSTRAP_PROVIDER=evm_private_key.'
      )
    }

    if (!config.feeTokenAddress && !feeDenomToEvmTokenAddress(config.feeDenom)) {
      throw new Error(
        'BOOTSTRAP_FEE_TOKEN_ADDRESS or an evm/<token-address> BOOTSTRAP_FEE_DENOM is required when BOOTSTRAP_PROVIDER=evm_private_key.'
      )
    }
  }
}

const waitForAccount = async (client, address, maxAttempts, pollDelayMs) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const account = await client.getAccount(address)

    if (account) {
      return attempt
    }

    await sleep(pollDelayMs)
  }

  return 0
}

const resolveBootstrapCoin = async (config, balances) => {
  const configured = String(config.amount || '').trim()

  if (configured && configured.toLowerCase() !== 'auto') {
    return parseCoinString(configured)
  }

  const denom = chooseBootstrapDenom(balances)

  if (!denom) {
    throw new Error('Gas station has no positive bank balance on the target appchain.')
  }

  return {
    amount: '1',
    denom
  }
}

const proxyRemoteBootstrap = async (config, address) => {
  const headers = { 'Content-Type': 'application/json' }

  if (config.sponsorToken) {
    headers.Authorization = `Bearer ${config.sponsorToken}`
  }

  const response = await fetch(config.sponsorUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ address })
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'Remote bootstrap backend failed.')
  }

  return payload
}

const waitForEvmBalance = async (token, address, targetAmount, maxAttempts, pollDelayMs) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const balance = parseBigIntAmount(await token.balanceOf(address))

    if (balance >= targetAmount) {
      return attempt
    }

    await sleep(pollDelayMs)
  }

  return 0
}

const bootstrapWithMnemonic = async (config, address) => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(config.mnemonic, {
    prefix: config.addressPrefix
  })
  const [gasStation] = await wallet.getAccounts()

  const readClient = await StargateClient.connect(config.rpc)

  try {
    const existing = await readClient.getAccount(address)

    if (existing) {
      return {
        ok: true,
        address,
        existed: true,
        funded: false,
        amount: '0',
        gasStationAddress: gasStation.address
      }
    }

    const balances = await readClient.getAllBalances(gasStation.address)
    const bootstrapCoin = await resolveBootstrapCoin(config, balances)
    const feeDenom = config.feeDenom || bootstrapCoin.denom

    const signingClient = await SigningStargateClient.connectWithSigner(config.rpc, wallet, {
      gasPrice: GasPrice.fromString(`0${feeDenom}`)
    })

    try {
      const result = await signingClient.sendTokens(
        gasStation.address,
        address,
        [bootstrapCoin],
        'auto',
        'Creato3 account bootstrap'
      )

      if (result.code > 0) {
        throw new Error(
          `Bootstrap transaction failed on ${config.chainId} (code ${result.code}): ${result.rawLog || 'unknown error'}`
        )
      }

      const polls = await waitForAccount(readClient, address, config.maxAttempts, config.pollDelayMs)

      if (!polls) {
        throw new Error(
          `Bootstrap transaction ${result.transactionHash} finalized, but account ${address} still did not appear on ${config.chainId} in time.`
        )
      }

      return {
        ok: true,
        address,
        existed: false,
        funded: true,
        amount: `${bootstrapCoin.amount}${bootstrapCoin.denom}`,
        txHash: result.transactionHash,
        gasStationAddress: gasStation.address,
        polls
      }
    } finally {
      signingClient.disconnect()
    }
  } finally {
    readClient.disconnect()
  }
}

const bootstrapWithEvmPrivateKey = async (config, address) => {
  const feeTokenAddress = config.feeTokenAddress || feeDenomToEvmTokenAddress(config.feeDenom)
  const sponsorTargetAmount = parseBigIntAmount(
    config.evmBootstrapAmount,
    parseBigIntAmount(DEFAULT_EVM_BOOTSTRAP_AMOUNT_WEI)
  )
  const recipientAddress = initiaToEvmAddress(address)
  const provider = new JsonRpcProvider(config.evmRpc)
  const sponsor = new Wallet(config.evmPrivateKey, provider)
  const token = new Contract(feeTokenAddress, ERC20_ABI, sponsor)
  const sponsorAddress = await sponsor.getAddress()
  const sponsorBalance = parseBigIntAmount(await token.balanceOf(sponsorAddress))
  const recipientBalance = parseBigIntAmount(await token.balanceOf(recipientAddress))
  let accountExisted = false
  let readClient = null

  if (config.rpc) {
    readClient = await StargateClient.connect(config.rpc)
    accountExisted = Boolean(await readClient.getAccount(address))
  }

  try {
    if (recipientBalance >= sponsorTargetAmount) {
      return {
        ok: true,
        address,
        existed: accountExisted,
        funded: false,
        amount: '0',
        gasStationAddress: sponsorAddress,
        recipientEvmAddress: recipientAddress,
        feeTokenAddress
      }
    }

    const transferAmount = sponsorTargetAmount - recipientBalance

    if (transferAmount <= 0n) {
      return {
        ok: true,
        address,
        existed: accountExisted,
        funded: false,
        amount: '0',
        gasStationAddress: sponsorAddress,
        recipientEvmAddress: recipientAddress,
        feeTokenAddress
      }
    }

    if (sponsorBalance < transferAmount) {
      throw new Error(
        `Sponsor wallet ${sponsorAddress} only has ${sponsorBalance} wei of ${feeTokenAddress}, but bootstrap needs ${transferAmount}.`
      )
    }

    const tx = await token.transfer(recipientAddress, transferAmount)
    const receipt = await tx.wait()
    const polls = await waitForEvmBalance(
      token,
      recipientAddress,
      sponsorTargetAmount,
      config.maxAttempts,
      config.pollDelayMs
    )

    if (!polls) {
      throw new Error(
        `Bootstrap transaction ${tx.hash} finalized, but ${recipientAddress} did not reach the expected ${feeTokenAddress} balance in time.`
      )
    }

    return {
      ok: true,
      address,
      existed: accountExisted,
      funded: true,
      amount: `${transferAmount}${config.feeDenom || feeTokenAddress}`,
      txHash: receipt?.hash || tx.hash,
      gasStationAddress: sponsorAddress,
      recipientEvmAddress: recipientAddress,
      feeTokenAddress,
      polls
    }
  } finally {
    readClient?.disconnect()
  }
}

export const ensureAccountReady = async (address) => {
  const nextAddress = String(address || '').trim()

  if (!isValidInitiaAddress(nextAddress)) {
    throw new Error('A valid Initia address is required.')
  }

  const config = getBootstrapConfig()
  ensureBootstrapConfig(config)

  if (config.provider === 'remote') {
    return proxyRemoteBootstrap(config, nextAddress)
  }

  if (config.provider === 'evm_private_key') {
    return bootstrapWithEvmPrivateKey(config, nextAddress)
  }

  return bootstrapWithMnemonic(config, nextAddress)
}
