const crypto = require('crypto');
const https = require('https');

// API Credentials
const exchanges = {
  gateio: {
    name: 'Gate.io Testnet',
    baseUrl: 'https://fx-api-testnet.gateio.ws',
    apiKey: 'f4d068e994d86f308925fd298d3c257c',
    apiSecret: '1de65301a460fcb786c56696c4b226dfabfd360afb1a485b9e7799a4b75fbb91'
  },
  bybit: {
    name: 'Bybit Demo',
    baseUrl: 'https://api-testnet.bybit.com',
    apiKey: 'bSYRwQoC6kf4IOZIAO',
    apiSecret: 'nBGtF4RgPm8ynKXe8DYVRdu9sQBb2iIAnbFQ'
  },
  binance: {
    name: 'Binance Futures Testnet',
    baseUrl: 'https://testnet.binancefuture.com',
    apiKey: '76fb2a378ee0ca45e304830483f5a775865e1c98f1832c6ab01d3417c9db52d5',
    apiSecret: '652d9989ae15cfab4325042450a2899de9e389661216a54af7180d553b81900f'
  }
};

// Gate.io API Test
async function testGateIO() {
  console.log('\n=== Testing Gate.io Testnet ===');
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'GET';
    const url = '/api/v4/spot/accounts';
    
    // Create signature for Gate.io
    const queryString = '';
    const bodyHash = crypto.createHash('sha512').update('').digest('hex');
    const signString = `${method}\n${url}\n${queryString}\n${bodyHash}\n${timestamp}`;
    const signature = crypto.createHmac('sha512', exchanges.gateio.apiSecret).update(signString).digest('hex');
    
    const options = {
      hostname: 'fx-api-testnet.gateio.ws',
      path: url,
      method: method,
      headers: {
        'KEY': exchanges.gateio.apiKey,
        'Timestamp': timestamp.toString(),
        'SIGN': signature,
        'Content-Type': 'application/json'
      }
    };
    
    const response = await makeRequest(options);
    console.log('✅ Gate.io Connection: SUCCESS');
    console.log('Response:', JSON.stringify(response, null, 2));
    return { success: true, data: response };
    
  } catch (error) {
    console.log('❌ Gate.io Connection: FAILED');
    console.log('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Bybit API Test
async function testBybit() {
  console.log('\n=== Testing Bybit Demo ===');
  
  try {
    const timestamp = Date.now();
    const recvWindow = 5000;
    
    // Create signature for Bybit
    const params = `api_key=${exchanges.bybit.apiKey}&timestamp=${timestamp}&recv_window=${recvWindow}`;
    const signature = crypto.createHmac('sha256', exchanges.bybit.apiSecret).update(params).digest('hex');
    
    const options = {
      hostname: 'api-testnet.bybit.com',
      path: `/v2/private/wallet/balance?${params}&sign=${signature}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const response = await makeRequest(options);
    console.log('✅ Bybit Connection: SUCCESS');
    console.log('Response:', JSON.stringify(response, null, 2));
    return { success: true, data: response };
    
  } catch (error) {
    console.log('❌ Bybit Connection: FAILED');
    console.log('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Binance API Test
async function testBinance() {
  console.log('\n=== Testing Binance Futures Testnet ===');
  
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    
    // Create signature for Binance
    const signature = crypto.createHmac('sha256', exchanges.binance.apiSecret).update(queryString).digest('hex');
    
    const options = {
      hostname: 'testnet.binancefuture.com',
      path: `/fapi/v2/account?${queryString}&signature=${signature}`,
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': exchanges.binance.apiKey,
        'Content-Type': 'application/json'
      }
    };
    
    const response = await makeRequest(options);
    console.log('✅ Binance Connection: SUCCESS');
    console.log('Response:', JSON.stringify(response, null, 2));
    return { success: true, data: response };
    
  } catch (error) {
    console.log('❌ Binance Connection: FAILED');
    console.log('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper function to make HTTPS requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(jsonData)}`));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Main test function
async function runAllTests() {
  console.log('🚀 Testing Exchange API Connections...\n');
  
  const results = {
    gateio: await testGateIO(),
    bybit: await testBybit(),
    binance: await testBinance()
  };
  
  console.log('\n=== SUMMARY ===');
  Object.keys(results).forEach(exchange => {
    const result = results[exchange];
    const status = result.success ? '✅ WORKING' : '❌ FAILED';
    console.log(`${exchanges[exchange].name}: ${status}`);
    if (!result.success) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  // Find working exchanges
  const workingExchanges = Object.keys(results).filter(ex => results[ex].success);
  
  if (workingExchanges.length > 0) {
    console.log(`\n🎉 Working exchanges: ${workingExchanges.map(ex => exchanges[ex].name).join(', ')}`);
  } else {
    console.log('\n😞 No exchanges are working');
  }
  
  return results;
}

// Run the tests
runAllTests().catch(console.error);