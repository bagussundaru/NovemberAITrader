import { NextResponse } from "next/server";

// Free crypto news API endpoints
const NEWS_SOURCES = [
  {
    name: 'CoinDesk',
    url: 'https://api.coindesk.com/v1/news/articles.json',
    type: 'coindesk'
  },
  {
    name: 'CryptoNews',
    url: 'https://cryptonews-api.com/api/v1/category?section=general&items=10&page=1',
    type: 'cryptonews'
  }
];

interface NewsItem {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export async function GET() {
  try {
    console.log('🗞️ Fetching crypto news...');
    
    // Mock news data for now (since free APIs often have CORS issues)
    const mockNews: NewsItem[] = [
      {
        title: "Bitcoin Drops 6.5% as Market Sentiment Turns Bearish",
        description: "Major cryptocurrency exchanges report significant selling pressure as institutional investors take profits amid regulatory concerns.",
        url: "https://example.com/news/1",
        publishedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        source: "CryptoNews",
        impact: "HIGH"
      },
      {
        title: "Ethereum Network Upgrade Shows Strong Technical Performance",
        description: "Despite market downturn, Ethereum's latest network improvements demonstrate robust infrastructure capabilities.",
        url: "https://example.com/news/2",
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        source: "CoinDesk",
        impact: "MEDIUM"
      },
      {
        title: "Solana DeFi Protocol Launches New Yield Farming Features",
        description: "New decentralized finance features on Solana blockchain attract significant liquidity despite broader market volatility.",
        url: "https://example.com/news/3",
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        source: "DeFi Pulse",
        impact: "LOW"
      },
      {
        title: "Federal Reserve Comments Impact Crypto Market Sentiment",
        description: "Recent statements from Federal Reserve officials regarding digital assets create uncertainty in cryptocurrency markets.",
        url: "https://example.com/news/4",
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
        source: "Financial Times",
        impact: "HIGH"
      },
      {
        title: "Major Exchange Reports Record Trading Volumes",
        description: "Increased volatility drives trading activity to new highs across major cryptocurrency exchanges worldwide.",
        url: "https://example.com/news/5",
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
        source: "CoinTelegraph",
        impact: "MEDIUM"
      }
    ];

    // Try to fetch real news (fallback to mock if fails)
    let realNews: NewsItem[] = [];
    
    try {
      // Attempt to fetch from a free news API
      const response = await fetch('https://api.coingecko.com/api/v3/news', {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      });
      
      if (response.ok) {
        const data = await response.json();
        realNews = data.data?.slice(0, 5).map((item: any) => ({
          title: item.title || 'Crypto Market Update',
          description: item.description || 'Latest developments in cryptocurrency markets',
          url: item.url || '#',
          publishedAt: item.created_at || new Date().toISOString(),
          source: item.author || 'CoinGecko',
          impact: 'MEDIUM' as const
        })) || [];
      }
    } catch (error) {
      console.log('Failed to fetch real news, using mock data');
    }

    const newsData = realNews.length > 0 ? realNews : mockNews;

    return NextResponse.json({
      success: true,
      data: {
        news: newsData,
        lastUpdate: new Date().toISOString(),
        source: realNews.length > 0 ? 'CoinGecko API' : 'Mock Data'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching crypto news:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch crypto news',
      details: (error as Error).message
    }, { status: 500 });
  }
}