// api/_stream.js — raspuns JSON "keep-alive" pentru rutele AI lente (Edge Runtime)
//
// De ce: o functie Edge trebuie sa trimita PRIMUL byte in max 25 s, altfel Vercel o opreste
// cu FUNCTION_INVOCATION_TIMEOUT (504). Dupa primul byte poate continua streaming pana la 300 s
// (docs Vercel "Edge Runtime → Maximum duration", 2026-08-03). Diagnosticul foto dureaza
// 14–21 s doar pe modelul principal, deci orice fallback depasea limita (incident 2026-10-27).
//
// Cum: trimitem imediat un spatiu, apoi cate un spatiu la fiecare `intervalMs` cat timp lucram,
// iar la final JSON-ul. Spatiile din fata sunt ignorate de JSON.parse / res.json().
// Consecinta: status-ul HTTP e mereu 200 odata pornit fluxul — erorile vin in corp ca { error }.
// Validarile rapide (400/405/429) se fac INAINTE de a apela streamJson, cu status real.

export function streamJson(headers, work, { intervalMs = 4000 } = {}) {
  const enc = new TextEncoder();
  let timer;
  const stream = new ReadableStream({
    async start(controller) {
      const ping = () => {
        try {
          controller.enqueue(enc.encode(" "));
        } catch {
          clearInterval(timer);
        }
      };
      ping();
      timer = setInterval(ping, intervalMs);
      let payload;
      try {
        payload = await work();
      } catch (e) {
        console.error("[stream] work failed:", e?.name, e?.message);
        payload = { error: "Eroare la procesare. Incearca din nou." };
      }
      clearInterval(timer);
      try {
        controller.enqueue(enc.encode(JSON.stringify(payload)));
        controller.close();
      } catch {
        // clientul a inchis conexiunea — nimic de facut
      }
    },
    cancel() {
      clearInterval(timer);
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
