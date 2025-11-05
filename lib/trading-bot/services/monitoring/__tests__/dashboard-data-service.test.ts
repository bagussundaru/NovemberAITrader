import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DashboardDataService } from '../dashboard-data-service';
import { PerformanceTracker } from '../performance-tracker';
import { 
  GateExchangeService, 
  RiskManagementService, 
  TradingPosition, 
  TradeExecution 
} from '../../../types';
import { DefaultErrorHandler } from '../../base';

// Mock services
const mockGateService = {
  getAccountBalance: vi.fn(),
  getOpenPositions: vi.fn()
} as unknown as GateExchangeService;

const mockRiskService = {
  getRiskStatus: vi.fn(),
  calculatePositionSize: vi.fn(),
  checkStopLoss: vi.fn(),
  validateTrade: vi.fn(),
  enforceRiskLimits: vi.fn(),
  emergencyStop: vi.fn(),
  updatePosition: vi.fn(),
  removePosition: vi.fn(),
  resetEmergencyStop: vi.fn(),
  updateRiskConfig: vi.fn()
} as unknown as RiskManagementService;

describe('DashboardDataService', () => {
  let service: DashboardDataService;
  let errorHandler: DefaultErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler = new DefaultErrorHandler();
    service = new DashboardDataService(mockGateService, mockRiskService, errorHandler);
  });

  afterEach(async () => {
    if (service.isServiceRunning()) {
      await service.stopRealTimeUpdates();
    }
  });

  describe('Service Lifecycle', () => {
    it('should start real-time updates successfully', async () => {
      // Mock successful responses
      vi.mocked(mockGateService.getAccountBalance).mockResolvedValue({
        'USDT': { available: 1000, locked: 100 }
      });
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue([]);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 0,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      await service.startRealTimeUpdates();
      
      expect(service.isServiceRunning()).toBe(true);
    });

    it('should stop real-time updates successfully', async () => {
      // Start service first
      vi.mocked(mockGateService.getAccountBalance).mockResolvedValue({
        'USDT': { available: 1000, locked: 100 }
      });
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue([]);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 0,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      await service.startRealTimeUpdates();
      await service.stopRealTimeUpdates();
      
      expect(service.isServiceRunning()).toBe(false);
    });

    it('should handle start errors gracefully', async () => {
      vi.mocked(mockGateService.getAccountBalance).mockRejectedValue(new Error('API Error'));
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue([]);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 0,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      // The service should start successfully but handle errors during updates
      await service.startRealTimeUpdates();
      expect(service.isServiceRunning()).toBe(true);
    });
  });

  describe('Account Balance Updates', () => {
    it('should update account balance with real-time data', async () => {
      const mockBalance = {
        'USDT': { available: 5000, locked: 500 }
      };
      
      vi.mocked(mockGateService.getAccountBalance).mockResolvedValue(mockBalance);
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue([]);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 0,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      await service.startRealTimeUpdates();
      
      // Wait for initial update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dashboardData = service.getCurrentDashboardData();
      
      expect(dashboardData?.accountBalance.total).toBe(5500);
      expect(dashboardData?.accountBalance.available).toBe(5000);
      expect(dashboardData?.accountBalance.locked).toBe(500);
      expect(dashboardData?.accountBalance.currency).toBe('USDT');
    });

    it('should handle balance API errors gracefully', async () => {
      vi.mocked(mockGateService.getAccountBalance).mockRejectedValue(new Error('Balance API Error'));
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue([]);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 0,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      await service.startRealTimeUpdates();
      
      // Wait for update attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dashboardData = service.getCurrentDashboardData();
      
      // Should have default values when API fails
      expect(dashboardData?.accountBalance.total).toBe(0);
    });
  });

  describe('Position Updates', () => {
    it('should update positions with current P&L', async () => {
      const mockPositions: TradingPosition[] = [
        {
          id: 'pos-1',
          symbol: 'BTC/USDT',
          side: 'buy',
          amount: 0.1,
          entryPrice: 50000,
          currentPrice: 52000,
          unrealizedPnL: 200,
          timestamp: new Date(),
          status: 'open'
        },
        {
          id: 'pos-2',
          symbol: 'ETH/USDT',
          side: 'buy',
          amount: 1,
          entryPrice: 3000,
          currentPrice: 2900,
          unrealizedPnL: -100,
          timestamp: new Date(),
          status: 'open'
        }
      ];

      vi.mocked(mockGateService.getAccountBalance).mockResolvedValue({
        'USDT': { available: 1000, locked: 100 }
      });
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue(mockPositions);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 2,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      await service.startRealTimeUpdates();
      
      // Wait for initial update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dashboardData = service.getCurrentDashboardData();
      
      expect(dashboardData?.positions.count).toBe(2);
      expect(dashboardData?.positions.totalPnL).toBe(100); // 200 + (-100)
      expect(dashboardData?.positions.totalValue).toBe(8100); // (0.1 * 52000) + (1 * 2900)
    });

    it('should handle empty positions correctly', async () => {
      vi.mocked(mockGateService.getAccountBalance).mockResolvedValue({
        'USDT': { available: 1000, locked: 100 }
      });
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue([]);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 0,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      await service.startRealTimeUpdates();
      
      // Wait for initial update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dashboardData = service.getCurrentDashboardData();
      
      expect(dashboardData?.positions.count).toBe(0);
      expect(dashboardData?.positions.totalPnL).toBe(0);
      expect(dashboardData?.positions.totalValue).toBe(0);
      expect(dashboardData?.positions.open).toEqual([]);
    });
  });

  describe('Activity Recording', () => {
    it('should record trading activity correctly', () => {
      const activitySpy = vi.fn();
      service.on('activityLogged', activitySpy);

      service.recordTradingActivity({
        type: 'trade_executed',
        symbol: 'BTC/USDT',
        action: 'buy',
        amount: 0.1,
        price: 50000,
        message: 'Test trade executed',
        severity: 'info'
      });

      expect(activitySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'trade_executed',
          symbol: 'BTC/USDT',
          action: 'buy',
          amount: 0.1,
          price: 50000,
          message: 'Test trade executed',
          severity: 'info'
        })
      );
    });

    it('should record trade execution with proper formatting', () => {
      const trade: TradeExecution = {
        id: 'trade-1',
        orderId: 'order-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        price: 50000,
        fee: 5,
        status: 'filled',
        timestamp: new Date()
      };

      const activitySpy = vi.fn();
      service.on('activityLogged', activitySpy);

      service.recordTradeExecution(trade);

      expect(activitySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'trade_executed',
          symbol: 'BTC/USDT',
          action: 'buy',
          amount: 0.1,
          price: 50000,
          message: 'BUY order executed: 0.1 BTC/USDT at 50000',
          severity: 'info'
        })
      );
    });

    it('should record position updates correctly', () => {
      const position: TradingPosition = {
        id: 'pos-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 0.1,
        entryPrice: 50000,
        currentPrice: 52000,
        unrealizedPnL: 200,
        timestamp: new Date(),
        status: 'open'
      };

      const activitySpy = vi.fn();
      service.on('activityLogged', activitySpy);

      service.recordPositionUpdate(position, 'opened');

      expect(activitySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'position_opened',
          symbol: 'BTC/USDT',
          action: 'buy',
          amount: 0.1,
          price: 50000,
          message: 'Position opened: BUY 0.1 BTC/USDT at 50000',
          severity: 'info'
        })
      );
    });
  });

  describe('Real-time Updates', () => {
    it('should emit real-time updates for balance changes', async () => {
      const updateSpy = vi.fn();
      service.on('realTimeUpdate', updateSpy);

      vi.mocked(mockGateService.getAccountBalance).mockResolvedValue({
        'USDT': { available: 1000, locked: 100 }
      });
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue([]);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 0,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      await service.startRealTimeUpdates();
      
      // Wait for initial update
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'balance_update',
          data: expect.objectContaining({
            total: 1100,
            available: 1000,
            locked: 100,
            currency: 'USDT'
          })
        })
      );
    });

    it('should emit dashboard updated events', async () => {
      const dashboardSpy = vi.fn();
      service.on('dashboardUpdated', dashboardSpy);

      vi.mocked(mockGateService.getAccountBalance).mockResolvedValue({
        'USDT': { available: 1000, locked: 100 }
      });
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue([]);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 0,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      await service.startRealTimeUpdates();
      
      // Wait for initial update
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(dashboardSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          accountBalance: expect.any(Object),
          positions: expect.any(Object),
          performance: expect.any(Object),
          systemHealth: expect.any(Object)
        })
      );
    });
  });

  describe('Data Refresh', () => {
    it('should force refresh dashboard data', async () => {
      vi.mocked(mockGateService.getAccountBalance).mockResolvedValue({
        'USDT': { available: 2000, locked: 200 }
      });
      vi.mocked(mockGateService.getOpenPositions).mockResolvedValue([]);
      vi.mocked(mockRiskService.getRiskStatus).mockReturnValue({
        emergencyStopActive: false,
        dailyLoss: 0,
        openPositions: 0,
        dailyLossLimit: 500,
        maxPositions: 3
      });

      await service.refreshDashboardData();
      
      const dashboardData = service.getCurrentDashboardData();
      
      expect(dashboardData?.accountBalance.total).toBe(2200);
    });
  });
});