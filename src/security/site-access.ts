const ACCESS_GRANT_KEY = 'dedicated-to-fx:access-grant:v1'
const PASSWORD_HASH_PATTERN = /^[a-f0-9]{64}$/

export const PASSWORD_DERIVATION_ITERATIONS = 310_000

export interface SiteAccessConfig {
  passwordHash: string
  salt: string
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function getSiteAccessConfig(): SiteAccessConfig | undefined {
  const passwordHash = import.meta.env.VITE_SITE_PASSWORD_HASH?.trim().toLowerCase()
  const salt = import.meta.env.VITE_SITE_PASSWORD_SALT?.trim()

  if (!passwordHash || !PASSWORD_HASH_PATTERN.test(passwordHash) || !salt) {
    return undefined
  }

  return { passwordHash, salt }
}

export async function derivePasswordHash(password: string, salt: string) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(salt),
      iterations: PASSWORD_DERIVATION_ITERATIONS,
    },
    keyMaterial,
    256,
  )

  return bytesToHex(new Uint8Array(derivedBits))
}

export async function verifySitePassword(password: string, config: SiteAccessConfig) {
  const candidateHash = await derivePasswordHash(password, config.salt)
  return candidateHash === config.passwordHash
}

export function hasStoredAccessGrant(config: SiteAccessConfig) {
  try {
    return localStorage.getItem(ACCESS_GRANT_KEY) === config.passwordHash
  } catch {
    return false
  }
}

export function storeAccessGrant(config: SiteAccessConfig) {
  try {
    localStorage.setItem(ACCESS_GRANT_KEY, config.passwordHash)
  } catch {
    // Browsers that block local storage can still keep access for this open tab.
  }
}
