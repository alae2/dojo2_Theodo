async function handler(_req: Request): Promise<Response> {
  return new Response("Hello World");
}

Deno.serve(handler);