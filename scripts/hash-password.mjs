import { pbkdf2Sync, randomBytes } from 'node:crypto'

const password = process.argv[2]
if (!password) {
  console.error('Usage: npm run hash-password -- "NewPassword"')
  process.exit(1)
}

const iterations = 120_000
const salt = randomBytes(16).toString('hex')
const passwordHash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex')

console.log(JSON.stringify({ salt, passwordHash, iterations }, null, 2))
