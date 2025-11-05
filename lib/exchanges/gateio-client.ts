import crypto from 'crypto';

interface GateIOConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

interface TickerData {
  currency_pair: string;
  last: string;
  lowest_ask: string;
  highest_bid: string;
  change_percentage: string;
  base_volume: string;
  quote_volume: string;
  high_24h: string;
  low_24h: string;
}

interface AccountBalance {
  currency: string;
  available: string;
  locked: string;
}

export class GateIOClient {
  private config: GateIOConfig;

  constructor(config: GateIOConfig) {
    this.config = config;
  }

  private generateSignature(method: string, url: string, queryString: string, body: string, timestamp: string): string {
    const hashedPayload = crypto.createHash('sha512').update(body).digest('hex');
    const signString = `${method}\n${url}\n${queryString}\n${hashedPayload}\n${timestamp}`;
    return crypto.createHmac('sha512', this.config.apiSecret).update(signString).digest('hex');
  }

  private async makeRequest(method: string, endpoint: stri