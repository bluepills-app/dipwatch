// DipWatch Proxy — Netlify serverless function
// File must be at: netlify/functions/proxy.mjs
// The .mjs extension guarantees ES module treatment on all Netlify plans

export default async (request) => {
const cors = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Methods’: ‘GET, OPTIONS’,
‘Content-Type’: ‘application/json’,
‘Cache-Control’: ‘no-cache’,
};

if (request.method === ‘OPTIONS’) {
return new Response(null, { status: 204, headers: cors });
}

const url    = new URL(request.url);
const target = url.searchParams.get(‘target’);

// Keys: Netlify env vars take priority (secure, server-side).
// Falls back to browser-passed params for local testing only.
const TDK = process.env.TWELVE_DATA_KEY || url.searchParams.get(‘tdk’) || ‘’;
const FHK = process.env.FINNHUB_KEY     || url.searchParams.get(‘fhk’) || ‘’;

if (!target) {
return new Response(JSON.stringify({ error: ‘Missing target’ }), { status: 400, headers: cors });
}

let apiUrl = ‘’;

if (target === ‘quote’) {
const sym = url.searchParams.get(‘symbol’);
apiUrl = `https://api.twelvedata.com/quote?symbol=${sym}&apikey=${TDK}`;

} else if (target === ‘history’) {
const sym  = url.searchParams.get(‘symbol’);
const size = url.searchParams.get(‘size’) || ‘252’;
apiUrl = `https://api.twelvedata.com/time_series?symbol=${sym}&interval=1day&outputsize=${size}&apikey=${TDK}`;

} else if (target === ‘search’) {
const q = url.searchParams.get(‘q’);
apiUrl = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(q)}&apikey=${TDK}`;

} else if (target === ‘fh_news’) {
const sym  = url.searchParams.get(‘symbol’);
const from = url.searchParams.get(‘from’);
const to   = url.searchParams.get(‘to’);
apiUrl = `https://finnhub.io/api/v1/company-news?symbol=${sym}&from=${from}&to=${to}&token=${FHK}`;

} else if (target === ‘fh_general’) {
apiUrl = `https://finnhub.io/api/v1/news?category=general&minId=0&token=${FHK}`;

} else if (target === ‘fh_search’) {
const q = url.searchParams.get(‘q’);
apiUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FHK}`;

} else if (target === ‘fear_greed’) {
apiUrl = ‘https://production.dataviz.cnn.io/index/fearandgreed/graphdata’;

} else {
return new Response(JSON.stringify({ error: `Unknown target: ${target}` }), { status: 400, headers: cors });
}

try {
const resp = await fetch(apiUrl, {
headers: { ‘User-Agent’: ‘DipWatch/1.0’ }
});
const data = await resp.json();
return new Response(JSON.stringify(data), { status: resp.status, headers: cors });
} catch (err) {
return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
}
};

// Tells Netlify this function handles the /api/* path
export const config = { path: ‘/api/*’ };