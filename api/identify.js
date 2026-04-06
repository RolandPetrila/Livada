import { corsHeaders, handleOptions, checkOrigin, rateLimit } from './_auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  if (req.method !== 'POST') {
    return Response.json({ error: 'Metoda nepermisa' }, { status: 405, headers: corsHeaders(req) });
  }

  const limitErr = rateLimit(req);
  if (limitErr) return limitErr;

  const PLANTNET_KEY = process.env.PLANTNET_API_KEY;
  if (!PLANTNET_KEY) {
    return Response.json({ error: 'PLANTNET_API_KEY lipsa' }, { status: 500, headers: corsHeaders(req) });
  }

  let base64, mimeType, organ;
  try {
    const body = await req.json();
    base64   = body.base64;
    mimeType = body.mimeType || 'image/jpeg';
    organ    = body.organ || 'auto';
    if (!base64 || typeof base64 !== 'string') {
      return Response.json({ error: 'Lipseste imaginea (base64).' }, { status: 400, headers: corsHeaders(req) });
    }
    if (base64.length > 5 * 1024 * 1024) {
      return Response.json({ error: 'Imaginea prea mare. Max ~3MB.' }, { status: 400, headers: corsHeaders(req) });
    }
  } catch (e) {
    return Response.json({ error: 'Eroare citire date.' }, { status: 400, headers: corsHeaders(req) });
  }

  // Converteste base64 → Blob → FormData (Pl@ntNet accepta multipart)
  let formData;
  try {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    formData = new FormData();
    formData.append('images', blob, 'plant.jpg');
    formData.append('organs', organ);
  } catch (e) {
    console.error('[identify] blob err:', e.message);
    return Response.json({ error: 'Eroare procesare imagine.' }, { status: 400, headers: corsHeaders(req) });
  }

  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 15000);

  try {
    const res = await fetch(
      `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_KEY}&lang=ro&nb-results=5&include-related-images=false`,
      { method: 'POST', body: formData, signal: ctrl.signal }
    );
    clearTimeout(tid);
    console.log(`[identify] plantnet → ${res.status}`);

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error('[identify] plantnet err:', res.status, err.substring(0, 200));
      return Response.json({ error: `Identificare indisponibila (${res.status}).` }, { status: 503, headers: corsHeaders(req) });
    }

    const data = await res.json();
    const results = (data.results || []).slice(0, 3).map(r => ({
      scientificName: r.species?.scientificNameWithoutAuthor || '',
      commonNames:    (r.species?.commonNames || []).slice(0, 2),
      family:         r.species?.family?.scientificNameWithoutAuthor || '',
      score:          Math.round((r.score || 0) * 100),
    }));

    if (!results.length) {
      return Response.json({ error: 'Planta nu a putut fi identificata. Incearca o poza mai clara.' }, { status: 200, headers: corsHeaders(req) });
    }

    return Response.json({ results }, { headers: corsHeaders(req) });

  } catch (e) {
    clearTimeout(tid);
    console.error('[identify] fetch err:', e.name, e.message);
    if (e.name === 'AbortError') {
      return Response.json({ error: 'Identificarea a durat prea mult. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
    }
    return Response.json({ error: 'Eroare conexiune. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
  }
}
