const HEX_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export const isInitiaAddress = (value) => {
  const next = (value || '').trim()
  return next.startsWith('init1')
}

const isContractAddress = (value) => {
  const next = (value || '').trim()
  return HEX_ADDRESS_PATTERN.test(next) || isInitiaAddress(next)
}

export const buildMsgCall = ({ sender, contractAddr, input, value = '0' }) => {
  const nextSender = (sender || '').trim()
  const nextContract = (contractAddr || '').trim()

  if (!nextSender) {
    throw new Error(
      'Initia sender address is missing. Reconnect your wallet or paste your init1 address.'
    )
  }

  if (!isInitiaAddress(nextSender)) {
    throw new Error('Initia sender address must start with init1.')
  }

  if (!nextContract) {
    throw new Error('Contract address is missing. Update your .env and restart the dev server.')
  }

  if (!isContractAddress(nextContract)) {
    throw new Error('Contract address is invalid. Update your .env and restart the dev server.')
  }

  return {
    typeUrl: '/minievm.evm.v1.MsgCall',
    value: {
      sender: nextSender,
      contractAddr: nextContract,
      input,
      value: String(value),
      accessList: [],
      authList: []
    }
  }
}
