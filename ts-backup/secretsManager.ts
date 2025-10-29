// HootBot/src/utils/secretsManager.ts

/**
 * Secure secrets management
 * In production, this would integrate with AWS Secrets Manager,
 * HashiCorp Vault, or similar secure storage
 */
export class SecretsManager {
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  
  /**
   * Retrieve secret from secure storage
   */
  async getSecret(key: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    // In production: fetch from secure vault
    // For now, return from environment variables as fallback
    const value = process.env[key];
    if (!value) {
      throw new Error(`Secret not found: ${key}`);
    }
    
    // Cache for 5 minutes
    this.cache.set(key, {
      value,
      expiry: Date.now() + 5 * 60 * 1000
    });
    
    return value;
  }
  
  /**
   * Clear cached secrets
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * Validate all required secrets exist
   */
  async validateSecrets(required: string[]): Promise<void> {
    const missing: string[] = [];
    
    for (const key of required) {
      try {
        await this.getSecret(key);
      } catch {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required secrets: ${missing.join(', ')}`);
    }
  }
}

export const secretsManager = new SecretsManager();