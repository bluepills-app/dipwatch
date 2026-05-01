// DipWatch Proxy — Netlify serverless function
// CommonJS format — works on ALL Netlify runtime versions
// File location in repo: netlify/functions/proxy.js

exports.handler = async function(event) {
const cors = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Methods’: ‘GET, OPTIONS’,
‘Content-Type’: ‘application/json’,
‘Cache-Control’: ‘no-cache’,
};

if (event.httpMethod === ‘OPTIONS’) {
return { statusCode: 204, headers: cors, body: ‘’ };
}

const params = event.queryStringParameters || {};
const target = params.target;

// Keys: Netlify env vars take priority (secure, server-side).
// Falls back to browser-passed params for local/direct testing only.
const TDK = process.env.TWELVE_DATA_KEY || params.tdk || ‘’;
const FHK = process.env.FINNHUB_KEY     || params.fhk || ‘’;

if (!target) {
return { statusCode: 400, headers: cors, body: JSON.stringify({ error: ‘Missing target’ }) };
}

let apiUrl = ‘’;

if (target === ‘quote’) {
apiUrl = `https://api.twelvedata.com/quote?symbol=${params.symbol}&apikey=${TDK}`;

} else if (target === ‘history’) {
const size = params.size || ‘252’;
apiUrl = `https://api.twelvedata.com/time_series?symbol=${params.symbol}&interval=1day&outputsize=${size}&apikey=${TDK}`;

} else if (target === ‘search’) {
apiUrl = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(params.q)}&apikey=${TDK}`;

} else if (target === ‘fh_news’) {
apiUrl = `https://finnhub.io/api/v1/company-news?symbol=${params.symbol}&from=${params.from}&to=${params.to}&token=${FHK}`;

} else if (target === ‘fh_general’) {
apiUrl = `https://finnhub.io/api/v1/news?category=general&minId=0&token=${FHK}`;

} else if (target === ‘fh_search’) {
apiUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(params.q)}&token=${FHK}`;

} else if (target === ‘fear_greed’) {
apiUrl = ‘https://production.dataviz.cnn.io/index/fearandgreed/graphdata’;

} else {
return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `Unknown target: ${target}` }) };
}

try {
const https = require(‘https’);
const result = await new Promise((resolve, reject) => {
const req = https.get(apiUrl, { headers: { ‘User-Agent’: ‘DipWatch/1.0’ } }, (res) => {
let body = ‘’;
res.on(‘data’, chunk => body += chunk);
res.on(‘end’, () => {
try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
catch(e) { reject(new Error(’JSON parse error: ’ + e.message)); }
});
});
req.on(‘error’, reject);
req.setTimeout(10000, () => { req.destroy(); reject(new Error(‘Request timed out’)); });
});
return { statusCode: result.status, headers: cors, body: JSON.stringify(result.body) };
} catch (err) {
return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
}
};