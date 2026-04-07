import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const MISSING_ACCOUNT_PATTERNS = [
  /does not exist on chain/i,
  /account .* not found/i,
  /key not found/i
]

const TX_NOT_FOUND_PATTERNS = [
  /tx .* not found/i,
  /transaction .* not found/i,
  /not found/i
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const parseJson = (value) => {
  try {
    return JSON.parse((value || '').trim())
  } catch {
    return null
  }
}

const json = (res, status, payload) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const readJsonBody = async (req) => {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const isMissingAccountError = (error) => {
  const message = `${error?.message || ''}\n${error?.stdout || ''}\n${error?.stderr || ''}`
  return MISSING_ACCOUNT_PATTERNS.some((pattern) => pattern.test(message))
}

const isTxNotFoundError = (error) => {
  const message = `${error?.message || ''}\n${error?.stdout || ''}\n${error?.stderr || ''}`
  return TX_NOT_FOUND_PATTERNS.some((pattern) => pattern.test(message))
}

const extractTxResponse = (value) => value?.tx_response || value || null

const readTxCode = (value) => {
  const tx = extractTxResponse(value)
  const code = tx?.code

  if (typeof code === 'number') {
    return code
  }

  if (typeof code === 'string' && code.trim()) {
    const parsed = Number(code)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const formatTxFailure = (value, fallback) => {
  const tx = extractTxResponse(value)
  const code = readTxCode(tx)
  const rawLog = String(tx?.raw_log || tx?.rawLog || fallback || '').trim()

  if (!code) {
    return rawLog
  }

  if (rawLog) {
    return `Bootstrap transaction failed on creato3-1 (code ${code}): ${rawLog}`
  }

  return `Bootstrap transaction failed on creato3-1 with code ${code}.`
}

const parseCoinAmount = (value) => {
  try {
    return BigInt(String(value || '0'))
  } catch {
    return 0n
  }
}

const buildNodeArgs = (config) => {
  const args = []

  if (config.node) {
    args.push('--node', config.node)
  }

  if (config.home) {
    args.push('--home', config.home)
  }

  return args
}

const execMinitiad = async (config, args) => {
  try {
    return await execFileAsync(config.binary, args, {
      env: process.env,
      timeout: config.timeoutMs,
      maxBuffer: 1024 * 1024
    })
  } catch (error) {
    const message =
      (error.stderr || '').trim() || (error.stdout || '').trim() || error.message || 'minitiad command failed'
    const wrapped = new Error(message)
    wrapped.stdout = error.stdout || ''
    wrapped.stderr = error.stderr || ''
    wrapped.cause = error
    throw wrapped
  }
}

const accountExists = async (config, address) => {
  const args = ['query', 'auth', 'account', address, '--output', 'json', ...buildNodeArgs(config)]

  try {
    await execMinitiad(config, args)
    return true
  } catch (error) {
    if (isMissingAccountError(error)) {
      return false
    }

    throw error
  }
}

const queryBalances = async (config, address) => {
  const args = ['query', 'bank', 'balances', address, '--output', 'json', ...buildNodeArgs(config)]
  const { stdout, stderr } = await execMinitiad(config, args)
  const parsed = parseJson(stdout) || parseJson(stderr) || {}
  return Array.isArray(parsed?.balances) ? parsed.balances : []
}

const queryTx = async (config, txHash) => {
  const args = ['query', 'tx', txHash, '--output', 'json', ...buildNodeArgs(config)]

  try {
    const { stdout, stderr } = await execMinitiad(config, args)
    return parseJson(stdout) || parseJson(stderr) || null
  } catch (error) {
    if (isTxNotFoundError(error)) {
      return null
    }

    throw error
  }
}

const chooseBootstrapDenom = (balances) => {
  const positive = balances.filter((balance) => parseCoinAmount(balance?.amount) > 0n)

  if (!positive.length) {
    return ''
  }

  const plain = positive.find((balance) => /^[A-Za-z0-9]+$/.test(String(balance?.denom || '')))
  return String((plain || positive[0])?.denom || '').trim()
}

const resolveBootstrapAmount = async (config, gasStationAddress) => {
  const configured = String(config.amount || '').trim()

  if (configured && configured.toLowerCase() !== 'auto') {
    return configured
  }

  const balances = await queryBalances(config, gasStationAddress)
  const denom = chooseBootstrapDenom(balances)

  if (!denom) {
    throw new Error(
      `Gas station account ${gasStationAddress} has no positive bank balances on creato3-1, so automatic bootstrap could not choose a sponsor denom.`
    )
  }

  return `1${denom}`
}

const getGasStationAddress = async (config) => {
  const args = [
    'keys',
    'show',
    config.keyName,
    '-a',
    '--keyring-backend',
    config.keyringBackend
  ]

  if (config.home) {
    args.push('--home', config.home)
  }

  const { stdout } = await execMinitiad(config, args)
  return stdout.trim()
}

const sendBootstrapFunds = async (config, address, amount) => {
  const args = [
    'tx',
    'bank',
    'send',
    config.keyName,
    address,
    amount,
    '--chain-id',
    config.chainId,
    '--keyring-backend',
    config.keyringBackend,
    '--yes',
    '--output',
    'json',
    '--broadcast-mode',
    'sync',
    ...buildNodeArgs(config)
  ]

  const { stdout, stderr } = await execMinitiad(config, args)
  const parsed = parseJson(stdout) || parseJson(stderr) || {}
  const txResponse = extractTxResponse(parsed)

  if (readTxCode(txResponse) > 0) {
    throw new Error(formatTxFailure(txResponse, stdout || stderr))
  }

  return {
    txHash: parsed.txhash || txResponse?.txhash || '',
    raw: (stdout || stderr || '').trim(),
    response: txResponse,
    amount
  }
}

const waitForTxResult = async (config, txHash) => {
  if (!txHash) {
    return null
  }

  for (let attempt = 1; attempt <= config.txMaxAttempts; attempt += 1) {
    const result = await queryTx(config, txHash)

    if (result) {
      return {
        attempt,
        result
      }
    }

    await sleep(config.pollDelayMs)
  }

  return null
}

const waitForAccount = async (config, address) => {
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    if (await accountExists(config, address)) {
      return attempt
    }

    await sleep(config.pollDelayMs)
  }

  return 0
}

const ensureAccountReady = async (config, address) => {
  const existed = await accountExists(config, address)

  if (existed) {
    return {
      existed: true,
      funded: false,
      amount: '0'
    }
  }

  const gasStationAddress = await getGasStationAddress(config)
  const bootstrapAmount = await resolveBootstrapAmount(config, gasStationAddress)
  const funding = await sendBootstrapFunds(config, address, bootstrapAmount)
  const txResult = await waitForTxResult(config, funding.txHash)

  if (!txResult) {
    throw new Error(
      `Bootstrap transaction ${funding.txHash || ''} was accepted but did not finalize on creato3-1 in time. Check that your local chain is producing blocks and that the gas-station account has funds.`
    )
  }

  if (readTxCode(txResult.result) > 0) {
    throw new Error(formatTxFailure(txResult.result, funding.raw))
  }

  const polls = await waitForAccount(config, address)

  if (!polls) {
    throw new Error(
      `Bootstrap transaction ${funding.txHash || ''} finalized, but account ${address} still did not appear on creato3-1 in time. Wait a few seconds and retry.`
    )
  }

  return {
    existed: false,
    funded: true,
    amount: funding.amount,
    txHash: funding.txHash,
    gasStationAddress,
    polls,
    txPolls: txResult.attempt
  }
}

export function bootstrapAccountPlugin(config) {
  return {
    name: 'creato3-bootstrap-account-api',
    configureServer(server) {
      server.middlewares.use('/api/account/bootstrap', async (req, res) => {
        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method not allowed' })
          return
        }

        if (!config.enabled) {
          json(res, 503, { error: 'Automatic account bootstrap is disabled on this server.' })
          return
        }

        try {
          const body = await readJsonBody(req)
          const address = String(body?.address || '').trim()

          if (!address.startsWith('init1')) {
            json(res, 400, { error: 'A valid Initia address is required.' })
            return
          }

          const result = await ensureAccountReady(config, address)
          json(res, 200, { ok: true, address, ...result })
        } catch (error) {
          json(res, 500, {
            error: error?.message || 'Automatic account bootstrap failed.'
          })
        }
      })
    }
  }
}
