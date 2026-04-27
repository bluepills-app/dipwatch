// DipWatch Proxy — runs on Netlify's servers, no CORS restriction
// Your browser calls /.netlify/functions/proxy?target=ENDPOINT&PARAMS
// This function calls the real API server-to-server and returns the result

export default async (request) => {
  const url = new URL(request.url);
  const target = url.searchParams.get('target');

  // CORS headers — allow your Netlify site to call this function
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing target parameter' }), { status: 400, headers });
  }

  const TDK = process.env.TWELVE_DATA_KEY;
  const FHK = process.env.FINNHUB_KEY;

  let apiUrl = '';

  // ── TWELVE DATA ENDPOINTS ─────────────────────────────────
  if (target === 'quote') {
    const symbol = url.searchParams.get('symbol');
    apiUrl = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TDK}`;

  } else if (target === 'history') {
    const symbol   = url.searchParams.get('symbol');
    const size     = url.searchParams.get('size') || '210';
    apiUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=${size}&apikey=${TDK}`;

  } else if (target === 'ma') {
    const symbol = url.searchParams.get('symbol');
    const period = url.searchParams.get('period') || '200';
    apiUrl = `https://api.twelvedata.com/ma?symbol=${symbol}&interval=1day&time_period=${period}&series_type=close&outputsize=1&apikey=${TDK}`;

  } else if (target === 'rsi') {
    const symbol = url.searchParams.get('symbol');
    apiUrl = `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=1day&time_period=14&series_type=close&outputsize=1&apikey=${TDK}`;

  } else if (target === 'search') {
    const q = url.searchParams.get('q');
    apiUrl = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(q)}&apikey=${TDK}`;

  // ── FINNHUB ENDPOINTS ─────────────────────────────────────
  } else if (target === 'fh_news') {
    const symbol = url.searchParams.get('symbol');
    const from   = url.searchParams.get('from');
    const to     = url.searchParams.get('to');
    apiUrl = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FHK}`;

  } else if (target === 'fh_general') {
    apiUrl = `https://finnhub.io/api/v1/news?category=general&token=${FHK}`;

  } else if (target === 'fh_search') {
    const q = url.searchParams.get('q');
    apiUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FHK}`;

  // ── FEAR & GREED INDEX ────────────────────────────────────
  } else if (target === 'fear_greed') {
    apiUrl = `https://fear-and-greed-index.p.rapidapi.com/v1/fgi`;
    // Fear & Greed doesn't need our keys — returns public macro sentiment
    // We'll add RapidAPI key support if needed later
    // For now use the CNN public endpoint
    apiUrl = `https://production.dataviz.cnn.io/index/fearandgreed/graphdata`;

  } else {
    return new Response(JSON.stringify({ error: `Unknown target: ${target}` }), { status: 400, headers });
  }

  try {
    const resp = await fetch(apiUrl);
    const data = await resp.json();
    return new Response(JSON.stringify(data), { status: resp.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/*' };
