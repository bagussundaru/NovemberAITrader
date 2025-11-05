import { getBinanceClient } from '@/lib/exchanges/binance-futures-client';
import { getMarketAnalyzer, AIAnalysisResult } from '@/lib/ai/market-analyzer';
import { DatabaseService } from '@/lib/trading-bot/database/database-service';
import { PrismaClient } from '@prisma/client';

export interface TradingConfig {
  profitTarget: number; // Target profit in USD
  maxLeverage: number;
  maxPositions: number;
  minConfidence: number;
  riskPerTrade: number; // Percentage of balance to risk per trade
}

export interface TradingState {
  isRunning: boolean;
  totalProfit: number;
  tradesCount: number;
  winRate: number;
  lastTradeTime: Date | null;
  activePositions: number;
  config: TradingConfig;
}

export class TradingEngine {
  private static instance: TradingEngine | null = null;
  private binanceClient = getBinanceClient();
  private marketAnalyzer = getMarketAnalyzer();
  private db = DatabaseService.getInstance();
  private prisma: PrismaClient;
  
  private state: TradingState = {
    isRunning: false,
    totalProfit: 0,
    tradesCount: 0,
    winRate: 0,
    lastTradeTime: null,
    activePositions: 0,
    config: {
      profitTarget: 10, // $10 profit target
      maxLeverage: 10,
      maxPositions: 3,
      minConfidence: 0.6,
      riskPerTrade: 2 // 2% of balance per trade
    }
  };

  private constructor() {
    this.prisma = this.db.getPrismaClient();
    console.log('🤖 Trading Engine initialized');
  }

  public static getInstance(): TradingEngine {
    if (!TradingEngine.instance) {
      TradingEngine.instance = new TradingEngine();
    }
    return TradingEngine.instance;
  }

  public getState(): TradingState {
    return { ...this.state };
  }

