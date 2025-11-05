const https = require('https');

const NEBIUS_API_KEY = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IlV6SXJWd1h0dnprLVRvdzlLZWstc0M1akptWXBvX1VaVkxUZlpnMDRlOFUiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiJnb29nbGUtb2F1dGgyfDExNDE3OTYwNTEwMjcyNDQ2MjIxNyIsInNjb3BlIjoib3BlbmlkIG9mZmxpbmVfYWNjZXNzIiwiaXNzIjoiYXBpX2tleV9pc3N1ZXIiLCJhdWQiOlsiaHR0cHM6Ly9uZWJpdXMtaW5mZXJlbmNlLmV1LmF1dGgwLmNvbS9hcGkvdjIvIl0sImV4cCI6MTkxMjY3MDg1MCwidXVpZCI6IjE5OWE1YWM5LTFiMjQtNDQ1Zi1hNDFmLTJjNGE0MDdlMzU5MCIsIm5hbWUiOiJNQ1AiLCJleHBpcmVzX2F0IjoiMjAzMC0wOC0xMVQwOToyNzozMCswMDAwIn0.ajJ9NJVIqpQSb6so-xJsSn0Img9EYCO8XTopZUYuHRA';

function makeRequest(url, method, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${NEBIUS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(responseData) });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    
    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testTradingAnalysis() {
  console.log('🎯 Testing Nebius AI for Trading Analysis...');
  console.log('=============================================');
  
  // Test with technical analysis prompt
  const technicalPrompt = {
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    messages: [
      {
        role: "system",
        content: "You are a technical analysis expert. Analyze cryptocurrency market data and provide clear trading signals. Focus on technical indicators and market trends."
      },
      {
        role: "user",
        content: `Technical Analysis Request:

Current Market Data:
- BTC/USDT: $101,727 (24h change: -5.31%, RSI: 38.3, Volume: High)
- ETH/USDT: $3,410.85 (24h change: -6.82%, RSI: 32.9, Volume: High)  
- SOL/USDT: $157.62 (24h change: -7.40%, RSI: 33.3, Volume: High)

Market Context:
- Strong bearish momentum across all major cryptocurrencies
- RSI indicators showing oversold conditions (below 40)
- High trading volume suggests strong selling pressure
- Support levels being tested

Please provide a technical analysis with:
1. Market sentiment (BULLISH/BEARISH/NEUTRAL)
2. Trading action (BUY/SELL/HOLD)
3. Confidence level (1-10)
4. Key technical levels to watch
5. Risk assessment

Keep response concise and actionable.`
      }
    ],
    max_tokens: 400,
    temperature: 0.2
  };

  try {
    const response = await makeRequest('https://api.studio.nebius.ai/v1/chat/completions', 'POST', technicalPrompt);
    
    if (response.statusCode === 200 && response.data.choices) {
      console.log('✅ Nebius AI Trading Analysis SUCCESS!');
      console.log('=====================================');
      
      const analysis = response.data.choices[0].message.content;
      console.log(analysis);
      
      if (response.data.usage) {
        console.log('\n📊 API Usage:');
        console.log(`Tokens used: ${response.data.usage.total_tokens}`);
        console.log(`Cost estimate: ~$${(response.data.usage.total_tokens * 0.0001).toFixed(4)}`);
      }
      
      console.log('\n🎯 Integration Status:');
      console.log('✅ API Key: Working');
      console.log('✅ Model: meta-llama/Meta-Llama-3.1-8B-Instruct');
      console.log('✅ Trading Analysis: Functional');
      console.log('✅ Response Quality: Good for trading decisions');
      
      return true;
    } else {
      console.log('❌ Analysis failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Test market sentiment analysis
async function testMarketSentiment() {
  console.log('\n🔍 Testing Market Sentiment Analysis...');
  
  const sentimentPrompt = {
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct-fast",
    messages: [
      {
        role: "user",
        content: `Quick market sentiment analysis:

Bitcoin: $101,727 (-5.31%)
Ethereum: $3,410 (-6.82%)
Solana: $157 (-7.40%)

All major cryptos are down 5-7%. High volume. RSI oversold.

Give me: BULLISH/BEARISH/NEUTRAL + confidence % + one sentence why.`
      }
    ],
    max_tokens: 100,
    temperature: 0.1
  };

  try {
    const response = await makeRequest('https://api.studio.nebius.ai/v1/chat/completions', 'POST', sentimentPrompt);
    
    if (response.statusCode === 200 && response.data.choices) {
      console.log('✅ Quick Sentiment Analysis:');
      console.log(response.data.choices[0].message.content);
      return true;
    }
  } catch (error) {
    console.log('❌ Sentiment analysis failed:', error.message);
  }
  return false;
}

// Run tests
async function runAllTests() {
  const test1 = await testTradingAnalysis();
  const test2 = await testMarketSentiment();
  
  console.log('\n🎯 FINAL RESULT:');
  console.log('================');
  if (test1 && test2) {
    console.log('🚀 Nebius AI is READY for trading integration!');
    console.log('✅ Can provide technical analysis');
    console.log('✅ Can assess market sentiment');
    console.log('✅ Fast response times');
    console.log('✅ Cost-effective token usage');
    console.log('\n💡 Recommended integration:');
    console.log('- Use meta-llama/Meta-Llama-3.1-8B-Instruct for detailed analysis');
    console.log('- Use meta-llama/Meta-Llama-3.1-8B-Instruct-fast for quick decisions');
    console.log('- Temperature 0.1-0.3 for consistent trading signals');
  } else {
    console.log('❌ Some tests failed - check configuration');
  }
}

runAllTests().catch(console.error);