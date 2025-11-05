// Risk Management Service Implementation

import { BaseService } from '../base';
import { 
  RiskConfig, 
  TradingSignal, 
  TradingPosition, 
  TradeExecution,
  RiskManagementService as IRiskManagementService,
  ErrorHandler 
} from '../../types';

export interface TradeRequest {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  signal?: TradingSignal;
}

export interface RiskValidationResult {
  isValid: boolean;
  reason?: string;
  adjustedAmount?: number;
}

export interface DailyLossTracker {
  date: string;
  totalLoss: number;
  trades: number;
}

export class RiskManagementService extends BaseService implements IRiskManagementService {
  private riskConfig: RiskConfig;
  private dailyLossTracker: Map<string, DailyLossTracker> = new Map();
  private emergencyStopActive: boolean = false;
  private currentPositions: Map<string, TradingPosition> = new Map();

  constructor(riskConfig: RiskConfig, errorHandler: ErrorHandler) {
    super(riskConfig, errorHandler);
    this.riskConfig = riskConfig;
  }

  /**
   * Calculate appropriate position size based on signal and available balance
   * Implements maximum position size limits per trading pair
   */
  calculatePositionSize(signal: TradingSignal, balance: number): number {
    try {
      this.validateRequired(signal, 'signal');
      this.validateRequired(balance, 'balance');

      if (balance <= 0) {
        throw new Error('Balance must be positive');
      }

      // Base position size calculation (percentage of balance)
      const basePositionSize = balance * 0.1; // 10% of balance as default

      // Apply confidence factor from AI signal
      const confidenceAdjustedSize = basePositionSize * (signal.confidence / 100);

      // Apply maximum position size limit
      const maxAllowedSize = Math.min(
        this.riskConfig.maxPositionSize,
        balance * 0.25 // Never risk more than 25% of balance on single trade
      );

      const calculatedSize = Math.min(confidenceAdjustedSize, maxAllowedSize);

      // Ensure minimum viable trade size
      const minTradeSize = 10; // Minimum $10 trade
      
      return Math.max(calculatedSize, minTradeSize);
    } catch (error) {
      this.errorHandler.logError(error as Error, 'calculatePositionSize');
      return 0;
    }
  }

  /**
   * Check if position should trigger stop-loss
   */
  checkStopLoss(position: TradingPosition): boolean {
    try {
      this.validateRequired(position, 'position');

      if (position.status !== 'open') {
        return false;
      }

      const lossPercentage = Math.abs(position.unrealizedPnL / (position.entryPrice * position.amount)) * 100;
      
      return lossPercentage >= this.riskConfig.stopLossPercentage;
    } catch (error) {
      this.errorHandler.logError(error as Error, 'checkStopLoss');
      return false;
    }
  }

  /**
   * Validate trade request against all risk parameters
   */
  async validateTrade(tradeRequest: TradeRequest): Promise<boolean> {
    try {
      const validation = await this.validateTradeDetailed(tradeRequest);
      return validation.isValid;
    } catch (error) {
      this.errorHandler.logError(error as Error, 'validateTrade');
      return false;
    }
  }

