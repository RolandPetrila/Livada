import { corsHeaders, handleOptions, checkAuth, rateLimit } from './_auth.js';

function uint8ToBase64(uint8) {
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < uint8.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, uint8.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  if (req.method !== 'POST') {
    return Response.json({ error: 'Metoda nepermisa' }, { status: 405, headers: corsHeaders(req) });
  }

  const authErr = checkAuth(req);
  if (authErr) return authErr;
  const limitErr = rateLimit(req);
  if (limitErr) return limitErr;

  const API_KEY = process.env.GOOGLE_AI_API_KEY;
  if (!API_KEY) {
    return Response.json({ error: 'GOOGLE_AI_API_KEY lipsa' }, { status: 500, headers: corsHeaders(req) });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('image');
    const species = formData.get('species') || 'necunoscut';

    if (!file) {
      return Response.json({ error: 'Nicio imagine selectata' }, { status: 400, headers: corsHeaders(req) });
    }

    // Limit 4MB (Vercel body limit is 4.5MB)
    if (file.size > 4 * 1024 * 1024) {
      return Response.json({ error: 'Imaginea depaseste 4MB' }, { status: 400, headers: corsHeaders(req) });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = uint8ToBase64(bytes);

    const prompt = `Esti expert agronom si fitopatolog specializat in pomicultura din zona Nadlac/Arad, Romania (climat continental, sol predominant cernoziom, pH 7-8).

Analizeaza aceasta fotografie a speciei: ${species}.

Raspunde STRUCTURAT in romana:

**DIAGNOSTIC:**
- Ce boli sau daunatori observi? Descrie simptomele vizibile.
- Daca nu vezi probleme, spune ca planta pare sanatoasa.

**SEVERITATE:** Usoara / Medie / Grava

**TRATAMENT RECOMANDAT:**
- Produse fitosanitare specifice cu doze (concentratie % la 10L apa)
- Alternativa BIO daca exista
- Cand sa se aplice (moment optim)

**PREVENTIE:**
- Ce masuri preventive pentru viitor

**URGENTA:** Cat de repede trebuie actionat (imediat / saptamana aceasta / la urmatorul tratament programat)

Fii concis, practic, cu informatii pe care un pomicultor le poate aplica imediat.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: file.type || 'image/jpeg',
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.3,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      throw new Error(`Gemini API: ${geminiRes.status} — ${errBody.substring(0, 200)}`);
    }

    const result = await geminiRes.json();
    const text =
      result.candidates?.[0]?.content?.parts?.[0]?.text || 'Nu am putut analiza imaginea. Incearca cu o poza mai clara.';

    return Response.json({ diagnosis: text }, { headers: corsHeaders(req) });
  } catch (err) {
    console.error('API diagnose error:', err);
    return Response.json({ error: 'Eroare la procesare. Incercati din nou.' }, { status: 500, headers: corsHeaders(req) });
  }
}
