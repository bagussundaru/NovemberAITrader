// Configuration Management for Trading Bot

import { TradingBotConfig, NebiusConfig, GateConfig, RiskConfig } from '../types';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: TradingBotConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfiguration(): TradingBotConfig {
    // Validate required environment variables
    this.validateEnvironmentVariables();

    const nebiusConfig: NebiusConfig = {
      apiUrl: process.env.NEBIUS_API_URL || 'https://api.nebius.ai',
      jwtToken: process.env.NEBIUS_JWT_TOKEN!,
      model: process.env.NEBIUS_MODEL || 'default',
      maxRetries: parseInt(process.env.NEBIUS_MAX_RETRIES || '3'),
      timeout: parseInt(process.env.NEBIUS_TIMEOUT || '30000')
    };

    const gateConfig: GateConfig = {
      baseUrl: process.env.GATE_API_URL || 'https://fx-api-testnet.gateio.ws',
      apiKey: process.env.GATE_API_KEY!,
      apiSecret: process.env.GATE_API_SECRET!,
      testnet: process.env.GATE_TESTNET === 'true'
    };

    const riskConfig: RiskConfig = {
      maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '100'),
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '1000'),
      stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '5'),
      maxOpenPositions: parseInt(process.env.MAX_OPEN_POSITIONS || '5'),
      emergencyStopEnabled: process.env.EMERGENCY_STOP_ENABLED !== 'false'
    };

    const tradingPairs = process.env.TRADING_PAIRS?.split(',') || ['BTC/USDT', 'ETH/USDT'];
    const marketDataUpdateInterval = parseInt(process.env.MARKET_DATA_UPDATE_INTERVAL || '1000');

    return {
      nebius: nebiusConfig,
      gate: gateConfig,
      risk: riskConfig,
      tradingPairs,
      marketDataUpdateInterval
    };
  }

  private validateEnvironmentVariables(): void {
    const required = [
      'NEBIUS_JWT_TOKEN',
      'GATE_API_KEY',
      'GATE_API_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  public getConfig(): TradingBotConfig {
    return { ...this.config };
  }

  public getNebiusConfig(): NebiusConfig {
    return { ...this.config.nebius };
  }

  public getGateConfig(): GateConfig {
    return { ...this.config.gate };
  }

  public getRiskConfig(): RiskConfig {
    return { ...this.config.risk };
  }

  public getTradingPairs(): string[] {
    return [...this.config.tradingPairs];
  }

  public updateRiskConfig(updates: Partial<RiskConfig>): void {
    this.config.risk = { ...this.config.risk, ...updates };
  }

  public updateTradingPairs(pairs: string[]): void {
    this.config.tradingPairs = [...pairs];
  }

  // Configuration validation methods
  public validateConfig(): boolean {
    try {
      this.validateNebiusConfig();
      this.validateGateConfig();
      this.validateRiskConfig();
      return true;
    } catch (error) {
      console.error('Configuration validation failed:', error);
      return false;
    }
  }

  private validateNebiusConfig(): void {
    const { nebius } = this.config;
    
    if (!nebius.jwtToken) {
      throw new Error('Nebius JWT token is required');
    }
    
    if (!nebius.apiUrl) {
      throw new Error('Nebius API URL is required');
    }

    if (nebius.maxRetries < 0 || nebius.maxRetries > 10) {
      throw new Error('Nebius max retries must be between 0 and 10');
    }

    if (nebius.timeout < 1000 || nebius.timeout > 60000) {
      throw new Error('Nebius timeout must be between 1000ms and 60000ms');
    }
  }

  private validateGateConfig(): void {
    const { gate } = this.config;
    
    if (!gate.apiKey || !gate.apiSecret) {
      throw new Error('Gate.io API key and secret are required');
    }
    
    if (!gate.baseUrl) {
      throw new Error('Gate.io API URL is required');
    }
  }

  private validateRiskConfig(): void {
    const { risk } = this.config;
    
    if (risk.maxDailyLoss <= 0) {
      throw new Error('Max daily loss must be positive');
    }
    
    if (risk.maxPositionSize <= 0) {
      throw new Error('Max position size must be positive');
    }
    
    if (risk.stopLossPercentage <= 0 || risk.stopLossPercentage > 50) {
      throw new Error('Stop loss percentage must be between 0 and 50');
    }
    
    if (risk.maxOpenPositions <= 0 || risk.maxOpenPositions > 20) {
      throw new Error('Max open positions must be between 1 and 20');
    }
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();