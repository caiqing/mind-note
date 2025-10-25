/**
 * 环境配置安全管理模块
 * 提供安全的环境变量管理和验证机制
 */

export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: Map<string, any> = new Map();
  private isInitialized: boolean = false;

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private constructor() {
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    if (this.isInitialized) return;

    try {
      // 必需的环境变量
      const requiredEnvVars = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'REDIS_PASSWORD',
        'OPENAI_API_KEY'
      ];

      // 可选的环境变量
      const optionalEnvVars = [
        'PORT',
        'NODE_ENV',
        'LOG_LEVEL',
        'API_BASE_URL',
        'JWT_SECRET'
      ];

      // 验证必需变量
      for (const envVar of requiredEnvVars) {
        const value = process.env[envVar];
        if (!value) {
          throw new Error(`Required environment variable ${envVar} is missing`);
        }
        this.config.set(envVar, value);
      }

      // 加载可选变量
      for (const envVar of optionalEnvVars) {
        const value = process.env[envVar];
        if (value) {
          this.config.set(envVar, value);
        }
      }

      // 设置默认值
      this.setDefaults();

      this.isInitialized = true;
      console.log('✅ Environment configuration loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load environment configuration:', error);
      throw error;
    }
  }

  private setDefaults(): void {
    const defaults = {
      PORT: '3000',
      NODE_ENV: 'development',
      LOG_LEVEL: 'info'
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (!this.config.has(key)) {
        this.config.set(key, value);
      }
    });
  }

  get(key: string): any {
    return this.config.get(key);
  }

  // 敏感配置访问控制
  getSecret(key: string): string {
    const value = this.config.get(key);
    if (!value) {
      throw new Error(`Secret ${key} is not configured`);
    }
    return value;
  }

  // 验证配置完整性
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查关键配置
    const criticalConfigs = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'OPENAI_API_KEY'
    ];

    for (const config of criticalConfigs) {
      if (!this.config.has(config) || !this.config.get(config)) {
        errors.push(`Critical configuration ${config} is missing or empty`);
      }
    }

    // 验证数据库URL格式
    const dbUrl = this.get('DATABASE_URL');
    if (dbUrl && !this.isValidDatabaseURL(dbUrl)) {
      errors.push('DATABASE_URL format is invalid');
    }

    // 验证JWT密钥强度
    const jwtSecret = this.get('NEXTAUTH_SECRET');
    if (jwtSecret && jwtSecret.length < 32) {
      errors.push('NEXTAUTH_SECRET should be at least 32 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidDatabaseURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['postgresql:', 'mysql:', 'mongodb:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  // 获取环境信息（用于调试，不包含敏感信息）
  getEnvironmentInfo(): Record<string, any> {
    return {
      nodeEnv: this.get('NODE_ENV'),
      port: this.get('PORT'),
      logLevel: this.get('LOG_LEVEL'),
      isProduction: this.get('NODE_ENV') === 'production',
      isDevelopment: this.get('NODE_ENV') === 'development',
      configCount: this.config.size,
      isInitialized: this.isInitialized
    };
  }

  // 安全地重新加载配置
  reloadConfiguration(): void {
    this.config.clear();
    this.isInitialized = false;
    this.loadConfiguration();
  }
}