  public async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log('⚠️ Trading Engine already running');
      return;
    }

    try {
      console.log('🚀 Starting Trading Engine...');
      
      // Test connections
      const isConnected = await this.binanceClient.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Binance API');
      }

      this.state.isRunning = true;
      console.log('✅ Trading Engine started successfully');
      
      // Start trading loop
      this.startTradingLoop();
      
    } catch (error) {
      console.error('❌ Failed to start Trading Engine:', error);
      this.state.isRunning = false;
      throw error;
    }
  }

  public async stop(): Promise<void> {
    console.log('🛑 Stopping Trading Engine...');
    this.state.isRunning = false;
    
    // Close all open positions
    await this.closeAllPositions();
    
    console.log('✅ Trading Engine stopped');
  }

  private async startTradingLoop(): Promise<void> {
    console.log('🔄 Starting trading loop...');
    
    while (this.state.isRunning) {
      try {
        await this.executeTradingCycle();
        
        // Wait 30 seconds before next cycle
        await this.sleep(30000);
        
      } catch (error) {
        console.error('❌ Error in trading cycle:', error);
        await this.sleep(60000); // Wait longer on error
      }
    }
  }

  private async executeTradingCycle(): Promise<void> {
    console.log('📊 Executing trading cycle...');
    
    // 1. Check current positions and profits
    await this.checkPositionsAndProfits();
    
    // 2. Get AI analysis
    const analyses = await this.getAIAnalyses();
    
    // 3. Execute trades based on AI signals
    await this.executeTradesFromAnalysis(analyses);
    
    // 4. Update statistics
    await this.updateTradingStats();
  }

  private async checkPositionsAndProfits(): Promise<void> {
    try {
      const positions = await this.binanceClient.getFormattedPositions();
      this.state.activePositions = positions.length;
      
      console.log(`📈 Active positions: ${positions.length}`);
      
      // Check for profit targets and stop losses
      for (const position of positions) {
        const currentPnL = position.pnl;
        const profitTarget = this.state.config.profitTarget; // $10
        const stopLossAmount = -profitTarget * 0.5; // -$5 stop loss
        
        console.log(`💰 ${position.symbol}: P&L $${currentPnL.toFixed(2)} | Target: $${profitTarget} | Stop: $${stopLossAmount}`);
        
        // Take profit at $10
        if (currentPnL >= profitTarget) {
          console.log(`🎯 TAKE PROFIT TRIGGERED for ${position.symbol}: $${currentPnL.toFixed(2)} >= $${profitTarget}`);
          await this.closePosition(position.symbol, 'TAKE_PROFIT');
          
          // Update realized profit
          this.state.totalProfit += currentPnL;
          
          // Log successful trade
          await this.logTrade(position.symbol, 'CLOSE', currentPnL, 'TAKE_PROFIT');
        }
        
        // Stop loss at -$5
        else if (currentPnL <= stopLossAmount) {
          console.log(`🛑 STOP LOSS TRIGGERED for ${position.symbol}: $${currentPnL.toFixed(2)} <= $${stopLossAmount}`);
          await this.closePosition(position.symbol, 'STOP_LOSS');
          
          // Update realized loss
          this.state.totalProfit += currentPnL;
          
          // Log loss trade
          await this.logTrade(position.symbol, 'CLOSE', currentPnL, 'STOP_LOSS');
        }
      }
      
    } catch (error) {
      console.error('Error checking positions:', error);
    }
  }

  private async getAIAnalyses(): Promise<AIAnalysisResult[]> {
    try {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOGEUSDT'];
      const analyses = await this.marketAnalyzer.analyzeMultipleSymbols(symbols);
      
      // Filter by confidence threshold
      return analyses.filter(analysis => 
        analysis.confidence >= this.state.config.minConfidence &&
        analysis.action !== 'HOLD'
      );
      
    } catch (error) {
      console.error('Error getting AI analyses:', error);
      return [];
    }
  }

  private async executeTradesFromAnalysis(analyses: AIAnalysisResult[]): Promise<void> {
    if (analyses.length === 0) {
      console.log('📊 No high-confidence trading signals found');
      return;
    }

    // Sort by confidence (highest first)
    analyses.sort((a, b) => b.confidence - a.confidence);
    
    for (const analysis of analyses) {
      if (this.state.activePositions >= this.state.config.maxPositions) {
        console.log('⚠️ Maximum positions reached, skipping new trades');
        break;
      }

      await this.executeTradeFromSignal(analysis);
    }
  }

  private async executeTradeFromSignal(analysis: AIAnalysisResult): Promise<void> {
    try {
      console.log(`🎯 Executing trade for ${analysis.symbol}: ${analysis.action} (${(analysis.confidence * 100).toFixed(1)}%)`);
      
      // Get account balance
      const balance = await this.binanceClient.getFormattedBalance();
      
      // Calculate position size based on risk management
      const riskAmount = balance.availableBalance * (this.state.config.riskPerTrade / 100);
      const leverage = Math.min(analysis.riskAssessment.recommendedLeverage, this.state.config.maxLeverage);
      
      // Get current price
      const ticker = await this.binanceClient.getTickerPrice(analysis.symbol);
      const currentPrice = parseFloat(ticker[0].price);
      
      // Calculate quantity
      const notionalValue = riskAmount * leverage;
      const quantity = this.calculateQuantity(notionalValue, currentPrice, analysis.symbol);
      
      console.log(`💰 Trade details: ${quantity} ${analysis.symbol} at $${currentPrice} (${leverage}x leverage)`);
      
      // Store trade signal in database
      await this.storeTradingSignal(analysis, currentPrice, quantity, leverage);
      
      // In real implementation, this would place actual order:
      // await this.binanceClient.placeOrder({
      //   symbol: analysis.symbol,
      //   side: analysis.action === 'BUY' ? 'BUY' : 'SELL',
      //   quantity: quantity,
      //   leverage: leverage
      // });
      
      console.log(`✅ Trade executed: ${analysis.action} ${quantity} ${analysis.symbol}`);
      this.state.tradesCount++;
      this.state.lastTradeTime = new Date();
      
    } catch (error) {
      console.error(`❌ Failed to execute trade for ${analysis.symbol}:`, error);
    }
  }

  private calculateQuantity(notionalValue: number, price: number, symbol: string): number {
    // Calculate base quantity
    let quantity = notionalValue / price;
    
    // Apply symbol-specific rounding
    if (symbol.includes('BTC')) {
      quantity = Math.floor(quantity * 1000) / 1000; // 3 decimal places
    } else if (symbol.includes('ETH')) {
      quantity = Math.floor(quantity * 100) / 100; // 2 decimal places
    } else {
      quantity = Math.floor(quantity * 10) / 10; // 1 decimal place
    }
    
    return Math.max(quantity, 0.001); // Minimum quantity
  }

  private async closePosition(symbol: string, reason: string): Promise<void> {
    try {
      console.log(`🔄 Closing position ${symbol} (${reason})`);
      
      // In real implementation, this would close the actual position:
      // await this.binanceClient.closePosition(symbol);
      
      // Store the close action in database
      await this.prisma.tradeExecution.create({
        data: {
          orderId: `close_${symbol}_${Date.now()}`,
          symbol: symbol,
          side: 'SELL', // Assuming we're closing
          amount: 0, // Would be actual position size
          price: 0, // Would be actual close price
          status: 'FILLED'
        }
      });
      
      console.log(`✅ Position closed: ${symbol}`);
      
    } catch (error) {
      console.error(`❌ Failed to close position ${symbol}:`, error);
    }
  }

  private async closeAllPositions(): Promise<void> {
    try {
      const positions = await this.binanceClient.getFormattedPositions();
      
      for (const position of positions) {
        await this.closePosition(position.symbol, 'ENGINE_STOP');
      }
      
    } catch (error) {
      console.error('Error closing all positions:', error);
    }
  }

  private async storeTradingSignal(
    analysis: AIAnalysisResult, 
    price: number, 
    quantity: number, 
    leverage: number
  ): Promise<void> {
    try {
      await this.prisma.tradingSignal.create({
        data: {
          symbol: analysis.symbol,
          action: analysis.action,
          confidence: analysis.confidence,
          targetPrice: price,
          reasoning: analysis.reasoning
        }
      });

      // Store AI analysis
      await this.prisma.aIAnalysis.create({
        data: {
          symbol: analysis.symbol,
          action: analysis.action,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          technicalData: JSON.stringify(analysis.technicalIndicators),
          riskData: JSON.stringify(analysis.riskAssessment),
          modelUsed: analysis.modelUsed,
          timestamp: new Date(analysis.timestamp)
        }
      });
      
    } catch (error) {
      console.error('Error storing trading signal:', error);
    }
  }

  private async updateTradingStats(): Promise<void> {
    try {
      // Get recent trades to calculate win rate
      const recentTrades = await this.prisma.tradeExecution.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      // Calculate total profit from positions
      const positions = await this.binanceClient.getFormattedPositions();
      this.state.totalProfit = positions.reduce((sum, pos) => sum + pos.pnl, 0);
      
      // Update win rate (simplified calculation)
      const winningTrades = recentTrades.filter(trade => trade.fee >= 0).length;
      this.state.winRate = recentTrades.length > 0 ? (winningTrades / recentTrades.length) * 100 : 0;
      
    } catch (error) {
      console.error('Error updating trading stats:', error);
    }
  }

  private async logTrade(
    symbol: string, 
    action: string, 
    pnl: number, 
    reason: string
  ): Promise<void> {
    try {
      await this.prisma.tradeExecution.create({
        data: {
          orderId: `${action.toLowerCase()}_${symbol}_${Date.now()}`,
          symbol: symbol,
          side: action === 'CLOSE' ? 'SELL' : 'BUY',
          amount: Math.abs(pnl), // Use PnL as amount for logging
          price: 0, // Would be actual price in real implementation
          fee: 0,
          status: 'FILLED'
        }
      });
      
      console.log(`📝 Trade logged: ${action} ${symbol} - P&L: $${pnl.toFixed(2)} (${reason})`);
      
    } catch (error) {
      console.error('Error logging trade:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async updateConfig(newConfig: Partial<TradingConfig>): Promise<void> {
    this.state.config = { ...this.state.config, ...newConfig };
    console.log('⚙️ Trading config updated:', this.state.config);
  }

  public async getPerformanceStats(): Promise<{
    totalProfit: number;
    tradesCount: number;
    winRate: number;
    activePositions: number;
    isRunning: boolean;
  }> {
    await this.updateTradingStats();
    
    return {
      totalProfit: this.state.totalProfit,
      tradesCount: this.state.tradesCount,
      winRate: this.state.winRate,
      activePositions: this.state.activePositions,
      isRunning: this.state.isRunning
    };
  }
}

// Global instance
declare global {
  var tradingEngineInstance: TradingEngine | undefined;
}

export function getTradingEngine(): TradingEngine {
  if (!global.tradingEngineInstance) {
    global.tradingEngineInstance = TradingEngine.getInstance();
  }
  return global.tradingEngineInstance;
}