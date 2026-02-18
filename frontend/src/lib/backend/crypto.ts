import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Get encryption key from environment
 * Must be 32 bytes (64 hex chars)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.SPELLBLOCK_ENCRYPTION_KEY
  if (!key) {
    throw new Error('SPELLBLOCK_ENCRYPTION_KEY not set')
  }
  if (key.length !== 64) {
    throw new Error('SPELLBLOCK_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt text using AES-256-GCM
 * Returns: iv:authTag:ciphertext (all hex)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt text encrypted with encrypt()
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()
  const parts = encryptedData.split(':')
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }
  
  const [ivHex, authTagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Generate a new encryption key (for initial setup)
 * Run once and store in env
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex')
}
