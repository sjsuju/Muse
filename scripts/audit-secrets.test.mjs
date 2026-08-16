import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { auditSecretValue } from './audit-secrets.mjs'

describe('auditSecretValue', () => {
  it('finds a copied secret without printing the value', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'muse-audit-'))
    const source = join(directory, 'source.env')
    const root = join(directory, 'project')
    const localEnvironment = join(root, '.env.local')
    await mkdir(root)
    await writeFile(source, 'SPOTIFY_CLIENT_SECRET=private-value-123\n')
    await writeFile(localEnvironment, 'VITE_SPOTIFY_CLIENT_ID=public\n')
    await writeFile(join(root, 'leak.txt'), 'private-value-123')

    const error = await auditSecretValue({ secretSource: source, roots: [root], localEnvironment })
      .then(() => null, (reason) => reason as Error)
    expect(error?.message).toContain('leak.txt')
    expect(error?.message).not.toContain('private-value-123')
  })
})
