// Vercel serverless function: fetches OpenStreetMap data (Overpass / Nominatim) on the server,
// so browsers that block those hosts still get results. Identifies itself as the OSM usage policies ask.
const UA = 'Hoofprint/1.0 (+https://www.my-hoofprints.com; riding route site)';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function first(urls, init) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try {
    return await Promise.any(urls.map(async u => {
      const r = await fetch(u, { ...init, signal: ctl.signal });
      if (!r.ok) throw new Error(new URL(u).host + ' HTTP ' + r.status);
      return await r.text();
    }));
  } finally { clearTimeout(t); ctl.abort(); }
}

module.exports = async (req, res) => {
  const q = req.query || {};
  try {
    let body;
    if (q.service === 'overpass') {
      const data = String(q.data || '');
      if (!data.startsWith('[out:json]') || data.length > 4000) return res.status(400).json({ error: 'bad query' });
      body = await first(OVERPASS.map(u => u + '?data=' + encodeURIComponent(data)), { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    } else if (q.service === 'nominatim') {
      const p = new URLSearchParams();
      for (const k of ['q', 'amenity', 'format', 'limit', 'bounded', 'viewbox', 'extratags', 'accept-language']) if (q[k] != null) p.set(k, String(q[k]));
      body = await first(['https://nominatim.openstreetmap.org/search?' + p], { headers: { 'User-Agent': UA, Referer: 'https://www.my-hoofprints.com/' } });
    } else return res.status(400).json({ error: 'unknown service' });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(body);
  } catch (e) {
    const msg = (e.errors || [e]).map(x => x.message || String(x)).join('; ');
    return res.status(502).json({ error: msg });
  }
};
