// Trading Bot Integration Module
// Exports for end-to-end workflow validation and testing

export { EndToEndTradingWorkflow } from './end-to-end-workflow';
export type { 
  WorkflowValidationResult,
  EndToEndTestConfig 
} from './end-to-end-workflow';

// Integration utilities and constants
export const INTEGRATION_CONSTANTS = {
  DEFAULT_TEST_DURATION: 15000, // 15 seconds
  MAX_TEST_DURATION: 60000, // 60 seconds
  DEFAULT_TRADING_PAIRS: ['BTC/USDT', 'ETH/USDT'],
  VALIDATION_STAGES: [
    'Service Authentication',
    'Market Data Flow', 
    'AI Analysis Flow',
    'Risk Management',
    'Trade Execution',
    'Database Integration',
    'Complete Trading Session',
    'Error Handling & Recovery'
  ] as const
} as const;

export type ValidationStage = typeof INTEGRATION_CONSTANTS.VALIDATION_STAGES[number];