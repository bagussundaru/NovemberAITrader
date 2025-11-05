import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  RiskManagementService, 
  TradeValidator, 
  EmergencySafetySystem,
  TradeRequest 
} from '../risk-management-service';
import { RiskConfig, TradingSignal, TradingPosition } from '../../../types';
import { DefaultErrorHandler } from '../../base';

describe('RiskManagementService', () => {
  let service: RiskManagementService;
  let riskConfig: RiskConfig;
  let errorHandler: DefaultErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    
    riskConfig = {
      maxDailyLoss: 500,
      maxPositionSize: 1000,
      stopLossPercentage: 5,
      maxOpenPositions: 3,
      emergencyStopEnabled: true
    };

    errorHandler = new DefaultErrorHandler();
    service = new RiskManagementService(riskConfig, errorHandler);
  });

  describe('Position Sizing Calculations', () => {
    it('should calculate position size based on signal confidence', () => {
      const signal: TradingSignal = {
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 80,
        targetPrice: 50000,
        stopLoss: 47500,
        reasoning: 'Strong bullish signal',
        timestamp: new Date()
      };

      const balance = 10000;
      const positionSize = service.calculatePositionSize(signal, balance);

      // Should be 10% of balance * confidence factor, but capped by max position size
      const expectedBase = balance * 0.1 * (signal.confidence / 100);
      const expectedSize = Math.min(expectedBase, riskConfig.maxPositionSize);
      
      expect(positionSize).toBe(expectedSize);
    });

    it('should respect maximum position size limit', () => {
      const signal: TradingSignal = {
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 100,
        targetPrice: 50000,
        stopLoss: 47500,
        reasoning: 'Maximum confidence signal',
        timestamp: new Date()
      };

      const balance = 50000; // Large balance
      const positionSize = service.calculatePositionSize(signal, balance);

      expect(positionSize).toBeLessThanOrEqual(riskConfig.maxPositionSize);
    });

    it('should return minimum trade size for low confidence signals', () => {
      const signal: TradingSignal = {
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 1,
        targetPrice: 50000,
        stopLoss: 47500,
        reasoning: 'Very low confidence',
        timestamp: new Date()
      };

      const balance = 1000;
      const positionSize = service.calculatePositionSize(signal, balance);

      expect(positionSize).toBeGreaterThanOrEqual(10); // Minimum $10 trade
    });

    it('should return 0 for invalid inputs', () => {
      const signal: TradingSignal = {
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 80,
        targetPrice: 50000,
        stopLoss: 47500,
        reasoning: 'Test signal',
        timestamp: new Date()
      };

      const positionSize = service.calculatePositionSize(signal, 0);
      expect(positionSize).toBe(0);
    });
  });

  describe('Stop Loss Checking', () => {
    it('should trigger stop loss when percentage exceeded', () => {
      const position: TradingPosition = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        entryPrice: 50000,
        currentPrice: 47000,
        unrealizedPnL: -300, // 6% loss
        timestamp: new Date(),
        status: 'open'
      };

      const shouldTrigger = service.checkStopLoss(position);
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger stop loss within acceptable range', () => {
      const position: TradingPosition = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        entryPrice: 50000,
        currentPrice: 48000,
        unrealizedPnL: -200, // 4% loss
        timestamp: new Date(),
        status: 'open'
      };

      const shouldTrigger = service.checkStopLoss(position);
      expect(shouldTrigger).toBe(false);
    });

    it('should not trigger stop loss for closed positions', () => {
      const position: TradingPosition = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        entryPrice: 50000,
        currentPrice: 45000,
        unrealizedPnL: -500, // 10% loss
        timestamp: new Date(),
        status: 'closed'
      };

      const shouldTrigger = service.checkStopLoss(position);
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('Trade Validation', () => {
    it('should validate valid trade request', async () => {
      const tradeRequest: TradeRequest = {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.01, // Smaller amount to stay within position size limit
        price: 50000
      };

      const isValid = await service.validateTrade(tradeRequest);
      expect(isValid).toBe(true);
    });

    it('should reject trade when emergency stop is active', async () => {
      await service.emergencyStop();

      const tradeRequest: TradeRequest = {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 50000
      };

      const validation = await service.validateTradeDetailed(tradeRequest);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Emergency stop is active');
    });

    it('should reject trade exceeding position size limit', async () => {
      const tradeRequest: TradeRequest = {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 50, // Large amount
        price: 50000 // Total value: $2.5M, exceeds max position size
      };

      const validation = await service.validateTradeDetailed(tradeRequest);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('exceeds maximum position size');
      expect(validation.adjustedAmount).toBeDefined();
    });

    it('should reject trade when max open positions reached', async () => {
      // Add maximum number of positions
      for (let i = 0; i < riskConfig.maxOpenPositions; i++) {
        const position: TradingPosition = {
          id: `pos-${i}`,
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          entryPrice: 50000,
          currentPrice: 50000,
          unrealizedPnL: 0,
          timestamp: new Date(),
          status: 'open'
        };
        service.updatePosition(position);
      }

      const tradeRequest: TradeRequest = {
        symbol: 'ETH/USDT',
        side: 'buy',
        amount: 1,
        price: 3000
      };

      const validation = await service.validateTradeDetailed(tradeRequest);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Maximum open positions limit');
    });
  });

  describe('Risk Limit Enforcement', () => {
    it('should enforce risk limits and trigger emergency stop', async () => {
      // Add positions that exceed daily loss limit
      const position: TradingPosition = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.2,
        entryPrice: 50000,
        currentPrice: 45000,
        unrealizedPnL: -1000, // Exceeds daily loss limit
        timestamp: new Date(),
        status: 'open'
      };
      service.updatePosition(position);

      await service.enforceRiskLimits();

      const riskStatus = service.getRiskStatus();
      expect(riskStatus.emergencyStopActive).toBe(true);
    });

    it('should update daily loss tracking', async () => {
      const position: TradingPosition = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        entryPrice: 50000,
        currentPrice: 48000,
        unrealizedPnL: -200,
        timestamp: new Date(),
        status: 'open'
      };
      service.updatePosition(position);

      await service.enforceRiskLimits();

      const riskStatus = service.getRiskStatus();
      expect(riskStatus.dailyLoss).toBe(200);
    });
  });

  describe('Emergency Stop Functionality', () => {
    it('should activate emergency stop', async () => {
      await service.emergencyStop();

      const riskStatus = service.getRiskStatus();
      expect(riskStatus.emergencyStopActive).toBe(true);
    });

    it('should reset emergency stop', () => {
      service.emergencyStop();
      service.resetEmergencyStop();

      const riskStatus = service.getRiskStatus();
      expect(riskStatus.emergencyStopActive).toBe(false);
    });

    it('should not activate emergency stop when disabled', async () => {
      const disabledConfig = { ...riskConfig, emergencyStopEnabled: false };
      const disabledService = new RiskManagementService(disabledConfig, errorHandler);

      await disabledService.emergencyStop();

      const riskStatus = disabledService.getRiskStatus();
      expect(riskStatus.emergencyStopActive).toBe(false);
    });
  });

  describe('Position Management', () => {
    it('should update position information', () => {
      const position: TradingPosition = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        entryPrice: 50000,
        currentPrice: 51000,
        unrealizedPnL: 100,
        timestamp: new Date(),
        status: 'open'
      };

      service.updatePosition(position);

      const riskStatus = service.getRiskStatus();
      expect(riskStatus.openPositions).toBe(1);
    });

    it('should remove closed positions', () => {
      const position: TradingPosition = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        entryPrice: 50000,
        currentPrice: 51000,
        unrealizedPnL: 100,
        timestamp: new Date(),
        status: 'open'
      };

      service.updatePosition(position);
      service.removePosition('pos-1');

      const riskStatus = service.getRiskStatus();
      expect(riskStatus.openPositions).toBe(0);
    });
  });

  describe('Configuration Updates', () => {
    it('should update risk configuration', () => {
      const newConfig = { maxDailyLoss: 1000 };
      service.updateRiskConfig(newConfig);

      const riskStatus = service.getRiskStatus();
      expect(riskStatus.dailyLossLimit).toBe(1000);
    });
  });
});

