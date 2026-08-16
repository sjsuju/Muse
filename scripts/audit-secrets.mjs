import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

function environmentValue(source, key) {
  const line = source.split(/\r?\n/u).find((entry) => entry.startsWith(`${key}=`))
  return line?.slice(key.length + 1).replace(/^['"]|['"]$/gu, '') ?? ''
}

async function filesBelow(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) files.push(...await filesBelow(path))
    else if ((await stat(path)).size < 10_000_000) files.push(path)
  }
  return files
}

export async function auditSecretValue({ secretSource, roots, localEnvironment }) {
  const source = await readFile(secretSource, 'utf8')
  const secret = environmentValue(source, 'SPOTIFY_CLIENT_SECRET')
  if (!secret) throw new Error('The source Spotify client secret is unavailable for audit')

  const local = await readFile(localEnvironment, 'utf8')
  if (/^[A-Za-z_][A-Za-z0-9_]*SECRET[A-Za-z0-9_]*=/mu.test(local)) {
    throw new Error('.env.local contains a forbidden secret variable')
  }

  const leaks = []
  for (const root of roots) {
    for (const file of await filesBelow(root)) {
      const content = await readFile(file)
      if (content.includes(Buffer.from(secret))) leaks.push(relative(root, file))
    }
  }
  if (leaks.length) throw new Error(`Secret value found in: ${leaks.join(', ')}`)
}

const scriptPath = fileURLToPath(import.meta.url)
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const projectRoot = resolve(dirname(scriptPath), '..')
  await auditSecretValue({
    secretSource: resolve(projectRoot, '..', 'SpotifyTuner', 'backend', '.env'),
    roots: [projectRoot],
    localEnvironment: resolve(projectRoot, '.env.local'),
  })
  process.stdout.write('Secret audit passed. No credential value was printed.\n')
}
