import { ensureAppChainAccount, isMissingAccountSequenceError } from '../api/accountBootstrap'

const notifyBootstrapped = (toast, result) => {
  if (!toast || !result?.funded) return

  toast.success(
    'Creato3 account ready',
    'We activated your appchain account automatically on creato3-1.'
  )
}

export async function executeWithAccountBootstrap({ initiaAddress, toast, execute }) {
  let preflightError = null

  try {
    const preflight = await ensureAppChainAccount(initiaAddress)
    notifyBootstrapped(toast, preflight)
  } catch (error) {
    preflightError = error
  }

  try {
    return await execute()
  } catch (error) {
    if (!isMissingAccountSequenceError(error)) {
      throw error
    }

    try {
      const retry = await ensureAppChainAccount(initiaAddress)
      notifyBootstrapped(toast, retry)
    } catch (bootstrapError) {
      throw new Error(
        bootstrapError?.message ||
          preflightError?.message ||
          'Automatic account bootstrap failed before sending the transaction.'
      )
    }

    return execute()
  }
}
