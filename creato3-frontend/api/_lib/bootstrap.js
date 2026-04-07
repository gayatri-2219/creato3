import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { GasPrice, SigningStargateClient, StargateClient } from '@cosmjs/stargate'
import { getOptionalEnv } from './http.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const parseCoinAmount = (value) => {
  try {
    return BigInt(String(value || '0'))
  } catch {
    return 0n
  }
}

const isValidInitiaAddress = (value) => String(value || '').trim().startsWith('init1')

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
    addressPrefix: getOptionalEnv('BOOTSTRAP_ADDRESS_PREFIX', 'init'),
    amount: getOptionalEnv('BOOTSTRAP_AMOUNT', 'auto'),
    feeDenom: getOptionalEnv('BOOTSTRAP_FEE_DENOM'),
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

  return bootstrapWithMnemonic(config, nextAddress)
}

