import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

function readEnvironmentValue(source, key) {
  const prefix = `${key}=`
  const line = source
    .split(/\r?\n/u)
    .find((entry) => entry.trimStart().startsWith(prefix))

  return line?.trim().slice(prefix.length).replace(/^['"]|['"]$/gu, '') ?? ''
}

export async function importSpotifyConfig({ source, destination, redirectUri }) {
  const sourceText = await readFile(source, 'utf8')
  const clientId = readEnvironmentValue(sourceText, 'SPOTIFY_CLIENT_ID')

  if (!clientId) {
    throw new Error('SPOTIFY_CLIENT_ID was not found in the source environment')
  }

  const output = [
    `VITE_SPOTIFY_CLIENT_ID=${clientId}`,
    `VITE_SPOTIFY_REDIRECT_URI=${redirectUri}`,
    '',
  ].join('\n')

  await writeFile(destination, output, { encoding: 'utf8', mode: 0o600 })
}

const scriptPath = fileURLToPath(import.meta.url)
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const projectRoot = resolve(dirname(scriptPath), '..')
  await importSpotifyConfig({
    source: resolve(projectRoot, '..', 'SpotifyTuner', 'backend', '.env'),
    destination: resolve(projectRoot, '.env.local'),
    redirectUri: 'http://127.0.0.1:5173/auth/callback',
  })
  process.stdout.write(
    'Imported VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_REDIRECT_URI. No secret was copied.\n',
  )
}
