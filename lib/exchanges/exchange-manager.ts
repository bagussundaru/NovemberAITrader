import { PrismaClient, ExchangeType, ExchangeApiKey } from '@prisma/client';
import { encryptionService } from '@/lib/security/encryption-service';
import { DatabaseService } from '@/lib/trading-bot/database/database-service';

export interface ExchangeConfig {
  name: string;
  displayName: string;
  type: ExchangeType;
  requiresPassphrase: boolean;
  supportsTestnet: boolean;
  supportedFeatures: string[];
  baseUrl: string;
  testnetUrl?: string;
  documentation: string;
}

export interface ApiKeyData {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  isTestnet: boolean;
  displayName: string;
  maxLeverage?: number;
  riskPerTrade?: number;
}

export interface DecryptedApiKey {
  id: string;
  exchangeType: ExchangeType;
  exchangeName: string;
  displayName: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  isTestnet: boolean;
  isActive: boolean;
  maxLeverage: number;
  riskPerTrade: number;
  totalTrades: number;
  totalProfit: number;
  lastUsed?: Date;
  createdAt: Date;
}

export class ExchangeManager {
  private static instance: ExchangeManager | null = null;
  private db: DatabaseService;
  private prisma: PrismaClient;

  // Exchange configurations
  private exchangeConfigs: Map<ExchangeType, ExchangeConfig> = new Map([
    [ExchangeType.BINANCE_SPOT, {
      name: 'binance-spot',
      displayName: 'Binance Spot',
      type: ExchangeType.BINANCE_SPOT,
      requiresPassphrase: false,
      supportsTestnet: true,
      supportedFeatures: ['spot', 'margin'],
      baseUrl: 'https://api.binance.com',
      testnetUrl: 'https://testnet.binance.vision',
      documentation: 'https://binance-docs.github.io/apidocs/spot/en/'
    }]
  ]);