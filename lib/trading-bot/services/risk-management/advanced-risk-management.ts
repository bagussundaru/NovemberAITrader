// Advanced Risk Management Service
// Provides sophisticated risk management capabilities for AI trading

export interface RiskMetrics {
  portfolioValue: number;
  dailyPnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  var95: number; // Value at Risk 95%
  expectedShortfall: number;
}

export interface PositionRisk {
  positionId: string;
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  riskScore: number;
  stopLossLevel: number;
  takeProfitLevel: number;
  timeInPosition: number;
}

export interface RiskLimits {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxVolatility: number;
  maxConcentration: number;
  minLiquidity: number;
}

export class AdvancedRiskManagementService {
  private riskLimits: RiskLimits;
  private currentMetrics: RiskMetrics;
  private activePositions: Map<string, PositionRisk>;
  private historicalData: number[];

  constructor(riskLimits: RiskLimits) {
    this.riskLimits = riskLimits;
    this.activePositions = new Map();
    this.historicalData = [];
    this.currentMetrics = {
      portfolioValue: 0,
      dailyPnL: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      volatility: 0,
      var95: 0,
      expectedShortfall: 0
    };
  }

  /**
   * Calculate comprehensive risk metrics
   */
  calculateRiskMetrics(portfolioValue: number, pnlHistory: number[]): RiskMetrics {
    const dailyPnL = pnlHistory.length > 0 ? pnlHistory[pnlHistory.length - 1] : 0;
    const returns = this.calculateReturns(pnlHistory);
    const volatility = this.calculateVolatility(returns);
    const sharpeRatio = this.calculateSharpeRatio(returns, volatility);
    const maxDrawdown = this.calculateMaxDrawdown(pnlHistory);
    const var95 = this.calculateVaR(returns, 0.05);
    const expectedShortfall = this.calculateExpectedShortfall(returns, 0.05);

    this.currentMetrics = {
      portfolioValue,
      dailyPnL,
      maxDrawdown,
      sharpeRatio,
      volatility,
      var95,
      expectedShortfall
    };

    return this.currentMetrics;
  }

  /**
   * Assess risk for a new position
   */
  assessPositionRisk(symbol: string, size: number, entryPrice: number): PositionRisk {
    const riskScore = this.calculateRiskScore(symbol, size, entryPrice);
    const stopLoss = this.calculateStopLoss(entryPrice, riskScore);
    const takeProfit = this.calculateTakeProfit(entryPrice, riskScore);

    return {
      positionId: `${symbol}-${Date.now()}`,
      symbol,
      size,
      entryPrice,
      currentPrice: entryPrice,
      unrealizedPnL: 0,
      riskScore,
      stopLossLevel: stopLoss,
      takeProfitLevel: takeProfit,
      timeInPosition: 0
    };
  }

  /**
   * Check if trading should be allowed based on risk metrics
   */
  shouldAllowTrading(): boolean {
    if (this.currentMetrics.dailyPnL < -this.riskLimits.maxDailyLoss) {
      return false; // Daily loss limit exceeded
    }

    if (this.currentMetrics.maxDrawdown > this.riskLimits.maxDrawdown) {
      return false; // Max drawdown exceeded
    }

    if (this.currentMetrics.volatility > this.riskLimits.maxVolatility) {
      return false; // Volatility too high
    }

    return true;
  }

  /**
   * Calculate position size based on risk parameters
   */
  calculatePositionSize(accountBalance: number, riskPerTrade: number = 0.02): number {
    const maxRiskAmount = accountBalance * riskPerTrade;
    const maxPositionSize = accountBalance * (this.riskLimits.maxPositionSize / 100);
    
    return Math.min(maxRiskAmount, maxPositionSize);
  }

  /**
   * Update position risk metrics
   */
  updatePositionRisk(positionId: string, currentPrice: number): void {
    const position = this.activePositions.get(positionId);
    if (!position) return;

    position.currentPrice = currentPrice;
    position.unrealizedPnL = (currentPrice - position.entryPrice) * position.size;
    position.timeInPosition += 1;

    // Recalculate risk score based on current conditions
    position.riskScore = this.calculateDynamicRiskScore(position);
  }

  /**
   * Get current risk metrics
   */
  getCurrentMetrics(): RiskMetrics {
    return this.currentMetrics;
  }

  /**
   * Get active positions risk
   */
  getActivePositionsRisk(): PositionRisk[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Private methods for calculations
   */
  private calculateReturns(pnlHistory: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < pnlHistory.length; i++) {
      if (pnlHistory[i - 1] !== 0) {
        returns.push((pnlHistory[i] - pnlHistory[i - 1]) / Math.abs(pnlHistory[i - 1]));
      }
    }
    return returns;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }

  private calculateSharpeRatio(returns: number[], volatility: number): number {
    if (volatility === 0) return 0;
    
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const riskFreeRate = 0.02; // Assume 2% risk-free rate
    
    return (meanReturn - riskFreeRate) / volatility;
  }

  private calculateMaxDrawdown(pnlHistory: number[]): number {
    if (pnlHistory.length === 0) return 0;
    
    let maxDrawdown = 0;
    let peak = pnlHistory[0];
    
    for (const value of pnlHistory) {
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(confidence * sortedReturns.length);
    
    return sortedReturns[index] || 0;
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(confidence * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, index);
    
    return tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
  }

  private calculateRiskScore(symbol: string, size: number, entryPrice: number): number {
    // Simplified risk scoring - in real implementation, this would consider:
    // - Historical volatility
    // - Market conditions
    // - Liquidity
    // - Correlation with existing positions
    // - News/sentiment analysis
    
    let riskScore = 0.5; // Base risk score
    
    // Size-based risk
    if (size > this.riskLimits.maxPositionSize * 0.8) {
      riskScore += 0.3;
    } else if (size > this.riskLimits.maxPositionSize * 0.5) {
      riskScore += 0.1;
    }
    
    return Math.min(riskScore, 1.0);
  }

  private calculateStopLoss(entryPrice: number, riskScore: number): number {
    const stopLossPercentage = 0.02 + (riskScore * 0.03); // 2-5% stop loss
    return entryPrice * (1 - stopLossPercentage);
  }

  private calculateTakeProfit(entryPrice: number, riskScore: number): number {
    const takeProfitPercentage = 0.05 + ((1 - riskScore) * 0.05); // 5-10% take profit
    return entryPrice * (1 + takeProfitPercentage);
  }

  private calculateDynamicRiskScore(position: PositionRisk): number {
    // Recalculate risk based on current market conditions and position performance
    let riskScore = position.riskScore;
    
    // Adjust based on unrealized PnL
    if (position.unrealizedPnL < 0) {
      riskScore += 0.1;
    }
    
    // Adjust based on time in position
    if (position.timeInPosition > 24) { // More than 24 time units
      riskScore += 0.05;
    }
    
    return Math.min(riskScore, 1.0);
  }
}

export default AdvancedRiskManagementService;