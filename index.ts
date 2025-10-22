function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin",
  };
}

function handlePreFlightRequest(): Response {
  return new Response("Preflight OK!", {
    status: 200,
    headers: corsHeaders(),
  });
}

async function handler(_req: Request): Promise<Response> {
  if (_req.method === "OPTIONS") {
    return handlePreFlightRequest();
  }

  // 1) Extract user input from URL (?value=... or ?word=...)
  const url = new URL(_req.url);
  let userWord =
    url.searchParams.get("value") ??
    url.searchParams.get("word") ??
    undefined;

  // 2) Fallback: allow POST body { value: "..."} or { word: "..." }
  if (!userWord && (_req.method === "POST" || _req.method === "PUT")) {
    try {
      const body = await _req.json();
      userWord = body?.value ?? body?.word ?? undefined;
    } catch {
      // ignore JSON parse errors; we'll handle missing input below
    }
  }

  if (!userWord || typeof userWord !== "string" || !userWord.trim()) {
    return new Response(
      JSON.stringify({ error: "Missing user input. Provide ?value=... or JSON { value: \"...\" }." }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  userWord = userWord.trim();

  // 3) Build request to comparison API using the user input
  const similarityRequestBody = JSON.stringify({
    word1: "centrale",   // reference word — change to your target if needed
    word2: userWord,     // user's input from URL/body
  });

  try {
    const response = await fetch("https://word2vec.nicolasfley.fr/similarity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: similarityRequestBody,
      redirect: "follow",
    });

    if (!response.ok) {
      const msg = `Upstream error: ${response.status} ${response.statusText}`;
      console.error(msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Fetch error:", error);
    return new Response(
      JSON.stringify({ error: "Fetch failed", details: String(error?.message ?? error) }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
}

Deno.serve(handler);
