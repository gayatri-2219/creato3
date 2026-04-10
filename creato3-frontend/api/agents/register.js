import { createRequire } from 'node:module'
import { Contract, JsonRpcProvider, Wallet, getAddress, isAddress } from 'ethers'
import { getOptionalEnv, json, readJsonBody } from '../_lib/http.js'

const require = createRequire(import.meta.url)
const CreatorProfileABI = require('../../src/abis/CreatorProfile.json')

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
]

const DEFAULT_AGENT_BOOTSTRAP_AMOUNT_WEI = '1000000000000000'

const parseBigIntAmount = (value, fallback = 0n) => {
  try {
    return BigInt(String(value || '').trim())
  } catch {
    return fallback
  }
}

const feeDenomToEvmTokenAddress = (denom) => {
  const match = /^evm\/(0x)?([0-9a-fA-F]{40})$/.exec(String(denom || '').trim())
  return match ? getAddress(`0x${match[2]}`) : ''
}

const sanitizeUsername = (displayName) => {
  const slug =
    String(displayName || 'agent')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24) || 'agent'
  return `${slug}.init`
}

const readAgentConfig = () => {
  const evmRpc = getOptionalEnv('EVM_RPC', getOptionalEnv('VITE_EVM_RPC'))
  const profileAddress = getOptionalEnv(
    'PROFILE_ADDRESS',
    getOptionalEnv('VITE_PROFILE_CONTRACT')
  )

  if (!evmRpc) {
    throw new Error('EVM_RPC or VITE_EVM_RPC must be configured for agent registration.')
  }

  if (!profileAddress || !isAddress(profileAddress)) {
    throw new Error('PROFILE_ADDRESS or VITE_PROFILE_CONTRACT must be a valid contract address.')
  }

  return { evmRpc, profileAddress: getAddress(profileAddress) }
}

async function fundAgentIfConfigured(agentAddress) {
  const sponsorKey = getOptionalEnv('AGENT_SPONSOR_EVM_PRIVATE_KEY', getOptionalEnv('BOOTSTRAP_EVM_PRIVATE_KEY'))

  if (!sponsorKey) {
    return {
      configured: false,
      funded: false,
      reason: 'No AGENT_SPONSOR_EVM_PRIVATE_KEY or BOOTSTRAP_EVM_PRIVATE_KEY configured.'
    }
  }

  const evmRpc = getOptionalEnv(
    'AGENT_BOOTSTRAP_EVM_RPC',
    getOptionalEnv('BOOTSTRAP_EVM_RPC', getOptionalEnv('EVM_RPC', getOptionalEnv('VITE_EVM_RPC')))
  )
  const feeTokenAddress =
    getOptionalEnv('AGENT_FEE_TOKEN_ADDRESS') ||
    getOptionalEnv('BOOTSTRAP_FEE_TOKEN_ADDRESS') ||
    feeDenomToEvmTokenAddress(
      getOptionalEnv('BOOTSTRAP_FEE_DENOM', getOptionalEnv('VITE_NATIVE_DENOM'))
    )

  if (!evmRpc || !feeTokenAddress) {
    return {
      configured: false,
      funded: false,
      reason: 'Agent funding needs an EVM RPC and fee token address.'
    }
  }

  const targetAmount = parseBigIntAmount(
    getOptionalEnv(
      'AGENT_BOOTSTRAP_EVM_AMOUNT_WEI',
      getOptionalEnv('BOOTSTRAP_EVM_AMOUNT_WEI', DEFAULT_AGENT_BOOTSTRAP_AMOUNT_WEI)
    ),
    parseBigIntAmount(DEFAULT_AGENT_BOOTSTRAP_AMOUNT_WEI)
  )
  const provider = new JsonRpcProvider(evmRpc)
  const sponsor = new Wallet(sponsorKey, provider)
  const token = new Contract(feeTokenAddress, ERC20_ABI, sponsor)
  const sponsorAddress = await sponsor.getAddress()
  const currentBalance = parseBigIntAmount(await token.balanceOf(agentAddress))

  if (currentBalance >= targetAmount) {
    return {
      configured: true,
      funded: false,
      reason: 'Agent wallet already has enough fee token.',
      sponsorAddress,
      agentAddress,
      feeTokenAddress,
      balance: currentBalance.toString(),
      targetAmount: targetAmount.toString()
    }
  }

  const transferAmount = targetAmount - currentBalance
  const sponsorBalance = parseBigIntAmount(await token.balanceOf(sponsorAddress))

  if (sponsorBalance < transferAmount) {
    throw new Error(
      `Sponsor wallet ${sponsorAddress} needs ${transferAmount.toString()} fee-token wei but only has ${sponsorBalance.toString()}.`
    )
  }

  const tx = await token.transfer(agentAddress, transferAmount)
  const receipt = await tx.wait()

  return {
    configured: true,
    funded: true,
    txHash: receipt?.hash || tx.hash,
    sponsorAddress,
    agentAddress,
    feeTokenAddress,
    amount: transferAmount.toString(),
    targetAmount: targetAmount.toString()
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const privateKey = String(body.privateKey || '').trim()
    const displayName = String(body.displayName || '').trim()
    const bio = String(body.bio || '').trim()
    const category = String(body.category || '').trim()
    const initUsername = String(body.initUsername || '').trim() || sanitizeUsername(displayName)

    if (!privateKey || !displayName || !bio || !category) {
      json(res, 400, {
        error: 'privateKey, displayName, bio, and category are required.'
      })
      return
    }

    const { evmRpc, profileAddress } = readAgentConfig()
    const provider = new JsonRpcProvider(evmRpc)
    const wallet = new Wallet(privateKey, provider)
    const address = await wallet.getAddress()
    const funding =
      body.autoFund === false
        ? { configured: false, funded: false, reason: 'autoFund disabled by request.' }
        : await fundAgentIfConfigured(address)

    const profile = new Contract(profileAddress, CreatorProfileABI, wallet)
    const tx = await profile.registerCreator(displayName, bio, category, initUsername)
    const receipt = await tx.wait()

    json(res, 200, {
      address,
      initUsername,
      txHash: receipt?.hash || tx.hash,
      funding
    })
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Agent registration failed.'
    })
  }
}
