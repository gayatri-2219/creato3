import {
  ensureAppChainAccount,
  isBootstrapUnavailableError,
  isRetryableBootstrapError
} from '../api/accountBootstrap'
import { fetchNativeFeeBalance } from '../api/feeBalance'
import { NATIVE_SYMBOL } from '../config/contracts'
import { formatChainError, probeChainHealth } from './chainHealth'

const notifyBootstrapped = (toast, result) => {
  if (!toast || !result?.funded) return

  toast.success(
    'Creato3 account ready',
    'We topped up the appchain fee balance automatically so your transaction can continue.'
  )
}

const readFeeBalance = async (initiaAddress) => {
  try {
    return await fetchNativeFeeBalance(initiaAddress)
  } catch {
    return null
  }
}

const buildFeeGuidanceMessage = (feeSymbol) =>
  `This wallet does not currently have enough ${feeSymbol} to pay Initia transaction fees, and the deployment's bootstrap sponsor is not ready. Configure the Vercel BOOTSTRAP_* env vars or bridge some ${feeSymbol} to this wallet, then try again.`

const buildActionError = async (error, actionLabel) => {
  let health = null

  try {
    health = await probeChainHealth()
  } catch {
    health = null
  }

  return new Error(formatChainError(error, health, actionLabel))
}

export async function executeWithAccountBootstrap({
  actionLabel = 'complete this action',
  initiaAddress,
  toast,
  execute
}) {
  let preflightError = null

  try {
    const preflight = await ensureAppChainAccount(initiaAddress)
    notifyBootstrapped(toast, preflight)
  } catch (error) {
    preflightError = error

    const feeBalance = await readFeeBalance(initiaAddress)
    if (feeBalance === 0n && isBootstrapUnavailableError(error)) {
      throw new Error(buildFeeGuidanceMessage(NATIVE_SYMBOL))
    }
  }

  try {
    return await execute()
  } catch (error) {
    if (!isRetryableBootstrapError(error)) {
      throw await buildActionError(error, actionLabel)
    }

    try {
      const retry = await ensureAppChainAccount(initiaAddress)
      notifyBootstrapped(toast, retry)
    } catch (bootstrapError) {
      const feeBalance = await readFeeBalance(initiaAddress)

      if (feeBalance === 0n) {
        throw new Error(buildFeeGuidanceMessage(NATIVE_SYMBOL))
      }

      throw new Error(
        bootstrapError?.message ||
          preflightError?.message ||
          'Automatic account bootstrap failed before sending the transaction.'
      )
    }

    try {
      return await execute()
    } catch (retryError) {
      throw await buildActionError(retryError, actionLabel)
    }
  }
}
