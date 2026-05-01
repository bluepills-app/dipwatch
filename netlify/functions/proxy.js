exports.handler = async function(event) {
  var cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  var p = event.queryStringParameters || {};
  var target = p.target;
  var TDK = process.env.TWELVE_DATA_KEY || p.tdk || '';
  var FHK = process.env.FINNHUB_KEY || p.fhk || '';

  if (!target) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing target' }) };
  }

  var apiUrl = '';

  if (target === 'quote') {
    apiUrl = 'https://api.twelvedata.com/quote?symbol=' + p.symbol + '&apikey=' + TDK;
  } else if (target === 'history') {
    var size = p.size || '252';
    apiUrl = 'https://api.twelvedata.com/time_series?symbol=' + p.symbol + '&interval=1day&outputsize=' + size + '&apikey=' + TDK;
  } else if (target === 'search') {
    apiUrl = 'https://api.twelvedata.com/symbol_search?symbol=' + encodeURIComponent(p.q) + '&apikey=' + TDK;
  } else if (target === 'fh_news') {
    apiUrl = 'https://finnhub.io/api/v1/company-news?symbol=' + p.symbol + '&from=' + p.from + '&to=' + p.to + '&token=' + FHK;
  } else if (target === 'fh_general') {
    apiUrl = 'https://finnhub.io/api/v1/news?category=general&minId=0&token=' + FHK;
  } else if (target === 'fh_search') {
    apiUrl = 'https://finnhub.io/api/v1/search?q=' + encodeURIComponent(p.q) + '&token=' + FHK;
  } else if (target === 'fear_greed') {
    apiUrl = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
  } else {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown target' }) };
  }

  var https = require('https');

  var result = await new Promise(function(resolve, reject) {
    var req = https.get(apiUrl, { headers: { 'User-Agent': 'DipWatch/1.0' } }, function(res) {
      var body = '';
      res.on('data', function(chunk) { body += chunk; });
      res.on('end', function() {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch(e) {
          reject(new Error('Parse error'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, function() { req.destroy(); reject(new Error('Timeout')); });
  });

  return { statusCode: result.status, headers: cors, body: JSON.stringify(result.body) };
};