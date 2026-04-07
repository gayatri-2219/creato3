import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { bootstrapAccountPlugin } from './dev/bootstrapAccountPlugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      bootstrapAccountPlugin({
        enabled: env.BOOTSTRAP_ENABLED !== 'false',
        binary: env.MINITIAD_BIN || 'minitiad',
        node: env.BOOTSTRAP_COSMOS_RPC || env.VITE_COSMOS_RPC || 'http://localhost:26657',
        chainId: env.BOOTSTRAP_CHAIN_ID || env.VITE_CHAIN_ID || 'creato3-1',
        keyName: env.GAS_STATION_KEY_NAME || 'gas-station',
        keyringBackend: env.GAS_STATION_KEYRING_BACKEND || 'test',
        amount: env.BOOTSTRAP_AMOUNT || 'auto',
        home: env.MINITIAD_HOME || '',
        timeoutMs: Number(env.BOOTSTRAP_COMMAND_TIMEOUT_MS || 30000),
        maxAttempts: Number(env.BOOTSTRAP_POLL_ATTEMPTS || 45),
        txMaxAttempts: Number(env.BOOTSTRAP_TX_POLL_ATTEMPTS || env.BOOTSTRAP_POLL_ATTEMPTS || 45),
        pollDelayMs: Number(env.BOOTSTRAP_POLL_DELAY_MS || 1000)
      })
    ],
    server: {
      proxy: {
        '/api/claude': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/claude/, '/v1/messages')
        },
        '/api/lm': {
          target: 'http://localhost:1234',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/lm/, '/v1')
        }
      }
    }
  }
})