describe('TradeValidator', () => {
  let validator: TradeValidator;
  let riskService: RiskManagementService;
  let riskConfig: RiskConfig;
  let errorHandler: DefaultErrorHandler;

  beforeEach(() => {
    riskConfig = {
      maxDailyLoss: 500,
      maxPositionSize: 1000,
      stopLossPercentage: 5,
      maxOpenPositions: 3,
      emergencyStopEnabled: true
    };

    errorHandler = new DefaultErrorHandler();
    riskService = new RiskManagementService(riskConfig, errorHandler);
    validator = new TradeValidator(riskService);
  });

  describe('Enhanced Trade Validation', () => {
    it('should validate trade with sufficient balance', async () => {
      const tradeRequest: TradeRequest = {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.01, // Smaller amount to stay within position size limit
        price: 50000
      };

      const validation = await validator.validateTradeWithSafetyChecks(
        tradeRequest,
        10000, // Account balance
        50000  // Current market price
      );

      expect(validation.isValid).toBe(true);
    });

    it('should reject trade with insufficient balance', async () => {
      const tradeRequest: TradeRequest = {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.01, // Small amount to avoid position size limit
        price: 50000
      };

      const validation = await validator.validateTradeWithSafetyChecks(
        tradeRequest,
        100, // Insufficient balance for this trade
        50000
      );

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Insufficient balance');
    });

    it('should reject trade with excessive price deviation', async () => {
      const tradeRequest: TradeRequest = {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.01, // Small amount to avoid position size limit
        price: 60000 // 20% above market price
      };

      const validation = await validator.validateTradeWithSafetyChecks(
        tradeRequest,
        10000,
        50000 // Current market price
      );

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('deviates too much from market price');
    });

    it('should reject buy order with excessive slippage', async () => {
      const tradeRequest: TradeRequest = {
        symbol: 'BTC/USDT',
        side: 'buy',
        price: 52000, // 4% above market price (exceeds 2% slippage limit)
        amount: 0.01 // Small amount to avoid position size limit
      };

      const validation = await validator.validateTradeWithSafetyChecks(
        tradeRequest,
        10000,
        50000
      );

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Buy order price too high');
    });

    it('should reject sell order with excessive slippage', async () => {
      const tradeRequest: TradeRequest = {
        symbol: 'BTC/USDT',
        side: 'sell',
        price: 48000, // 4% below market price (exceeds 2% slippage limit)
        amount: 0.01 // Small amount to avoid position size limit
      };

      const validation = await validator.validateTradeWithSafetyChecks(
        tradeRequest,
        10000,
        50000
      );

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Sell order price too low');
    });

    it('should reject trade below minimum size', async () => {
      const tradeRequest: TradeRequest = {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.0001, // Very small amount
        price: 50000
      };

      const validation = await validator.validateTradeWithSafetyChecks(
        tradeRequest,
        10000,
        50000
      );

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Trade value too small');
    });
  });
});

