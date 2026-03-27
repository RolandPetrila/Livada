import { put, list, del } from '@vercel/blob';

export const config = { runtime: 'edge' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET — list photos (optionally filtered by species)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const species = url.searchParams.get('species');
      const prefix = species ? `livada/photos/${species}/` : 'livada/photos/';

      const result = await list({ prefix });
      const photos = result.blobs.map(b => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      }));

      return Response.json(photos, { headers: corsHeaders });
    }

    // POST — upload a photo
    if (req.method === 'POST') {
      const formData = await req.formData();
      const file = formData.get('file');
      const species = formData.get('species') || 'general';
      const note = formData.get('note') || '';

      if (!file) {
        return Response.json({ error: 'Niciun fisier selectat' }, { status: 400, headers: corsHeaders });
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!validTypes.includes(file.type)) {
        return Response.json(
          { error: 'Format invalid. Acceptat: JPG, PNG, WebP, HEIC' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Limit 5MB
      if (file.size > 5 * 1024 * 1024) {
        return Response.json(
          { error: 'Fisierul depaseste 5MB' },
          { status: 400, headers: corsHeaders }
        );
      }

      const timestamp = Date.now();
      const ext = file.name?.split('.').pop() || 'jpg';
      const pathname = `livada/photos/${species}/${timestamp}.${ext}`;

      const blob = await put(pathname, file, {
        access: 'public',
        contentType: file.type,
      });

      return Response.json(
        { url: blob.url, pathname: blob.pathname, uploadedAt: new Date().toISOString() },
        { headers: corsHeaders }
      );
    }

    // DELETE — remove a photo
    if (req.method === 'DELETE') {
      const { url } = await req.json();
      if (!url) {
        return Response.json({ error: 'URL lipsa' }, { status: 400, headers: corsHeaders });
      }
      await del(url);
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Metoda nepermisa' }, { status: 405, headers: corsHeaders });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes('BLOB_READ_WRITE_TOKEN') || msg.includes('Missing')) {
      return Response.json(
        { error: 'Vercel Blob nu este configurat. Provisoneaza un Blob store din Vercel Dashboard → Storage.' },
        { status: 503, headers: corsHeaders }
      );
    }
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}
