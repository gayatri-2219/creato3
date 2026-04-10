import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const target = path.resolve(__dirname, '../node_modules/@cosmjs/proto-signing/build/pubkey.js')

const INITIA_TYPE_URL = '/initia.crypto.v1beta1.ethsecp256k1.PubKey'
const INITIA_PATCH_MARKER = `case "${INITIA_TYPE_URL}":`

async function main() {
  let source

  try {
    source = await readFile(target, 'utf8')
  } catch (error) {
    console.warn(`[patch-cosmjs-pubkey] Skipping: could not read ${target}`)
    if (error instanceof Error) {
      console.warn(`[patch-cosmjs-pubkey] ${error.message}`)
    }
    return
  }

  if (source.includes(INITIA_PATCH_MARKER)) {
    console.log('[patch-cosmjs-pubkey] Initia pubkey support already present.')
    return
  }

  const next = source
    .replace(
      /case "\/cosmos\.crypto\.secp256k1\.PubKey": \{/,
      `case "/cosmos.crypto.secp256k1.PubKey":\n        case "${INITIA_TYPE_URL}": {`
    )
    .replace(
      /case "\/cosmos\.crypto\.secp256k1\.PubKey":\n(\s*)case "\/cosmos\.crypto\.ed25519\.PubKey": \{/,
      `case "/cosmos.crypto.secp256k1.PubKey":\n$1case "${INITIA_TYPE_URL}":\n$1case "/cosmos.crypto.ed25519.PubKey": {`
    )

  if (next === source) {
    throw new Error('Could not apply the expected @cosmjs/proto-signing pubkey patch.')
  }

  await writeFile(target, next, 'utf8')
  console.log('[patch-cosmjs-pubkey] Patched @cosmjs/proto-signing for Initia ethsecp256k1.')
}

main().catch((error) => {
  console.error('[patch-cosmjs-pubkey] Failed.')
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exitCode = 1
})
