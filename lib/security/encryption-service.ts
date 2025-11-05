import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export class EncryptionService {
  private static instance: EncryptionService | null = null;
  private masterKey: string;

  private constructor() {
    // Use environment variable or generate a secure key
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY || this.generateMasterKey();
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  private generateMasterKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  private deriveKey(salt: string): Buffer {
    return crypto.pbkdf2Sync(this.masterKey, salt, 100000, KEY_LENGTH, 'sha256');
  }

  /**
   * Encrypt sensitive data (API keys, secrets)
   */
  encrypt(plaintext: string): {
    encrypted: string;
    salt: string;
    iv: string;
    tag: string;
  } {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(16).toString('hex');
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Derive key from master key and salt
      const key = this.deriveKey(salt);
      
      // Create cipher
      const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
      cipher.setAAD(Buffer.from(salt, 'hex'));
      
      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const tag = cipher.getAuthTag().toString('hex');
      
      return {
        encrypted,
        salt,
        iv: iv.toString('hex'),
        tag
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: {
    encrypted: string;
    salt: string;
    iv: string;
    tag: string;
  }): string {
    try {
      const { encrypted, salt, iv, tag } = encryptedData;
      
      // Derive key from master key and salt
      const key = this.deriveKey(salt);
      
      // Create decipher
      const decipher = crypto.createDecipherGCM(ALGORITHM, key, Buffer.from(iv, 'hex'));
      decipher.setAAD(Buffer.from(salt, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt API key for database storage
   */
  encryptApiKey(apiKey: string): string {
    const encrypted = this.encrypt(apiKey);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt API key from database
   */
  decryptApiKey(encryptedApiKey: string): string {
    try {
      const encryptedData = JSON.parse(encryptedApiKey);
      return this.decrypt(encryptedData);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      throw new Error('Invalid encrypted API key format');
    }
  }

  /**
   * Generate a secure encryption key for individual records
   */
  generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Validate if encrypted data is valid
   */
  isValidEncryptedData(encryptedData: string): boolean {
    try {
      const parsed = JSON.parse(encryptedData);
      return (
        typeof parsed.encrypted === 'string' &&
        typeof parsed.salt === 'string' &&
        typeof parsed.iv === 'string' &&
        typeof parsed.tag === 'string'
      );
    } catch {
      return false;
    }
  }

  /**
   * Securely wipe sensitive data from memory
   */
  secureWipe(data: string): void {
    // In Node.js, we can't directly wipe memory, but we can overwrite the variable
    // This is more of a symbolic security measure
    if (typeof data === 'string') {
      data = '0'.repeat(data.length);
    }
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();