describe('EmergencySafetySystem', () => {
  let safetySystem: EmergencySafetySystem;
  let riskService: RiskManagementService;
  let riskConfig: RiskConfig;
  let errorHandler: DefaultErrorHandler;

  beforeEach(() => {
    riskConfig = {
      maxDailyLoss: 500,
      maxPositionSize: 1000,
      stopLossPercentage: 5,
      maxOpenPositions: 3,
      emergencyStopEnabled: true
    };

    errorHandler = new DefaultErrorHandler();
    riskService = new RiskManagementService(riskConfig, errorHandler);
    safetySystem = new EmergencySafetySystem(riskService);
  });

  describe('Emergency Callbacks', () => {
    it('should register and execute emergency callbacks', async () => {
      let callbackExecuted = false;
      
      const emergencyCallback = async () => {
        callbackExecuted = true;
      };

      safetySystem.registerEmergencyCallback(emergencyCallback);
      await safetySystem.triggerEmergencyStop('Test emergency');

      expect(callbackExecuted).toBe(true);
    });

    it('should handle callback errors gracefully', async () => {
      const failingCallback = async () => {
        throw new Error('Callback failed');
      };

      safetySystem.registerEmergencyCallback(failingCallback);
      
      // Should not throw error
      await expect(safetySystem.triggerEmergencyStop('Test emergency')).resolves.not.toThrow();
    });
  });

  describe('Safety Checks', () => {
    it('should trigger emergency stop when daily loss limit exceeded', async () => {
      // Add position that exceeds daily loss limit
      const position: TradingPosition = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.2,
        entryPrice: 50000,
        currentPrice: 45000,
        unrealizedPnL: -1000, // Exceeds daily loss limit
        timestamp: new Date(),
        status: 'open'
      };
      riskService.updatePosition(position);

      // First call enforceRiskLimits to update the daily loss tracker
      await riskService.enforceRiskLimits();
      
      // Then perform safety check
      await safetySystem.performSafetyCheck();

      const riskStatus = riskService.getRiskStatus();
      expect(riskStatus.emergencyStopActive).toBe(true);
    });

    it('should warn when max positions reached but not trigger emergency stop', async () => {
      // Add maximum number of positions
      for (let i = 0; i < riskConfig.maxOpenPositions; i++) {
        const position: TradingPosition = {
          id: `pos-${i}`,
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          entryPrice: 50000,
          currentPrice: 50000,
          unrealizedPnL: 0,
          timestamp: new Date(),
          status: 'open'
        };
        riskService.updatePosition(position);
      }

      await safetySystem.performSafetyCheck();

      const riskStatus = riskService.getRiskStatus();
      expect(riskStatus.emergencyStopActive).toBe(false); // Should not trigger emergency stop
      expect(riskStatus.openPositions).toBe(riskConfig.maxOpenPositions);
    });
  });
});