import { describe, expect, it } from 'vitest'
import { FAILURE_CODES, getFailureDefinition, safeFailureState } from './failures'

describe('failure catalog', () => {
  it('provides an issue and recovery action for every failure route', () => {
    for (const code of FAILURE_CODES) {
      const definition = getFailureDefinition(code)
      expect(definition.title).toBeTruthy()
      expect(definition.issue).toBeTruthy()
      expect(definition.actionLabel).toBeTruthy()
    }
  })

  it('falls back to not found for an unknown code', () => {
    expect(getFailureDefinition('raw-error-from-url').code).toBe('not-found')
  })

  it('rejects unsafe return locations', () => {
    expect(safeFailureState({ returnTo: 'https://attacker.example' }).returnTo).toBe('/')
    expect(safeFailureState({ returnTo: '/search' }).returnTo).toBe('/search')
  })

  it('keeps bounded diagnostic text for a failure page', () => {
    const state = safeFailureState({ returnTo: '/', diagnostic: 'x'.repeat(300) })

    expect(state.diagnostic).toHaveLength(160)
  })
})
