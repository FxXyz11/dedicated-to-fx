import { beforeEach, describe, expect, it } from 'vitest'
import {
  derivePasswordHash,
  hasStoredAccessGrant,
  storeAccessGrant,
  verifySitePassword,
  type SiteAccessConfig,
} from './site-access'

describe('site access', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('derives a stable salted hash and verifies the exact password', async () => {
    const passwordHash = await derivePasswordHash('ink and paper', 'test-salt')
    const config: SiteAccessConfig = { passwordHash, salt: 'test-salt' }

    expect(passwordHash).toMatch(/^[a-f0-9]{64}$/)
    await expect(verifySitePassword('ink and paper', config)).resolves.toBe(true)
    await expect(verifySitePassword('Ink and paper', config)).resolves.toBe(false)
  })

  it('remembers access only for the current password configuration', () => {
    const currentConfig: SiteAccessConfig = { passwordHash: 'a'.repeat(64), salt: 'current-salt' }
    const changedConfig: SiteAccessConfig = { passwordHash: 'b'.repeat(64), salt: 'new-salt' }

    expect(hasStoredAccessGrant(currentConfig)).toBe(false)
    storeAccessGrant(currentConfig)
    expect(hasStoredAccessGrant(currentConfig)).toBe(true)
    expect(hasStoredAccessGrant(changedConfig)).toBe(false)
  })
})
