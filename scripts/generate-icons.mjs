import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MusicNotes } from '@phosphor-icons/react/MusicNotes'
import sharp from 'sharp'

const outputDirectory = resolve('public', 'icons')

function iconMarkup(size, maskable = false) {
  const discSize = Math.round(size * (maskable ? 0.58 : 0.72))
  const noteSize = Math.round(discSize * 0.5)
  const noteOffset = (size - noteSize) / 2
  return renderToStaticMarkup(
    createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', width: size, height: size, viewBox: `0 0 ${size} ${size}` },
      createElement('rect', { width: size, height: size, fill: '#eeeae0' }),
      createElement('circle', { cx: size / 2, cy: size / 2, r: discSize / 2, fill: '#282722' }),
      createElement(MusicNotes, { x: noteOffset, y: noteOffset, size: noteSize, color: '#eeeae0', weight: 'fill' }),
    ),
  )
}

await mkdir(outputDirectory, { recursive: true })
await Promise.all([
  sharp(Buffer.from(iconMarkup(192))).png().toFile(resolve(outputDirectory, 'muse-192.png')),
  sharp(Buffer.from(iconMarkup(512))).png().toFile(resolve(outputDirectory, 'muse-512.png')),
  sharp(Buffer.from(iconMarkup(512, true))).png().toFile(resolve(outputDirectory, 'muse-maskable-512.png')),
])
process.stdout.write('Generated Muse PWA icons.\n')
