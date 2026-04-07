import { createPublicClient, http } from 'viem'
import { EVM_RPC } from './contracts'

export const publicClient = createPublicClient({
  transport: http(EVM_RPC)
})
