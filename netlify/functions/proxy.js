// DipWatch Proxy — Netlify serverless function
// All external API calls run here (server-side = no CORS)
// Browser calls /api/proxy?target=X&params → this fetches real API → returns data

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
// Keys: prefer Netlify env vars (server-side, secure).
// Falls back to browser-passed params for local/direct-file testing only.
const TDK    = process.env.TWELVE_DATA_KEY || url.searchParams.get(‘tdk’) || ‘’;
const FHK    = process.env.FINNHUB_KEY     || url.searchParams.get(‘fhk’) || ‘’;

if (!target) {
return new Response(JSON.stringify({ error: ‘Missing target’ }), { status: 400, headers: cors });
}

let apiUrl = ‘’;

// ── TWELVE DATA ──────────────────────────────────────────
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

// ── FINNHUB ───────────────────────────────────────────────
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

// ── FEAR & GREED (CNN public data endpoint) ───────────────
} else if (target === ‘fear_greed’) {
// CNN’s current public endpoint
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

export const config = { path: ‘/api/*’ };