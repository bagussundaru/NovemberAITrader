import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotificationService } from '../notification-service';
import { NotificationConfig, AlertSeverity } from '../types';
import { TradingPosition, TradeExecution, TradingSignal } from '../../../types';
import { DefaultErrorHandler } from '../../base';

describe('NotificationService', () => {
  let service: NotificationService;
  let config: NotificationConfig;
  let errorHandler: DefaultErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      enableRealTimeUpdates: true,
      enableTradeAlerts: true,
      enableErrorAlerts: true,
      enablePerformanceAlerts: true,
      alertThresholds: {
        dailyLossPercentage: 10,
        errorRatePercentage: 5,
        responseTimeMs: 1000
      }
    };

    errorHandler = new DefaultErrorHandler();
    service = new NotificationService(config, errorHandler);
  });

  afterEach(async () => {
    if (service.isServiceRunning()) {
      await service.stopNotificationService();
    }
  });

  describe('Service Lifecycle', () => {
    it('should start notification service successfully', async () => {
      const startSpy = vi.fn();
      service.on('serviceStarted', startSpy);

      await service.startNotificationService();
      
      expect(service.isServiceRunning()).toBe(true);
      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
          config
        })
      );
    });

    it('should stop notification service successfully', async () => {
      const stopSpy = vi.fn();
      service.on('serviceStopped', stopSpy);

      await service.startNotificationService();
      await service.stopNotificationService();
      
      expect(service.isServiceRunning()).toBe(false);
      expect(stopSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date)
        })
      );
    });

    it('should handle multiple start calls gracefully', async () => {
      await service.startNotificationService();
      await service.startNotificationService(); // Second call should not throw
      
      expect(service.isServiceRunning()).toBe(true);
    });
  });

  describe('Trading Notifications', () => {
    beforeEach(async () => {
      await service.startNotificationService();
    });

    it('should send trading notifications correctly', async () => {
      const notificationSpy = vi.fn();
      service.on('tradingNotification', notificationSpy);

      await service.sendTradingNotification(
        'Trade Executed',
        'BUY 0.1 BTC/USDT at 50000',
        'info',
        { symbol: 'BTC/USDT' }
      );

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trade Executed',
          message: 'BUY 0.1 BTC/USDT at 50000',
          severity: 'info',
          data: { symbol: 'BTC/USDT' },
          acknowledged: false
        })
      );
    });

    it('should skip info notifications when trade alerts disabled', async () => {
      service.updateConfig({ enableTradeAlerts: false });
      
      const notificationSpy = vi.fn();
      service.on('tradingNotification', notificationSpy);

      await service.sendTradingNotification(
        'Trade Info',
        'Info message',
        'info'
      );

      expect(notificationSpy).not.toHaveBeenCalled();
    });

    it('should send warning/error notifications even when trade alerts disabled', async () => {
      service.updateConfig({ enableTradeAlerts: false });
      
      const notificationSpy = vi.fn();
      service.on('tradingNotification', notificationSpy);

      await service.sendTradingNotification(
        'Trade Error',
        'Error message',
        'error'
      );

      expect(notificationSpy).toHaveBeenCalled();
    });

    it('should notify trade execution correctly', async () => {
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

      const notificationSpy = vi.fn();
      service.on('tradingNotification', notificationSpy);

      await service.notifyTradeExecution(trade);

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trade Executed: BTC/USDT',
          message: 'BUY 0.1 BTC/USDT at 50000',
          severity: 'info',
          data: trade
        })
      );
    });

    it('should notify position updates correctly', async () => {
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

      const notificationSpy = vi.fn();
      service.on('tradingNotification', notificationSpy);

      await service.notifyPositionUpdate(position, 'closed');

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Position Closed: BTC/USDT',
          message: 'BUY position closed: 0.1 BTC/USDT',
          severity: 'warning', // Should be warning due to negative P&L
          data: position
        })
      );
    });

    it('should notify signal received correctly', async () => {
      const signal: TradingSignal = {
        symbol: 'BTC/USDT',
        action: 'buy',
        confidence: 0.85,
        targetPrice: 52000,
        stopLoss: 48000,
        reasoning: 'Strong bullish signal',
        timestamp: new Date()
      };

      const notificationSpy = vi.fn();
      service.on('tradingNotification', notificationSpy);

      await service.notifySignalReceived(signal);

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'AI Signal: BTC/USDT',
          message: 'BUY signal for BTC/USDT (confidence: 85.0%)',
          severity: 'info',
          data: signal
        })
      );
    });

    it('should skip hold signals', async () => {
      const signal: TradingSignal = {
        symbol: 'BTC/USDT',
        action: 'hold',
        confidence: 0.5,
        targetPrice: 50000,
        stopLoss: 48000,
        reasoning: 'Neutral signal',
        timestamp: new Date()
      };

      const notificationSpy = vi.fn();
      service.on('tradingNotification', notificationSpy);

      await service.notifySignalReceived(signal);

      expect(notificationSpy).not.toHaveBeenCalled();
    });
  });

  describe('System Notifications', () => {
    beforeEach(async () => {
      await service.startNotificationService();
    });

    it('should send system notifications correctly', async () => {
      const notificationSpy = vi.fn();
      service.on('systemNotification', notificationSpy);

      await service.sendSystemNotification(
        'System Status',
        'System is running normally',
        'info'
      );

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'System Status',
          message: 'System is running normally',
          severity: 'info'
        })
      );
    });
  });

  describe('Critical Alerts', () => {
    beforeEach(async () => {
      await service.startNotificationService();
    });

    it('should send critical alerts correctly', async () => {
      const alertSpy = vi.fn();
      service.on('criticalAlert', alertSpy);

      const error = new Error('Test error');
      await service.sendCriticalAlert(
        'Critical System Error',
        'System encountered a critical error',
        error,
        false
      );

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Critical System Error',
          message: 'System encountered a critical error',
          severity: 'critical',
          data: expect.objectContaining({
            error: 'Test error',
            activateSafeMode: false
          })
        })
      );
    });

    it('should activate safe mode when requested', async () => {
      const safeModeeSpy = vi.fn();
      service.on('safeModeActivated', safeModeeSpy);

      await service.sendCriticalAlert(
        'Critical Error',
        'Activating safe mode',
        undefined,
        true
      );

      expect(safeModeeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'SAFE MODE ACTIVATED',
          message: 'Trading has been halted due to: Critical Error. Activating safe mode',
          severity: 'critical'
        })
      );
    });

    it('should skip critical alerts when error alerts disabled', async () => {
      service.updateConfig({ enableErrorAlerts: false });
      
      const alertSpy = vi.fn();
      service.on('criticalAlert', alertSpy);

      await service.sendCriticalAlert(
        'Critical Error',
        'Test error'
      );

      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('Performance Alerts', () => {
    beforeEach(async () => {
      await service.startNotificationService();
    });

    it('should send performance alerts for threshold violations', async () => {
      const notificationSpy = vi.fn();
      service.on('systemNotification', notificationSpy);

      await service.sendPerformanceAlert(
        'Response Time',
        1500, // Current value
        1000, // Threshold
        'Response time is too high'
      );

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Performance Alert: Response Time',
          message: 'Response time is too high',
          severity: 'warning',
          data: expect.objectContaining({
            metric: 'Response Time',
            currentValue: 1500,
            threshold: 1000,
            deviation: 50 // 50% above threshold
          })
        })
      );
    });

    it('should send critical performance alerts for severe violations', async () => {
      const notificationSpy = vi.fn();
      service.on('systemNotification', notificationSpy);

      await service.sendPerformanceAlert(
        'Memory Usage',
        2000, // Current value
        1000, // Threshold (2000 > 1000 * 1.5, so critical)
        'Memory usage is critically high'
      );

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical'
        })
      );
    });

    it('should skip performance alerts when disabled', async () => {
      service.updateConfig({ enablePerformanceAlerts: false });
      
      const notificationSpy = vi.fn();
      service.on('systemNotification', notificationSpy);

      await service.sendPerformanceAlert(
        'Test Metric',
        100,
        50,
        'Test message'
      );

      expect(notificationSpy).not.toHaveBeenCalled();
    });
  });

  describe('Risk Management Notifications', () => {
    beforeEach(async () => {
      await service.startNotificationService();
    });

    it('should notify risk events correctly', async () => {
      const notificationSpy = vi.fn();
      service.on('tradingNotification', notificationSpy);

      await service.notifyRiskEvent(
        'stop_loss',
        'BTC/USDT',
        'Stop loss triggered at 48000'
      );

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Risk Management: STOP LOSS',
          message: 'BTC/USDT: Stop loss triggered at 48000',
          severity: 'warning'
        })
      );
    });

    it('should send critical alerts for emergency stop', async () => {
      const notificationSpy = vi.fn();
      service.on('tradingNotification', notificationSpy);

      await service.notifyRiskEvent(
        'emergency_stop',
        'ALL',
        'Emergency stop activated due to high losses'
      );

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Risk Management: EMERGENCY STOP',
          severity: 'critical'
        })
      );
    });
  });

  describe('Alert Management', () => {
    beforeEach(async () => {
      await service.startNotificationService();
    });

    it('should store and retrieve alerts correctly', async () => {
      await service.sendSystemNotification('Test Alert', 'Test message', 'info');
      
      const alerts = service.getAllAlerts();
      expect(alerts).toHaveLength(2); // Including startup notification
      
      const testAlert = alerts.find(a => a.title === 'Test Alert');
      expect(testAlert).toBeDefined();
      expect(testAlert?.message).toBe('Test message');
      expect(testAlert?.severity).toBe('info');
      expect(testAlert?.acknowledged).toBe(false);
    });

    it('should acknowledge alerts correctly', async () => {
      await service.sendSystemNotification('Test Alert', 'Test message', 'info');
      
      const alerts = service.getAllAlerts();
      const testAlert = alerts.find(a => a.title === 'Test Alert');
      
      expect(testAlert).toBeDefined();
      const acknowledged = service.acknowledgeAlert(testAlert!.id);
      
      expect(acknowledged).toBe(true);
      
      const updatedAlerts = service.getAllAlerts();
      const updatedAlert = updatedAlerts.find(a => a.id === testAlert!.id);
      expect(updatedAlert?.acknowledged).toBe(true);
    });

    it('should get unacknowledged alerts correctly', async () => {
      await service.sendSystemNotification('Alert 1', 'Message 1', 'info');
      await service.sendSystemNotification('Alert 2', 'Message 2', 'warning');
      
      let unacknowledged = service.getUnacknowledgedAlerts();
      expect(unacknowledged.length).toBeGreaterThanOrEqual(2);
      
      // Acknowledge one alert
      const alerts = service.getAllAlerts();
      const firstAlert = alerts.find(a => a.title === 'Alert 1');
      service.acknowledgeAlert(firstAlert!.id);
      
      unacknowledged = service.getUnacknowledgedAlerts();
      expect(unacknowledged.find(a => a.title === 'Alert 1')).toBeUndefined();
      expect(unacknowledged.find(a => a.title === 'Alert 2')).toBeDefined();
    });

    it('should clear old acknowledged alerts', async () => {
      await service.sendSystemNotification('Old Alert', 'Old message', 'info');
      
      const alerts = service.getAllAlerts();
      const oldAlert = alerts.find(a => a.title === 'Old Alert');
      
      // Acknowledge the alert
      service.acknowledgeAlert(oldAlert!.id);
      
      // Manually set old timestamp
      oldAlert!.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      const clearedCount = service.clearOldAlerts(24); // Clear alerts older than 24 hours
      
      expect(clearedCount).toBeGreaterThan(0);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration correctly', () => {
      const configSpy = vi.fn();
      service.on('configUpdated', configSpy);

      const newConfig = { enableTradeAlerts: false };
      service.updateConfig(newConfig);

      expect(configSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          enableTradeAlerts: false
        })
      );
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.startNotificationService();
    });

    it('should provide notification statistics', async () => {
      await service.sendSystemNotification('Info Alert', 'Info message', 'info');
      await service.sendSystemNotification('Warning Alert', 'Warning message', 'warning');
      await service.sendCriticalAlert('Error Alert', 'Error message');

      const stats = service.getNotificationStatistics();

      expect(stats.totalAlerts).toBeGreaterThanOrEqual(3);
      expect(stats.alertsBySeverity.info).toBeGreaterThanOrEqual(1);
      expect(stats.alertsBySeverity.warning).toBeGreaterThanOrEqual(1);
      expect(stats.alertsBySeverity.critical).toBeGreaterThanOrEqual(1);
      expect(stats.unacknowledgedCount).toBeGreaterThanOrEqual(3);
    });
  });
});