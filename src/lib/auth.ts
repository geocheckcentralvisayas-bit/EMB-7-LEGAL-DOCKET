export type UserRole = 'administrator' | 'legal_officer' | 'it_support' | 'viewer'

export interface AuthUser {
  username: string
  displayName: string
  role: UserRole
  roleLabel: string
  initials: string
}

interface Account extends AuthUser {
  salt: string
  passwordHash: string
  iterations: number
}

const SESSION_KEY = 'emb7-legal-dashboard-session-v1'
const PBKDF2_ITERATIONS = 120_000

/**
 * Passwords are stored as PBKDF2-SHA256 hashes, not plaintext.
 * This is still a client-side gate for a static file: it prevents casual access,
 * but it is not a substitute for server-side authentication or access control.
 *
 * Default accounts:
 *   admin         / Admin@2026!
 *   legal.officer / Legal@2026!
 *   it.support    / Support@2026!
 *   ORD.RD        / Viewer1@2026!
 *   EMED.PRE      / Viewer2@2026!
 *   Legal.Staff   / Viewer3@2026!
 */
const ACCOUNTS: Account[] = [
  {
    username: 'admin',
    displayName: 'Administrator',
    role: 'administrator',
    roleLabel: 'Administrator',
    initials: 'AD',
    salt: 'efd82524866873e3ee6f0c10cb04137d',
    passwordHash: '3c5088251d6f4a03dae3bc0828e79c4f4ba7b02af91924659c9d8d124ebdae83',
    iterations: PBKDF2_ITERATIONS,
  },
  {
    username: 'legal.officer',
    displayName: 'Legal Officer',
    role: 'legal_officer',
    roleLabel: 'Legal Officer',
    initials: 'LO',
    salt: 'bad8464eb5c847ae31a35ee380254f5d',
    passwordHash: 'b7057948579baf38d3f4a65fe37ee588a05152b23c4fa46294f6fcf6c3c8a16d',
    iterations: PBKDF2_ITERATIONS,
  },
  {
    username: 'it.support',
    displayName: 'IT Support',
    role: 'it_support',
    roleLabel: 'IT Support',
    initials: 'IT',
    salt: 'ee5ef38ba359b8a657846a8905161447',
    passwordHash: 'a3f14ebb8997d4f29023097941fa7ea8e20529a8823cb8dd31bcbc4e526d4572',
    iterations: PBKDF2_ITERATIONS,
  },
  {
    username: 'ORD.RD',
    displayName: 'ORD.RD',
    role: 'viewer',
    roleLabel: 'Viewer',
    initials: 'OR',
    salt: '08fbe046787e5dcf628e4d6c47a0b1ee',
    passwordHash: 'de533012522ec998294bc40dfb61829912f38ef8bde3c1a38444b5a194db05de',
    iterations: PBKDF2_ITERATIONS,
  },
  {
    username: 'EMED.PRE',
    displayName: 'EMED.PRE',
    role: 'viewer',
    roleLabel: 'Viewer',
    initials: 'EP',
    salt: 'bb0014930c3519b415175c16c41dc2e3',
    passwordHash: '622c515405fd960c2b3b4a9ae12e0dcc8054f56e176abbef54e6b90fb77dc4df',
    iterations: PBKDF2_ITERATIONS,
  },
  {
    username: 'Legal.Staff',
    displayName: 'Legal.Staff',
    role: 'viewer',
    roleLabel: 'Viewer',
    initials: 'LS',
    salt: '9ac6aa2915138a5a8f010fcc67bfb4ee',
    passwordHash: 'abf45e2452dc420043bf953ac9666e3833611c3820ae9d7a54d854cdf6d13e8c',
    iterations: PBKDF2_ITERATIONS,
  },
  {
    username: 'source.viewer',
    displayName: 'Source Viewer',
    role: 'viewer',
    roleLabel: 'Viewer',
    initials: 'SV',
    salt: 'cb9862f079edb15eeff14090c2050351',
    passwordHash: '3f956fe36b76d0936d10a88da8b6616b6d200ad2b3f9f21f5e5b4d27d81f2a68',
    iterations: PBKDF2_ITERATIONS,
  },
]

const encoder = new TextEncoder()

function toHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(value: string): ArrayBuffer {
  const bytes = new Uint8Array(value.length / 2)
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16)
  }
  return bytes.buffer
}

async function derivePasswordHash(password: string, salt: string, iterations: number): Promise<string> {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable in this browser.')
  }

  const key = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(salt),
      iterations,
      hash: 'SHA-256',
    },
    key,
    256,
  )
  return toHex(bits)
}

function toAuthUser(account: Account): AuthUser {
  return {
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    roleLabel: account.roleLabel,
    initials: account.initials,
  }
}

export async function authenticate(
  rawUsername: string,
  password: string,
): Promise<AuthUser | null> {
  const username = rawUsername.trim().toLowerCase()
  const account = ACCOUNTS.find((item) => item.username.toLowerCase() === username)
  const candidate = account ?? ACCOUNTS[0]

  // Always run the key derivation, even for an unknown username, so a failed
  // login does not reveal whether the username exists.
  const hash = await derivePasswordHash(password, candidate.salt, candidate.iterations)
  if (!account || hash !== account.passwordHash) return null

  const user = toAuthUser(account)
  saveSession(user)
  return user
}

export function saveSession(user: AuthUser): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } catch {
    // sessionStorage can be unavailable in locked-down browser contexts.
  }
}

export function loadSession(): AuthUser | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthUser>
    if (typeof parsed.username !== 'string') return null

    const lookup = parsed.username.toLowerCase()
    const account = ACCOUNTS.find((item) => item.username.toLowerCase() === lookup)
    return account ? toAuthUser(account) : null
  } catch {
    return null
  }
}

export async function verifyCredentials(
  rawUsername: string,
  password: string,
): Promise<AuthUser | null> {
  const username = rawUsername.trim().toLowerCase()
  const account = ACCOUNTS.find((item) => item.username.toLowerCase() === username)
  const candidate = account ?? ACCOUNTS[0]

  const hash = await derivePasswordHash(password, candidate.salt, candidate.iterations)
  if (!account || hash !== account.passwordHash) return null
  return toAuthUser(account)
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Nothing to clean up if sessionStorage is unavailable.
  }
}