  /**
   * Detailed trade validation with specific reasons
   */
  async validateTradeDetailed(tradeRequest: TradeRequest): Promise<RiskValidationResult> {
    try {
      this.validateRequired(tradeRequest, 'tradeRequest');

      // Check emergency stop
      if (this.emergencyStopActive) {
        return {
          isValid: false,
          reason: 'Emergency stop is active'
        };
      }

      // Check daily loss limit
      const dailyLossCheck = this.checkDailyLossLimit();
      if (!dailyLossCheck.isValid) {
        return dailyLossCheck;
      }

      // Check maximum open positions
      const openPositionsCheck = this.checkMaxOpenPositions(tradeRequest.symbol);
      if (!openPositionsCheck.isValid) {
        return openPositionsCheck;
      }

      // Check position size limits
      const positionSizeCheck = this.checkPositionSizeLimit(tradeRequest);
      if (!positionSizeCheck.isValid) {
        return positionSizeCheck;
      }

      // Check insufficient balance (basic validation)
      const balanceCheck = this.checkSufficientBalance(tradeRequest);
      if (!balanceCheck.isValid) {
        return balanceCheck;
      }

      return { isValid: true };
    } catch (error) {
      this.errorHandler.logError(error as Error, 'validateTradeDetailed');
      return {
        isValid: false,
        reason: `Validation error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Check daily loss limit enforcement
   */
  private checkDailyLossLimit(): RiskValidationResult {
    const today = new Date().toISOString().split('T')[0];
    const dailyTracker = this.dailyLossTracker.get(today);

    if (dailyTracker && dailyTracker.totalLoss >= this.riskConfig.maxDailyLoss) {
      return {
        isValid: false,
        reason: `Daily loss limit of $${this.riskConfig.maxDailyLoss} reached`
      };
    }

    return { isValid: true };
  }

  /**
   * Check maximum open positions limit
   */
  private checkMaxOpenPositions(symbol: string): RiskValidationResult {
    const openPositions = Array.from(this.currentPositions.values())
      .filter(pos => pos.status === 'open');

    if (openPositions.length >= this.riskConfig.maxOpenPositions) {
      return {
        isValid: false,
        reason: `Maximum open positions limit of ${this.riskConfig.maxOpenPositions} reached`
      };
    }

    return { isValid: true };
  }

  /**
   * Check position size limits
   */
  private checkPositionSizeLimit(tradeRequest: TradeRequest): RiskValidationResult {
    const tradeValue = tradeRequest.amount * tradeRequest.price;

    if (tradeValue > this.riskConfig.maxPositionSize) {
      const adjustedAmount = this.riskConfig.maxPositionSize / tradeRequest.price;
      return {
        isValid: false,
        reason: `Trade size exceeds maximum position size of $${this.riskConfig.maxPositionSize}`,
        adjustedAmount
      };
    }

    return { isValid: true };
  }

  /**
   * Check sufficient balance (basic implementation)
   */
  private checkSufficientBalance(tradeRequest: TradeRequest): RiskValidationResult {
    // This is a basic check - in real implementation, this would check actual account balance
    const requiredAmount = tradeRequest.amount * tradeRequest.price;
    
    if (requiredAmount <= 0) {
      return {
        isValid: false,
        reason: 'Invalid trade amount or price'
      };
    }

    // Basic validation - actual balance checking would be done by exchange service
    return { isValid: true };
  }

  /**
   * Enforce risk limits - called periodically to check all positions
   */
  async enforceRiskLimits(): Promise<void> {
    try {
      // Check all open positions for stop-loss triggers
      for (const position of this.currentPositions.values()) {
        if (this.checkStopLoss(position)) {
          console.log(`Stop-loss triggered for position ${position.id} on ${position.symbol}`);
          // In real implementation, this would trigger a sell order
        }
      }

      // Check daily loss limits
      this.updateDailyLossTracker();

      // Auto-activate emergency stop if daily loss limit exceeded
      const today = new Date().toISOString().split('T')[0];
      const dailyTracker = this.dailyLossTracker.get(today);
      
      if (dailyTracker && dailyTracker.totalLoss >= this.riskConfig.maxDailyLoss) {
        await this.emergencyStop();
      }
    } catch (error) {
      this.errorHandler.logError(error as Error, 'enforceRiskLimits');
    }
  }

  /**
   * Emergency stop functionality - halt all trading activities
   */
  async emergencyStop(): Promise<void> {
    try {
      if (!this.riskConfig.emergencyStopEnabled) {
        console.log('Emergency stop is disabled in configuration');
        return;
      }

      this.emergencyStopActive = true;
      console.log('EMERGENCY STOP ACTIVATED - All trading halted');

      // In real implementation, this would:
      // 1. Cancel all pending orders
      // 2. Close all open positions (if configured)
      // 3. Send alerts to monitoring system
      // 4. Log the emergency stop event

    } catch (error) {
      this.errorHandler.logError(error as Error, 'emergencyStop');
    }
  }

  /**
   * Update daily loss tracking
   */
  private updateDailyLossTracker(): void {
    const today = new Date().toISOString().split('T')[0];
    
    if (!this.dailyLossTracker.has(today)) {
      this.dailyLossTracker.set(today, {
        date: today,
        totalLoss: 0,
        trades: 0
      });
    }

    // Calculate total loss from current positions
    let totalUnrealizedLoss = 0;
    for (const position of this.currentPositions.values()) {
      if (position.status === 'open' && position.unrealizedPnL < 0) {
        totalUnrealizedLoss += Math.abs(position.unrealizedPnL);
      }
    }

    const tracker = this.dailyLossTracker.get(today)!;
    tracker.totalLoss = totalUnrealizedLoss;
  }

  /**
   * Update position information
   */
  updatePosition(position: TradingPosition): void {
    this.currentPositions.set(position.id, position);
  }

  /**
   * Remove closed position
   */
  removePosition(positionId: string): void {
    this.currentPositions.delete(positionId);
  }

  /**
   * Get current risk status
   */
  getRiskStatus(): {
    emergencyStopActive: boolean;
    dailyLoss: number;
    openPositions: number;
    dailyLossLimit: number;
    maxPositions: number;
  } {
    const today = new Date().toISOString().split('T')[0];
    const dailyTracker = this.dailyLossTracker.get(today);
    const openPositions = Array.from(this.currentPositions.values())
      .filter(pos => pos.status === 'open').length;

    return {
      emergencyStopActive: this.emergencyStopActive,
      dailyLoss: dailyTracker?.totalLoss || 0,
      openPositions,
      dailyLossLimit: this.riskConfig.maxDailyLoss,
      maxPositions: this.riskConfig.maxOpenPositions
    };
  }

  /**
   * Reset emergency stop (manual override)
   */
  resetEmergencyStop(): void {
    this.emergencyStopActive = false;
    console.log('Emergency stop reset - Trading can resume');
  }

  /**
   * Update risk configuration
   */
  updateRiskConfig(newConfig: Partial<RiskConfig>): void {
    this.riskConfig = { ...this.riskConfig, ...newConfig };
  }
}
/**
 
* Enhanced Trade Validation and Safety Checks
 */
export class TradeValidator {
  private riskService: RiskManagementService;

  constructor(riskService: RiskManagementService) {
    this.riskService = riskService;
  }

  /**
   * Comprehensive trade validation with detailed safety checks
   */
  async validateTradeWithSafetyChecks(
    tradeRequest: TradeRequest,
    accountBalance: number,
    currentMarketPrice: number
  ): Promise<RiskValidationResult> {
    try {
      // Basic risk validation
      const basicValidation = await this.riskService.validateTradeDetailed(tradeRequest);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Enhanced balance checking with actual account balance
      const balanceCheck = this.validateSufficientBalance(tradeRequest, accountBalance);
      if (!balanceCheck.isValid) {
        return balanceCheck;
      }

      // Market price validation
      const priceCheck = this.validateMarketPrice(tradeRequest, currentMarketPrice);
      if (!priceCheck.isValid) {
        return priceCheck;
      }

      // Slippage protection
      const slippageCheck = this.validateSlippage(tradeRequest, currentMarketPrice);
      if (!slippageCheck.isValid) {
        return slippageCheck;
      }

      // Minimum trade size validation
      const minSizeCheck = this.validateMinimumTradeSize(tradeRequest);
      if (!minSizeCheck.isValid) {
        return minSizeCheck;
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        reason: `Safety check failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validate sufficient balance with actual account balance
   */
  private validateSufficientBalance(
    tradeRequest: TradeRequest,
    accountBalance: number
  ): RiskValidationResult {
    const requiredAmount = tradeRequest.amount * tradeRequest.price;
    const bufferAmount = requiredAmount * 1.05; // 5% buffer for fees

    if (accountBalance < bufferAmount) {
      return {
        isValid: false,
        reason: `Insufficient balance. Required: $${bufferAmount.toFixed(2)}, Available: $${accountBalance.toFixed(2)}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate trade price against current market price
   */
  private validateMarketPrice(
    tradeRequest: TradeRequest,
    currentMarketPrice: number
  ): RiskValidationResult {
    const priceDeviation = Math.abs(tradeRequest.price - currentMarketPrice) / currentMarketPrice;
    const maxDeviation = 0.05; // 5% maximum deviation

    if (priceDeviation > maxDeviation) {
      return {
        isValid: false,
        reason: `Trade price deviates too much from market price. Market: $${currentMarketPrice}, Trade: $${tradeRequest.price}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate slippage protection
   */
  private validateSlippage(
    tradeRequest: TradeRequest,
    currentMarketPrice: number
  ): RiskValidationResult {
    const maxSlippage = 0.02; // 2% maximum slippage
    
    if (tradeRequest.side === 'buy') {
      const slippage = (tradeRequest.price - currentMarketPrice) / currentMarketPrice;
      if (slippage > maxSlippage) {
        return {
          isValid: false,
          reason: `Buy order price too high. Slippage: ${(slippage * 100).toFixed(2)}%`
        };
      }
    } else {
      const slippage = (currentMarketPrice - tradeRequest.price) / currentMarketPrice;
      if (slippage > maxSlippage) {
        return {
          isValid: false,
          reason: `Sell order price too low. Slippage: ${(slippage * 100).toFixed(2)}%`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate minimum trade size
   */
  private validateMinimumTradeSize(tradeRequest: TradeRequest): RiskValidationResult {
    const tradeValue = tradeRequest.amount * tradeRequest.price;
    const minTradeValue = 10; // $10 minimum

    if (tradeValue < minTradeValue) {
      return {
        isValid: false,
        reason: `Trade value too small. Minimum: $${minTradeValue}, Current: $${tradeValue.toFixed(2)}`
      };
    }

    return { isValid: true };
  }
}

/**
 * Emergency Safety System
 */
export class EmergencySafetySystem {
  private riskService: RiskManagementService;
  private emergencyCallbacks: Array<() => Promise<void>> = [];

  constructor(riskService: RiskManagementService) {
    this.riskService = riskService;
  }

  /**
   * Register emergency callback function
   */
  registerEmergencyCallback(callback: () => Promise<void>): void {
    this.emergencyCallbacks.push(callback);
  }

  /**
   * Trigger emergency stop with all registered callbacks
   */
  async triggerEmergencyStop(reason: string): Promise<void> {
    console.log(`EMERGENCY STOP TRIGGERED: ${reason}`);
    
    // Execute risk service emergency stop
    await this.riskService.emergencyStop();

    // Execute all registered emergency callbacks
    for (const callback of this.emergencyCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Emergency callback failed:', error);
      }
    }
  }

  /**
   * Check system health and trigger emergency stop if needed
   */
  async performSafetyCheck(): Promise<void> {
    const riskStatus = this.riskService.getRiskStatus();

    // Check if daily loss limit exceeded
    if (riskStatus.dailyLoss >= riskStatus.dailyLossLimit) {
      await this.triggerEmergencyStop('Daily loss limit exceeded');
      return;
    }

    // Check if too many open positions
    if (riskStatus.openPositions >= riskStatus.maxPositions) {
      console.warn('Maximum open positions reached - new trades will be blocked');
    }
  }
}