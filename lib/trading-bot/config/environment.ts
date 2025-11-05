// Environment Configuration Management
// Create environment configuration for production deployment
// Requirements: 7.3, 7.4, 7.5

import { z } from 'zod';

// Environment validation schema
const EnvironmentSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server Configuration
  PORT: z.string().transform(Number).default(3000),
  HOST: z.string().default('localhost'),
  
  // Database Configuration
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  DATABASE_POOL_SIZE: z.string().transform(Number).default(10),
  DATABASE_TIMEOUT: z.string().transform(Number).default(30000),
  
  // Nebius AI Configuration
  NEBIUS_API_URL: z.string().url('Invalid Nebius API URL').default('https://api.nebius.ai'),
  NEBIUS_JWT_TOKEN: z.string().min(1, 'Nebius JWT token is required'),
  NEBIUS_MODEL: z.string().default('trading-v1'),
  NEBIUS_TIMEOUT: z.string().transform(Number).default(30000),
  NEBIUS_MAX_RETRIES: z.string().transform(Number).default(3),
  
  // Gate.io Configuration
  GATE_API_KEY: z.string().min(1, 'Gate.io API key is required'),
  GATE_API_SECRET: z.string().min(1, 'Gate.io API secret is required'),
  GATE_TESTNET: z.string().transform(val => val === 'true').default(true),
  GATE_BASE_URL: z.string().url().default('https://fx-api-testnet.gateio.ws'),
  GATE_TIMEOUT: z.string().transform(Number).default(30000),
  GATE_MAX_RETRIES: z.string().transform(Number).default(3),
  
  // Trading Configuration
  TRADING_PAIRS: z.string().default('BTC/USDT,ETH/USDT').transform(val => val.split(',')),
  MAX_DAILY_LOSS: z.string().transform(Number).default(1000),
  MAX_POSITION_SIZE: z.string().transform(Number).default(500),
  STOP_LOSS_PERCENTAGE: z.string().transform(Number).default(0.05),
  MAX_OPEN_POSITIONS: z.string().transform(Number).default(5),
  EMERGENCY_STOP_ENABLED: z.string().transform(val => val === 'true').default(true),
  
  // Market Data Configuration
  MARKET_DATA_UPDATE_INTERVAL: z.string().transform(Number).default(5000),
  MARKET_DATA_HISTORY_LENGTH: z.string().transform(Number).default(100),
  ENABLE_REAL_TIME_UPDATES: z.string().transform(val => val === 'true').default(true),
  
  // Technical Indicators Configuration
  RSI_PERIOD: z.string().transform(Number).default(14),
  MACD_FAST_PERIOD: z.string().transform(Number).default(12),
  MACD_SLOW_PERIOD: z.string().transform(Number).default(26),
  MACD_SIGNAL_PERIOD: z.string().transform(Number).default(9),
  MOVING_AVERAGE_PERIOD: z.string().transform(Number).default(20),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  LOG_FILE_PATH: z.string().optional(),
  ENABLE_CONSOLE_LOGGING: z.string().transform(val => val === 'true').default(true),
  
  // Monitoring Configuration
  ENABLE_METRICS: z.string().transform(val => val === 'true').default(true),
  METRICS_PORT: z.string().transform(Number).default(9090),
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default(30000),
  
  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters').optional(),
  API_RATE_LIMIT: z.string().transform(Number).default(100),
  API_RATE_LIMIT_WINDOW: z.string().transform(Number).default(60000),
  
  // Redis Configuration (optional)
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default(0),
  
  // Deployment Configuration
  DEPLOYMENT_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  CONTAINER_NAME: z.string().default('trading-bot'),
  RESTART_POLICY: z.enum(['no', 'always', 'on-failure', 'unless-stopped']).default('unless-stopped'),
  
  // Backup Configuration
  BACKUP_ENABLED: z.string().transform(val => val === 'true').default(false),
  BACKUP_INTERVAL: z.string().transform(Number).default(86400000), // 24 hours
  BACKUP_RETENTION_DAYS: z.string().transform(Number).default(7),
  BACKUP_STORAGE_PATH: z.string().default('./backups'),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;
  private isValidated: boolean = false;

  private constructor() {
    this.config = {} as EnvironmentConfig;
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * Load and validate environment configuration
   */
  public loadConfig(): EnvironmentConfig {
    if (this.isValidated) {
      return this.config;
    }

    try {
      // Parse and validate environment variables
      this.config = EnvironmentSchema.parse(process.env);
      this.isValidated = true;
      
      console.log('Environment configuration loaded successfully');
      console.log(`Environment: ${this.config.NODE_ENV}`);
      console.log(`Deployment: ${this.config.DEPLOYMENT_ENV}`);
      console.log(`Trading pairs: ${this.config.TRADING_PAIRS.join(', ')}`);
      
      return this.config;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Environment configuration validation failed:');
        error.issues.forEach(err => {
          console.error(`- ${err.path.join('.')}: ${err.message}`);
        });
      } else {
        console.error('Failed to load environment configuration:', error);
      }
      throw new Error('Invalid environment configuration');
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): EnvironmentConfig {
    if (!this.isValidated) {
      return this.loadConfig();
    }
    return this.config;
  }

  /**
   * Get configuration for specific service
   */
  public getNebiusConfig() {
    const config = this.getConfig();
    return {
      apiUrl: config.NEBIUS_API_URL,
      jwtToken: config.NEBIUS_JWT_TOKEN,
      model: config.NEBIUS_MODEL,
      timeout: config.NEBIUS_TIMEOUT,
      maxRetries: config.NEBIUS_MAX_RETRIES
    };
  }

  public getGateConfig() {
    const config = this.getConfig();
    return {
      baseUrl: config.GATE_BASE_URL,
      apiKey: config.GATE_API_KEY,
      apiSecret: config.GATE_API_SECRET,
      testnet: config.GATE_TESTNET,
      timeout: config.GATE_TIMEOUT,
      maxRetries: config.GATE_MAX_RETRIES
    };
  }

  public getRiskConfig() {
    const config = this.getConfig();
    return {
      maxDailyLoss: config.MAX_DAILY_LOSS,
      maxPositionSize: config.MAX_POSITION_SIZE,
      stopLossPercentage: config.STOP_LOSS_PERCENTAGE,
      maxOpenPositions: config.MAX_OPEN_POSITIONS,
      emergencyStopEnabled: config.EMERGENCY_STOP_ENABLED
    };
  }

  public getMarketDataConfig() {
    const config = this.getConfig();
    return {
      updateInterval: config.MARKET_DATA_UPDATE_INTERVAL,
      maxHistoryLength: config.MARKET_DATA_HISTORY_LENGTH,
      enableRealTimeUpdates: config.ENABLE_REAL_TIME_UPDATES,
      tradingPairs: config.TRADING_PAIRS,
      technicalIndicatorsPeriods: {
        rsi: config.RSI_PERIOD,
        macd: {
          fast: config.MACD_FAST_PERIOD,
          slow: config.MACD_SLOW_PERIOD,
          signal: config.MACD_SIGNAL_PERIOD
        },
        movingAverage: config.MOVING_AVERAGE_PERIOD
      }
    };
  }

  public getLoggingConfig() {
    const config = this.getConfig();
    return {
      level: config.LOG_LEVEL,
      format: config.LOG_FORMAT,
      filePath: config.LOG_FILE_PATH,
      enableConsole: config.ENABLE_CONSOLE_LOGGING
    };
  }

  public getMonitoringConfig() {
    const config = this.getConfig();
    return {
      enableMetrics: config.ENABLE_METRICS,
      metricsPort: config.METRICS_PORT,
      healthCheckInterval: config.HEALTH_CHECK_INTERVAL
    };
  }

  /**
   * Validate required configuration for production
   */
  public validateProductionConfig(): void {
    const config = this.getConfig();
    
    if (config.NODE_ENV === 'production') {
      const requiredFields = [
        'DATABASE_URL',
        'NEBIUS_JWT_TOKEN',
        'GATE_API_KEY',
        'GATE_API_SECRET'
      ];
      
      const missingFields = requiredFields.filter(field => !process.env[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required production configuration: ${missingFields.join(', ')}`);
      }
      
      // Additional production validations
      if (config.GATE_TESTNET && config.DEPLOYMENT_ENV === 'production') {
        console.warn('WARNING: Using testnet in production deployment');
      }
      
      if (!config.JWT_SECRET && config.DEPLOYMENT_ENV === 'production') {
        console.warn('WARNING: No JWT secret configured for production');
      }
    }
  }

  /**
   * Get configuration summary for logging
   */
  public getConfigSummary(): Record<string, any> {
    const config = this.getConfig();
    
    return {
      environment: config.NODE_ENV,
      deployment: config.DEPLOYMENT_ENV,
      database: {
        connected: !!config.DATABASE_URL,
        poolSize: config.DATABASE_POOL_SIZE
      },
      services: {
        nebius: {
          configured: !!config.NEBIUS_JWT_TOKEN,
          model: config.NEBIUS_MODEL
        },
        gate: {
          configured: !!config.GATE_API_KEY,
          testnet: config.GATE_TESTNET
        }
      },
      trading: {
        pairs: config.TRADING_PAIRS,
        maxPositions: config.MAX_OPEN_POSITIONS,
        maxDailyLoss: config.MAX_DAILY_LOSS
      },
      monitoring: {
        enabled: config.ENABLE_METRICS,
        logLevel: config.LOG_LEVEL
      }
    };
  }
}

// Export singleton instance
export const environmentManager = EnvironmentManager.getInstance();

// Export configuration getter functions
export const getConfig = () => environmentManager.getConfig();
export const getNebiusConfig = () => environmentManager.getNebiusConfig();
export const getGateConfig = () => environmentManager.getGateConfig();
export const getRiskConfig = () => environmentManager.getRiskConfig();
export const getMarketDataConfig = () => environmentManager.getMarketDataConfig();
export const getLoggingConfig = () => environmentManager.getLoggingConfig();
export const getMonitoringConfig = () => environmentManager.getMonitoringConfig();

// Validate configuration on import in production
if (process.env.NODE_ENV === 'production') {
  try {
    environmentManager.validateProductionConfig();
  } catch (error) {
    console.error('Production configuration validation failed:', error);
    process.exit(1);
  }
}