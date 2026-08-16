import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importSpotifyConfig } from './import-spotify-config.mjs'

describe('importSpotifyConfig', () => {
  it('copies only the public client id', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'muse-config-'))
    const source = join(directory, 'source.env')
    const destination = join(directory, 'destination.env')
    await writeFile(
      source,
      'SPOTIFY_CLIENT_ID=public-id\nSPOTIFY_CLIENT_SECRET=private-secret\nREDIRECT_URI=http://old.example/callback\n',
    )

    await importSpotifyConfig({
      source,
      destination,
      redirectUri: 'http://127.0.0.1:5173/auth/callback',
    })

    const result = await readFile(destination, 'utf8')
    expect(result).toContain('VITE_SPOTIFY_CLIENT_ID=public-id')
    expect(result).toContain(
      'VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/auth/callback',
    )
    expect(result).not.toContain('SECRET')
    expect(result).not.toContain('private-secret')
  })
})
